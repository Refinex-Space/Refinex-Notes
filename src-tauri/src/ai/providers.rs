use reqwest::Client;
use serde_json::{json, Value};
use tokio::sync::watch;

use crate::ai::{
    stream_sse_response, AIAttachment, AIMessage, AIProvider, AIProviderConfig,
    AIProviderFuture, StreamControl, StreamOutcome, SseEvent, TokenEmitter,
};

const USER_AGENT: &str = "Refinex-Notes";
const ANTHROPIC_VERSION: &str = "2023-06-01";
const DEFAULT_ANTHROPIC_MAX_TOKENS: u32 = 4096;
const DEFAULT_TEST_MAX_TOKENS: u32 = 1;

#[derive(Clone)]
pub struct OpenAICompatibleProvider {
    client: Client,
    config: AIProviderConfig,
    api_key: String,
    cancel_rx: watch::Receiver<bool>,
}

impl OpenAICompatibleProvider {
    pub fn new(
        config: AIProviderConfig,
        api_key: String,
        cancel_rx: watch::Receiver<bool>,
    ) -> Result<Self, String> {
        Ok(Self {
            client: Client::builder()
                .user_agent(USER_AGENT)
                .build()
                .map_err(|error| format!("创建 OpenAI-compatible HTTP 客户端失败: {error}"))?,
            config,
            api_key,
            cancel_rx,
        })
    }

    fn endpoint_url(&self) -> String {
        format!("{}/chat/completions", self.config.resolved_base_url().trim_end_matches('/'))
    }

    fn request_body(&self, messages: &[AIMessage], model: &str) -> Value {
        json!({
            "model": model,
            "messages": messages
                .iter()
                .map(build_openai_compatible_message)
                .collect::<Vec<_>>(),
            "stream": true,
        })
    }

    fn test_request_body(&self, model: &str) -> Value {
        json!({
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": "ping"
                }
            ],
            "stream": false,
            "max_tokens": DEFAULT_TEST_MAX_TOKENS,
        })
    }

    pub async fn test_connection(&self, model: &str) -> Result<(), String> {
        let response = self
            .client
            .post(self.endpoint_url())
            .bearer_auth(&self.api_key)
            .json(&self.test_request_body(model))
            .send()
            .await
            .map_err(|error| format!("请求 `{}` 失败: {error}", self.config.name))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("`{}` 响应失败（{status}）: {body}", self.config.name));
        }

        Ok(())
    }
}

impl AIProvider for OpenAICompatibleProvider {
    fn chat_stream<'a>(
        &'a self,
        messages: Vec<AIMessage>,
        model: String,
        on_token: TokenEmitter,
    ) -> AIProviderFuture<'a> {
        Box::pin(async move {
            let response = self
                .client
                .post(self.endpoint_url())
                .bearer_auth(&self.api_key)
                .json(&self.request_body(&messages, &model))
                .send()
                .await
                .map_err(|error| format!("请求 `{}` 失败: {error}", self.config.name))?;

            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                return Err(format!("`{}` 响应失败（{status}）: {body}", self.config.name));
            }

            let mut cancel_rx = self.cancel_rx.clone();
            let outcome = stream_sse_response(response, &mut cancel_rx, |event| {
                match extract_openai_compatible_delta(&event)? {
                    Some(token) => {
                        on_token(token)?;
                        Ok(StreamControl::Continue)
                    }
                    None => Ok(StreamControl::Continue),
                }
            })
            .await?;

            match outcome {
                StreamOutcome::Completed | StreamOutcome::Cancelled => Ok(()),
            }
        })
    }
}

#[derive(Clone)]
pub struct AnthropicProvider {
    client: Client,
    config: AIProviderConfig,
    api_key: String,
    cancel_rx: watch::Receiver<bool>,
}

impl AnthropicProvider {
    pub fn new(
        config: AIProviderConfig,
        api_key: String,
        cancel_rx: watch::Receiver<bool>,
    ) -> Result<Self, String> {
        Ok(Self {
            client: Client::builder()
                .user_agent(USER_AGENT)
                .build()
                .map_err(|error| format!("创建 Anthropic HTTP 客户端失败: {error}"))?,
            config,
            api_key,
            cancel_rx,
        })
    }

    fn endpoint_url(&self) -> String {
        format!("{}/v1/messages", self.config.resolved_base_url().trim_end_matches('/'))
    }

    fn request_body(&self, messages: &[AIMessage], model: &str) -> Value {
        let (system, conversation) = split_anthropic_messages(messages);
        let mut body = json!({
            "model": model,
            "messages": conversation,
            "stream": true,
            "max_tokens": DEFAULT_ANTHROPIC_MAX_TOKENS,
        });

        if let Some(system_prompt) = system {
            body["system"] = json!(system_prompt);
        }

        body
    }

    fn test_request_body(&self, model: &str) -> Value {
        json!({
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": "ping"
                }
            ],
            "stream": false,
            "max_tokens": DEFAULT_TEST_MAX_TOKENS,
        })
    }

    pub async fn test_connection(&self, model: &str) -> Result<(), String> {
        let response = self
            .client
            .post(self.endpoint_url())
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .json(&self.test_request_body(model))
            .send()
            .await
            .map_err(|error| format!("请求 `{}` 失败: {error}", self.config.name))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("`{}` 响应失败（{status}）: {body}", self.config.name));
        }

        Ok(())
    }
}

impl AIProvider for AnthropicProvider {
    fn chat_stream<'a>(
        &'a self,
        messages: Vec<AIMessage>,
        model: String,
        on_token: TokenEmitter,
    ) -> AIProviderFuture<'a> {
        Box::pin(async move {
            let response = self
                .client
                .post(self.endpoint_url())
                .header("x-api-key", &self.api_key)
                .header("anthropic-version", ANTHROPIC_VERSION)
                .json(&self.request_body(&messages, &model))
                .send()
                .await
                .map_err(|error| format!("请求 `{}` 失败: {error}", self.config.name))?;

            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                return Err(format!("`{}` 响应失败（{status}）: {body}", self.config.name));
            }

            let mut cancel_rx = self.cancel_rx.clone();
            let outcome = stream_sse_response(response, &mut cancel_rx, |event| {
                match extract_anthropic_delta(&event)? {
                    AnthropicEvent::Token(token) => {
                        on_token(token)?;
                        Ok(StreamControl::Continue)
                    }
                    AnthropicEvent::Continue => Ok(StreamControl::Continue),
                    AnthropicEvent::Stop => Ok(StreamControl::Stop),
                }
            })
            .await?;

            match outcome {
                StreamOutcome::Completed | StreamOutcome::Cancelled => Ok(()),
            }
        })
    }
}

enum AnthropicEvent {
    Token(String),
    Continue,
    Stop,
}

fn split_anthropic_messages(messages: &[AIMessage]) -> (Option<String>, Vec<Value>) {
    let mut system_parts = Vec::new();
    let mut conversation = Vec::new();

    for message in messages {
        if message.role == "system" {
            let trimmed = message.content.trim();
            if !trimmed.is_empty() {
                system_parts.push(trimmed.to_string());
            }
            continue;
        }

        conversation.push(json!({
            "role": message.role,
            "content": build_anthropic_content(message),
        }));
    }

    let system = if system_parts.is_empty() {
        None
    } else {
        Some(system_parts.join("\n\n"))
    };

    (system, conversation)
}

fn build_openai_compatible_message(message: &AIMessage) -> Value {
    let content_parts = build_openai_compatible_content(message);
    let has_non_text_attachments = message
        .attachments
        .iter()
        .any(|attachment| matches!(attachment, AIAttachment::Image { .. }));

    let content = if !has_non_text_attachments
        && content_parts.len() == 1
        && content_parts[0]["type"] == "text"
    {
        Value::String(
            content_parts[0]["text"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
        )
    } else {
        Value::Array(content_parts)
    };

    json!({
        "role": message.role,
        "content": content,
    })
}

fn build_openai_compatible_content(message: &AIMessage) -> Vec<Value> {
    let mut content_parts = Vec::new();

    if !message.content.trim().is_empty() {
        content_parts.push(json!({
            "type": "text",
            "text": message.content,
        }));
    }

    for attachment in &message.attachments {
        match attachment {
            AIAttachment::Image {
                mime_type,
                base64_data,
                ..
            } => content_parts.push(json!({
                "type": "image_url",
                "image_url": {
                    "url": format!("data:{mime_type};base64,{base64_data}")
                }
            })),
            AIAttachment::Text {
                name,
                text_content,
                ..
            } => content_parts.push(json!({
                "type": "text",
                "text": format!("附件 `{name}` 内容：\n{text_content}")
            })),
        }
    }

    if content_parts.is_empty() {
        content_parts.push(json!({
            "type": "text",
            "text": "",
        }));
    }

    content_parts
}

fn build_anthropic_content(message: &AIMessage) -> Vec<Value> {
    let mut content_blocks = Vec::new();

    if !message.content.trim().is_empty() {
        content_blocks.push(json!({
            "type": "text",
            "text": message.content,
        }));
    }

    for attachment in &message.attachments {
        match attachment {
            AIAttachment::Image {
                mime_type,
                base64_data,
                ..
            } => content_blocks.push(json!({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": mime_type,
                    "data": base64_data,
                }
            })),
            AIAttachment::Text {
                name,
                text_content,
                ..
            } => content_blocks.push(json!({
                "type": "text",
                "text": format!("附件 `{name}` 内容：\n{text_content}")
            })),
        }
    }

    if content_blocks.is_empty() {
        content_blocks.push(json!({
            "type": "text",
            "text": "",
        }));
    }

    content_blocks
}

fn extract_openai_compatible_delta(event: &SseEvent) -> Result<Option<String>, String> {
    let payload: Value = serde_json::from_str(&event.data)
        .map_err(|error| format!("解析 OpenAI-compatible SSE 事件失败: {error}"))?;

    if let Some(error_message) = payload
        .get("error")
        .and_then(|error| error.get("message"))
        .and_then(Value::as_str)
    {
        return Err(format!("OpenAI-compatible Provider 返回错误: {error_message}"));
    }

    let choice = payload
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|choices| choices.first());

    let delta = match choice.and_then(|choice| choice.get("delta")) {
        Some(delta) => delta,
        None => return Ok(None),
    };

    if let Some(content) = delta.get("content").and_then(Value::as_str) {
        return Ok(Some(content.to_string()));
    }

    if let Some(parts) = delta.get("content").and_then(Value::as_array) {
        let token = parts
            .iter()
            .filter_map(|part| {
                part.get("text")
                    .and_then(Value::as_str)
                    .or_else(|| part.get("content").and_then(Value::as_str))
            })
            .collect::<String>();

        if !token.is_empty() {
            return Ok(Some(token));
        }
    }

    Ok(None)
}

fn extract_anthropic_delta(event: &SseEvent) -> Result<AnthropicEvent, String> {
    let payload: Value = serde_json::from_str(&event.data)
        .map_err(|error| format!("解析 Anthropic SSE 事件失败: {error}"))?;

    if payload.get("type").and_then(Value::as_str) == Some("error") {
        let message = payload
            .get("error")
            .and_then(|error| error.get("message"))
            .and_then(Value::as_str)
            .unwrap_or("未知错误");
        return Err(format!("Anthropic Provider 返回错误: {message}"));
    }

    let event_type = event
        .event
        .as_deref()
        .or_else(|| payload.get("type").and_then(Value::as_str));

    match event_type {
        Some("content_block_delta") => {
            if let Some(text) = payload
                .pointer("/delta/text")
                .and_then(Value::as_str)
                .filter(|value| !value.is_empty())
            {
                return Ok(AnthropicEvent::Token(text.to_string()));
            }
            Ok(AnthropicEvent::Continue)
        }
        Some("content_block_start") => {
            if let Some(text) = payload
                .pointer("/content_block/text")
                .and_then(Value::as_str)
                .filter(|value| !value.is_empty())
            {
                return Ok(AnthropicEvent::Token(text.to_string()));
            }
            Ok(AnthropicEvent::Continue)
        }
        Some("message_stop") => Ok(AnthropicEvent::Stop),
        _ => Ok(AnthropicEvent::Continue),
    }
}

#[cfg(test)]
mod tests {
    use tokio::sync::watch;

    use crate::ai::{AIAttachment, AIMessage, AIProviderConfig, AIProviderKind, SseEvent};

    use super::{
        extract_anthropic_delta, extract_openai_compatible_delta, AnthropicEvent,
        AnthropicProvider, OpenAICompatibleProvider,
    };

    fn openai_config() -> AIProviderConfig {
        AIProviderConfig {
            id: "deepseek".to_string(),
            name: "DeepSeek".to_string(),
            provider_kind: AIProviderKind::DeepSeek,
            enabled: true,
            base_url: None,
        }
    }

    fn anthropic_config() -> AIProviderConfig {
        AIProviderConfig {
            id: "anthropic".to_string(),
            name: "Anthropic".to_string(),
            provider_kind: AIProviderKind::Anthropic,
            enabled: true,
            base_url: None,
        }
    }

    #[test]
    fn openai_provider_builds_streaming_request_body() {
        let (_, cancel_rx) = watch::channel(false);
        let provider =
            OpenAICompatibleProvider::new(openai_config(), "sk-test".to_string(), cancel_rx)
                .expect("provider");
        let body = provider.request_body(
            &[
                AIMessage {
                    role: "system".to_string(),
                    content: "你是助手".to_string(),
                    attachments: Vec::new(),
                },
                AIMessage {
                    role: "user".to_string(),
                    content: "你好".to_string(),
                    attachments: Vec::new(),
                },
            ],
            "deepseek-chat",
        );

        assert_eq!(provider.endpoint_url(), "https://api.deepseek.com/v1/chat/completions");
        assert_eq!(body["model"], "deepseek-chat");
        assert_eq!(body["stream"], true);
        assert_eq!(body["messages"][0]["role"], "system");
        assert_eq!(body["messages"][1]["content"], "你好");
    }

    #[test]
    fn openai_provider_builds_test_request_body() {
        let (_, cancel_rx) = watch::channel(false);
        let provider =
            OpenAICompatibleProvider::new(openai_config(), "sk-test".to_string(), cancel_rx)
                .expect("provider");
        let body = provider.test_request_body("deepseek-chat");

        assert_eq!(body["stream"], false);
        assert_eq!(body["max_tokens"], 1);
        assert_eq!(body["messages"][0]["content"], "ping");
    }

    #[test]
    fn openai_delta_extractor_supports_string_and_array_content() {
        let plain = extract_openai_compatible_delta(&SseEvent {
            event: None,
            data: r#"{"choices":[{"delta":{"content":"Hello"}}]}"#.to_string(),
        })
        .expect("plain token");
        let rich = extract_openai_compatible_delta(&SseEvent {
            event: None,
            data: r#"{"choices":[{"delta":{"content":[{"type":"output_text","text":"Hi"},{"type":"output_text","text":"!"}]}}]}"#.to_string(),
        })
        .expect("rich token");

        assert_eq!(plain.as_deref(), Some("Hello"));
        assert_eq!(rich.as_deref(), Some("Hi!"));
    }

    #[test]
    fn openai_provider_serializes_image_and_text_attachments() {
        let (_, cancel_rx) = watch::channel(false);
        let provider =
            OpenAICompatibleProvider::new(openai_config(), "sk-test".to_string(), cancel_rx)
                .expect("provider");
        let body = provider.request_body(
            &[AIMessage {
                role: "user".to_string(),
                content: "请分析附件".to_string(),
                attachments: vec![
                    AIAttachment::Image {
                        id: "img-1".to_string(),
                        name: "diagram.png".to_string(),
                        mime_type: "image/png".to_string(),
                        base64_data: "ZmFrZQ==".to_string(),
                        size: 12,
                    },
                    AIAttachment::Text {
                        id: "txt-1".to_string(),
                        name: "notes.md".to_string(),
                        mime_type: "text/markdown".to_string(),
                        text_content: "# Notes".to_string(),
                        size: 8,
                    },
                ],
            }],
            "gpt-4o",
        );

        assert_eq!(body["messages"][0]["content"][0]["type"], "text");
        assert_eq!(body["messages"][0]["content"][1]["type"], "image_url");
        assert_eq!(
            body["messages"][0]["content"][1]["image_url"]["url"],
            "data:image/png;base64,ZmFrZQ=="
        );
        assert_eq!(body["messages"][0]["content"][2]["type"], "text");
    }

    #[test]
    fn anthropic_provider_moves_system_messages_to_top_level() {
        let (_, cancel_rx) = watch::channel(false);
        let provider =
            AnthropicProvider::new(anthropic_config(), "sk-ant".to_string(), cancel_rx)
                .expect("provider");
        let body = provider.request_body(
            &[
                AIMessage {
                    role: "system".to_string(),
                    content: "请使用中文".to_string(),
                    attachments: Vec::new(),
                },
                AIMessage {
                    role: "user".to_string(),
                    content: "介绍 SSE".to_string(),
                    attachments: Vec::new(),
                },
            ],
            "claude-sonnet-4-5",
        );

        assert_eq!(provider.endpoint_url(), "https://api.anthropic.com/v1/messages");
        assert_eq!(body["system"], "请使用中文");
        assert_eq!(body["stream"], true);
        assert_eq!(body["max_tokens"], 4096);
        assert_eq!(body["messages"][0]["role"], "user");
    }

    #[test]
    fn anthropic_provider_serializes_image_and_text_attachments() {
        let (_, cancel_rx) = watch::channel(false);
        let provider =
            AnthropicProvider::new(anthropic_config(), "sk-ant".to_string(), cancel_rx)
                .expect("provider");
        let body = provider.request_body(
            &[AIMessage {
                role: "user".to_string(),
                content: "请分析附件".to_string(),
                attachments: vec![
                    AIAttachment::Image {
                        id: "img-1".to_string(),
                        name: "diagram.png".to_string(),
                        mime_type: "image/png".to_string(),
                        base64_data: "ZmFrZQ==".to_string(),
                        size: 12,
                    },
                    AIAttachment::Text {
                        id: "txt-1".to_string(),
                        name: "notes.md".to_string(),
                        mime_type: "text/markdown".to_string(),
                        text_content: "# Notes".to_string(),
                        size: 8,
                    },
                ],
            }],
            "claude-sonnet-4-5",
        );

        assert_eq!(body["messages"][0]["content"][0]["type"], "text");
        assert_eq!(body["messages"][0]["content"][1]["type"], "image");
        assert_eq!(
            body["messages"][0]["content"][1]["source"]["media_type"],
            "image/png"
        );
        assert_eq!(body["messages"][0]["content"][2]["type"], "text");
    }

    #[test]
    fn anthropic_provider_builds_test_request_body() {
        let (_, cancel_rx) = watch::channel(false);
        let provider =
            AnthropicProvider::new(anthropic_config(), "sk-ant".to_string(), cancel_rx)
                .expect("provider");
        let body = provider.test_request_body("claude-sonnet-4-20250514");

        assert_eq!(body["stream"], false);
        assert_eq!(body["max_tokens"], 1);
        assert_eq!(body["messages"][0]["content"], "ping");
    }

    #[test]
    fn anthropic_delta_extractor_handles_text_and_stop_events() {
        let token = extract_anthropic_delta(&SseEvent {
            event: Some("content_block_delta".to_string()),
            data: r#"{"type":"content_block_delta","delta":{"type":"text_delta","text":"你好"}}"#
                .to_string(),
        })
        .expect("token");
        let stop = extract_anthropic_delta(&SseEvent {
            event: Some("message_stop".to_string()),
            data: r#"{"type":"message_stop"}"#.to_string(),
        })
        .expect("stop");

        match token {
            AnthropicEvent::Token(value) => assert_eq!(value, "你好"),
            _ => panic!("expected token event"),
        }
        assert!(matches!(stop, AnthropicEvent::Stop));
    }
}

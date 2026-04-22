use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use keyring::{Entry, Error as KeyringError};
use serde::{Deserialize, Serialize};

pub mod providers;
pub mod streaming;

pub const AI_PROVIDERS_SETTINGS_KEY: &str = "ai_providers";
pub const DEFAULT_DEEPSEEK_BASE_URL: &str = "https://api.deepseek.com/v1";
pub const DEFAULT_QWEN_BASE_URL: &str = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
pub const DEFAULT_GLM_BASE_URL: &str = "https://open.bigmodel.cn/api/paas/v4";
pub const DEFAULT_KIMI_BASE_URL: &str = "https://api.moonshot.cn/v1";
pub const DEFAULT_MINIMAX_BASE_URL: &str = "https://api.minimax.chat/v1";
pub const DEFAULT_OPENAI_BASE_URL: &str = "https://api.openai.com/v1";
pub const DEFAULT_ANTHROPIC_BASE_URL: &str = "https://api.anthropic.com";

const AI_KEYRING_SERVICE: &str = "refinex-notes-ai";

pub type TokenEmitter = Arc<dyn Fn(String) -> Result<(), String> + Send + Sync>;
pub type AIResult<T> = Result<T, String>;
pub type AIProviderFuture<'a> = Pin<Box<dyn Future<Output = AIResult<()>> + Send + 'a>>;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AIMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AIProviderConfig {
    pub id: String,
    pub name: String,
    pub provider_kind: AIProviderKind,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
}

impl AIProviderConfig {
    pub fn resolved_base_url(&self) -> &str {
        self.base_url
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| self.provider_kind.default_base_url())
    }

    pub fn is_openai_compatible(&self) -> bool {
        !matches!(self.provider_kind, AIProviderKind::Anthropic)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AIProviderKind {
    #[serde(rename = "deepseek")]
    DeepSeek,
    #[serde(rename = "qwen")]
    Qwen,
    #[serde(rename = "glm")]
    Glm,
    #[serde(rename = "kimi")]
    Kimi,
    #[serde(rename = "minimax")]
    MiniMax,
    #[serde(rename = "openai")]
    OpenAI,
    #[serde(rename = "anthropic")]
    Anthropic,
}

impl AIProviderKind {
    pub fn default_base_url(&self) -> &'static str {
        match self {
            Self::DeepSeek => DEFAULT_DEEPSEEK_BASE_URL,
            Self::Qwen => DEFAULT_QWEN_BASE_URL,
            Self::Glm => DEFAULT_GLM_BASE_URL,
            Self::Kimi => DEFAULT_KIMI_BASE_URL,
            Self::MiniMax => DEFAULT_MINIMAX_BASE_URL,
            Self::OpenAI => DEFAULT_OPENAI_BASE_URL,
            Self::Anthropic => DEFAULT_ANTHROPIC_BASE_URL,
        }
    }
}

pub trait AIProvider: Send + Sync {
    fn chat_stream<'a>(
        &'a self,
        messages: Vec<AIMessage>,
        model: String,
        on_token: TokenEmitter,
    ) -> AIProviderFuture<'a>;
}

fn provider_keyring_account(provider_id: &str) -> String {
    format!("provider:{provider_id}:api-key")
}

fn provider_keyring_entry(provider_id: &str) -> Result<Entry, String> {
    Entry::new(AI_KEYRING_SERVICE, &provider_keyring_account(provider_id))
        .map_err(|error| format!("初始化 AI Provider 钥匙串条目失败: {error}"))
}

fn normalize_api_key(raw_value: String) -> Result<String, String> {
    let trimmed = raw_value.trim();
    if trimmed.is_empty() {
        Err("AI Provider API Key 为空".to_string())
    } else {
        Ok(trimmed.to_string())
    }
}

fn load_provider_api_key_with<F>(provider_id: &str, mut load_raw: F) -> Result<String, String>
where
    F: FnMut(&str, &str) -> Result<Option<String>, String>,
{
    let account = provider_keyring_account(provider_id);
    let raw_value = load_raw(AI_KEYRING_SERVICE, &account)?
        .ok_or_else(|| format!("Provider `{provider_id}` 尚未在系统钥匙串中配置 API Key"))?;
    normalize_api_key(raw_value)
}

pub fn load_provider_api_key(provider_id: &str) -> Result<String, String> {
    let entry = provider_keyring_entry(provider_id)?;
    load_provider_api_key_with(provider_id, move |_, _| match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(error) => Err(format!("访问系统钥匙串失败: {error}")),
    })
}

#[cfg(test)]
mod tests {
    use super::{
        load_provider_api_key_with, AIProviderConfig, AIProviderKind, DEFAULT_ANTHROPIC_BASE_URL,
        DEFAULT_GLM_BASE_URL, DEFAULT_OPENAI_BASE_URL,
    };

    #[test]
    fn provider_config_uses_default_base_url_when_missing() {
        let glm = AIProviderConfig {
            id: "glm".to_string(),
            name: "GLM".to_string(),
            provider_kind: AIProviderKind::Glm,
            base_url: None,
        };
        let anthropic = AIProviderConfig {
            id: "anthropic".to_string(),
            name: "Anthropic".to_string(),
            provider_kind: AIProviderKind::Anthropic,
            base_url: Some("   ".to_string()),
        };

        assert_eq!(glm.resolved_base_url(), DEFAULT_GLM_BASE_URL);
        assert_eq!(anthropic.resolved_base_url(), DEFAULT_ANTHROPIC_BASE_URL);
    }

    #[test]
    fn provider_config_allows_custom_base_url_override() {
        let provider = AIProviderConfig {
            id: "openai".to_string(),
            name: "OpenAI".to_string(),
            provider_kind: AIProviderKind::OpenAI,
            base_url: Some("https://proxy.example.com/v1".to_string()),
        };

        assert_eq!(provider.resolved_base_url(), "https://proxy.example.com/v1");
        assert!(provider.is_openai_compatible());
        assert_ne!(provider.resolved_base_url(), DEFAULT_OPENAI_BASE_URL);
    }

    #[test]
    fn load_provider_api_key_uses_stable_keyring_account_and_trims_value() {
        let api_key = load_provider_api_key_with("deepseek-main", |service, account| {
            assert_eq!(service, "refinex-notes-ai");
            assert_eq!(account, "provider:deepseek-main:api-key");
            Ok(Some("  sk-test  ".to_string()))
        })
        .expect("api key");

        assert_eq!(api_key, "sk-test");
    }

    #[test]
    fn load_provider_api_key_rejects_blank_values() {
        let error = load_provider_api_key_with("anthropic", |_, _| Ok(Some("   ".to_string())))
            .expect_err("blank api key should fail");

        assert!(error.contains("为空"));
    }
}

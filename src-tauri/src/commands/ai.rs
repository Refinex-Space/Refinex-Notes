use std::sync::{Arc, Mutex};

use tauri::{ipc::Channel, State};
use tokio::sync::watch;

use crate::ai::providers::{AnthropicProvider, OpenAICompatibleProvider};
use crate::ai::{
    load_provider_api_key, resolve_model_catalog, AIMessage, AIModelCatalogEntry, AIProvider,
    AIProviderConfig, AITestConnectionMode, AITestConnectionResult,
};
use crate::db;
use crate::state::AppState;

#[tauri::command]
pub async fn ai_chat_stream(
    state: State<'_, AppState>,
    messages: Vec<AIMessage>,
    provider_id: String,
    model: String,
    channel: Channel<String>,
) -> Result<(), String> {
    let config = {
        let connection = state
            .db
            .lock()
            .map_err(|_| "数据库锁获取失败".to_string())?;
        load_provider_config(&connection, &provider_id)?
    };
    let api_key = load_provider_api_key(&config.id)?;
    let (abort_tx, abort_rx) = replace_active_stream(&state.ai_stream_abort)?;

    let token_emitter = Arc::new(move |token: String| {
        channel
            .send(token)
            .map_err(|error| format!("发送 AI token 到前端失败: {error}"))
    });

    let provider = build_provider(config, api_key, abort_rx)?;
    let result = provider.chat_stream(messages, model, token_emitter).await;
    clear_active_stream_if_current(&state.ai_stream_abort, &abort_tx)?;
    result
}

#[tauri::command]
pub fn ai_cancel_stream(state: State<'_, AppState>) -> Result<(), String> {
    cancel_active_stream(&state.ai_stream_abort).map(|_| ())
}

#[tauri::command]
pub fn ai_list_providers(state: State<'_, AppState>) -> Result<Vec<AIProviderConfig>, String> {
    let connection = state
        .db
        .lock()
        .map_err(|_| "数据库锁获取失败".to_string())?;
    db::load_ai_provider_configs(&connection)
}

#[tauri::command]
pub fn ai_list_models(
    state: State<'_, AppState>,
    provider_id: String,
) -> Result<Vec<AIModelCatalogEntry>, String> {
    let connection = state
        .db
        .lock()
        .map_err(|_| "数据库锁获取失败".to_string())?;
    let providers = db::load_ai_provider_configs(&connection)?;
    ensure_provider_exists(&providers, &provider_id)?;
    Ok(load_model_catalog(&connection, &providers, &provider_id)?)
}

#[tauri::command]
pub fn ai_test_connection(
    state: State<'_, AppState>,
    provider_id: String,
    model: Option<String>,
) -> Result<AITestConnectionResult, String> {
    let connection = state
        .db
        .lock()
        .map_err(|_| "数据库锁获取失败".to_string())?;
    let providers = db::load_ai_provider_configs(&connection)?;
    let provider = ensure_provider_exists(&providers, &provider_id)?;
    let models = load_model_catalog(&connection, &providers, &provider_id)?;
    let model_id = resolve_model_id(&models, model)?;

    load_provider_api_key(&provider.id)?;

    Ok(AITestConnectionResult {
        provider_id: provider.id.clone(),
        model_id,
        ready: true,
        check_mode: AITestConnectionMode::ConfigOnly,
    })
}

fn load_provider_config(
    connection: &rusqlite::Connection,
    provider_id: &str,
) -> Result<AIProviderConfig, String> {
    db::load_ai_provider_configs(connection)?
        .into_iter()
        .find(|provider| provider.id == provider_id)
        .ok_or_else(|| format!("未找到 provider `{provider_id}` 的配置"))
}

fn ensure_provider_exists<'a>(
    providers: &'a [AIProviderConfig],
    provider_id: &str,
) -> Result<&'a AIProviderConfig, String> {
    providers
        .iter()
        .find(|provider| provider.id == provider_id)
        .ok_or_else(|| format!("未找到 provider `{provider_id}` 的配置"))
}

fn load_model_catalog(
    connection: &rusqlite::Connection,
    providers: &[AIProviderConfig],
    provider_id: &str,
) -> Result<Vec<AIModelCatalogEntry>, String> {
    let overrides = db::load_ai_model_catalog_entries(connection)?;
    let models = resolve_model_catalog(providers, &overrides)
        .into_iter()
        .filter(|entry| entry.provider_id == provider_id)
        .collect::<Vec<_>>();

    if models.is_empty() {
        Err(format!("provider `{provider_id}` 缺少可用模型目录"))
    } else {
        Ok(models)
    }
}

fn resolve_model_id(
    models: &[AIModelCatalogEntry],
    requested_model: Option<String>,
) -> Result<String, String> {
    match requested_model
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    {
        Some(model_id) => models
            .iter()
            .find(|entry| entry.model_id == model_id)
            .map(|entry| entry.model_id.clone())
            .ok_or_else(|| format!("模型 `{model_id}` 不在当前 provider 目录中")),
        None => models
            .iter()
            .find(|entry| entry.is_default)
            .or_else(|| models.first())
            .map(|entry| entry.model_id.clone())
            .ok_or_else(|| "当前 provider 没有默认模型".to_string()),
    }
}

fn build_provider(
    config: AIProviderConfig,
    api_key: String,
    abort_rx: watch::Receiver<bool>,
) -> Result<Box<dyn AIProvider>, String> {
    if config.is_openai_compatible() {
        Ok(Box::new(OpenAICompatibleProvider::new(
            config, api_key, abort_rx,
        )?))
    } else {
        Ok(Box::new(AnthropicProvider::new(config, api_key, abort_rx)?))
    }
}

fn replace_active_stream(
    stream_state: &Mutex<Option<watch::Sender<bool>>>,
) -> Result<(watch::Sender<bool>, watch::Receiver<bool>), String> {
    let (abort_tx, abort_rx) = watch::channel(false);
    let previous = {
        let mut guard = stream_state
            .lock()
            .map_err(|_| "AI 流状态锁获取失败".to_string())?;
        guard.replace(abort_tx.clone())
    };

    if let Some(previous) = previous {
        let _ = previous.send(true);
    }

    Ok((abort_tx, abort_rx))
}

fn clear_active_stream_if_current(
    stream_state: &Mutex<Option<watch::Sender<bool>>>,
    current: &watch::Sender<bool>,
) -> Result<(), String> {
    let mut guard = stream_state
        .lock()
        .map_err(|_| "AI 流状态锁获取失败".to_string())?;

    if guard
        .as_ref()
        .is_some_and(|active| active.same_channel(current))
    {
        *guard = None;
    }

    Ok(())
}

fn cancel_active_stream(stream_state: &Mutex<Option<watch::Sender<bool>>>) -> Result<bool, String> {
    let sender = {
        let guard = stream_state
            .lock()
            .map_err(|_| "AI 流状态锁获取失败".to_string())?;
        guard.clone()
    };

    match sender {
        Some(sender) => {
            let _ = sender.send(true);
            Ok(true)
        }
        None => Ok(false),
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use rusqlite::Connection;
    use tokio::sync::watch;

    use crate::ai::{AIModelCatalogEntry, AIProviderConfig, AIProviderKind};
    use crate::db;

    use super::{
        cancel_active_stream, clear_active_stream_if_current, load_model_catalog,
        load_provider_config, replace_active_stream, resolve_model_id,
    };

    #[test]
    fn load_provider_config_returns_matching_provider() {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute(
                "CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)",
                [],
            )
            .unwrap();
        db::save_ai_provider_configs(
            &connection,
            &[AIProviderConfig {
                id: "deepseek".to_string(),
                name: "DeepSeek".to_string(),
                provider_kind: AIProviderKind::DeepSeek,
                base_url: None,
            }],
        )
        .unwrap();

        let provider = load_provider_config(&connection, "deepseek").expect("provider");
        assert_eq!(provider.name, "DeepSeek");
    }

    #[test]
    fn replace_active_stream_cancels_previous_sender() {
        let stream_state = Mutex::new(None);
        let (_first_tx, mut first_rx) = replace_active_stream(&stream_state).expect("first");
        let (_second_tx, _second_rx) = replace_active_stream(&stream_state).expect("second");

        assert!(first_rx.has_changed().expect("change state"));
        assert!(*first_rx.borrow_and_update());
    }

    #[test]
    fn clear_active_stream_only_clears_matching_sender() {
        let stream_state = Mutex::new(None);
        let (active_tx, _active_rx) = replace_active_stream(&stream_state).expect("active");
        let (other_tx, _other_rx) = watch::channel(false);

        clear_active_stream_if_current(&stream_state, &other_tx).expect("skip clear");
        assert!(stream_state.lock().unwrap().is_some());

        clear_active_stream_if_current(&stream_state, &active_tx).expect("clear");
        assert!(stream_state.lock().unwrap().is_none());
    }

    #[test]
    fn cancel_active_stream_marks_sender_cancelled() {
        let stream_state = Mutex::new(None);
        let (_active_tx, mut active_rx) = replace_active_stream(&stream_state).expect("active");

        assert!(cancel_active_stream(&stream_state).expect("cancel result"));
        assert!(active_rx.has_changed().expect("change state"));
        assert!(*active_rx.borrow_and_update());
    }

    #[test]
    fn load_model_catalog_falls_back_to_provider_defaults() {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute(
                "CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)",
                [],
            )
            .unwrap();
        db::save_ai_provider_configs(
            &connection,
            &[AIProviderConfig {
                id: "deepseek".to_string(),
                name: "DeepSeek".to_string(),
                provider_kind: AIProviderKind::DeepSeek,
                base_url: None,
            }],
        )
        .unwrap();

        let providers = db::load_ai_provider_configs(&connection).unwrap();
        let models = load_model_catalog(&connection, &providers, "deepseek").unwrap();
        assert_eq!(models.len(), 2);
        assert_eq!(models[0].model_id, "deepseek-chat");
        assert!(models[0].is_default);
    }

    #[test]
    fn load_model_catalog_prefers_persisted_entries_for_provider() {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute(
                "CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)",
                [],
            )
            .unwrap();
        db::save_ai_provider_configs(
            &connection,
            &[AIProviderConfig {
                id: "openai".to_string(),
                name: "OpenAI".to_string(),
                provider_kind: AIProviderKind::OpenAI,
                base_url: None,
            }],
        )
        .unwrap();
        db::save_ai_model_catalog_entries(
            &connection,
            &[AIModelCatalogEntry {
                provider_id: "openai".to_string(),
                model_id: "gpt-4.1".to_string(),
                label: "GPT-4.1".to_string(),
                is_default: true,
            }],
        )
        .unwrap();

        let providers = db::load_ai_provider_configs(&connection).unwrap();
        let models = load_model_catalog(&connection, &providers, "openai").unwrap();
        assert_eq!(models.len(), 1);
        assert_eq!(models[0].model_id, "gpt-4.1");
    }

    #[test]
    fn resolve_model_id_uses_default_when_not_requested() {
        let model_id = resolve_model_id(
            &[
                AIModelCatalogEntry {
                    provider_id: "anthropic".to_string(),
                    model_id: "claude-sonnet-4-20250514".to_string(),
                    label: "Claude Sonnet 4".to_string(),
                    is_default: true,
                },
                AIModelCatalogEntry {
                    provider_id: "anthropic".to_string(),
                    model_id: "claude-3-5-haiku-20241022".to_string(),
                    label: "Claude Haiku 3.5".to_string(),
                    is_default: false,
                },
            ],
            None,
        )
        .unwrap();

        assert_eq!(model_id, "claude-sonnet-4-20250514");
    }

    #[test]
    fn resolve_model_id_rejects_unknown_requested_model() {
        let error = resolve_model_id(
            &[AIModelCatalogEntry {
                provider_id: "openai".to_string(),
                model_id: "gpt-4o".to_string(),
                label: "GPT-4o".to_string(),
                is_default: true,
            }],
            Some("gpt-5".to_string()),
        )
        .expect_err("unknown model should fail");

        assert!(error.contains("不在当前 provider 目录中"));
    }
}

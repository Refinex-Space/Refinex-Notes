use std::sync::{Arc, Mutex};

use tauri::{ipc::Channel, State};
use tokio::sync::watch;

use crate::ai::providers::{AnthropicProvider, OpenAICompatibleProvider};
use crate::ai::{load_provider_api_key, AIMessage, AIProvider, AIProviderConfig};
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

fn load_provider_config(
    connection: &rusqlite::Connection,
    provider_id: &str,
) -> Result<AIProviderConfig, String> {
    db::load_ai_provider_configs(connection)?
        .into_iter()
        .find(|provider| provider.id == provider_id)
        .ok_or_else(|| format!("未找到 provider `{provider_id}` 的配置"))
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

    use crate::ai::{AIProviderConfig, AIProviderKind};
    use crate::db;

    use super::{
        cancel_active_stream, clear_active_stream_if_current, load_provider_config,
        replace_active_stream,
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
}

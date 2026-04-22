use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db;
use crate::state::AppState;

pub const APP_SETTINGS_KEY: &str = "app_settings";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme_mode: ThemeMode,
    pub language: AppLanguage,
    pub reopen_last_workspace_on_startup: bool,
    pub editor: EditorSettings,
    pub git_sync: GitSyncSettings,
    pub ai: AISettings,
    pub shortcuts: ShortcutSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ThemeMode {
    Light,
    Dark,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum AppLanguage {
    ZhCn,
    En,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EditorSettings {
    pub font_family: String,
    pub font_size_px: u16,
    pub line_height: f32,
    pub show_line_numbers: bool,
    pub auto_save_interval_seconds: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GitSyncSettings {
    pub auto_sync_enabled: bool,
    pub sync_interval_seconds: u16,
    pub commit_message_template: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AISettings {
    pub default_provider_id: Option<String>,
    pub default_model_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutSettings {
    pub overrides: Vec<ShortcutOverride>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutOverride {
    pub action_id: String,
    pub accelerator: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme_mode: ThemeMode::System,
            language: AppLanguage::ZhCn,
            reopen_last_workspace_on_startup: true,
            editor: EditorSettings {
                font_family: "IBM Plex Sans".to_string(),
                font_size_px: 16,
                line_height: 1.65,
                show_line_numbers: false,
                auto_save_interval_seconds: 5,
            },
            git_sync: GitSyncSettings {
                auto_sync_enabled: false,
                sync_interval_seconds: 60,
                commit_message_template: "chore(notes): auto-sync".to_string(),
            },
            ai: AISettings {
                default_provider_id: None,
                default_model_id: None,
            },
            shortcuts: ShortcutSettings {
                overrides: Vec::new(),
            },
        }
    }
}

fn normalize_settings(mut settings: AppSettings) -> AppSettings {
    settings.editor.font_family = settings.editor.font_family.trim().to_string();
    if settings.editor.font_family.is_empty() {
        settings.editor.font_family = "IBM Plex Sans".to_string();
    }
    settings.editor.font_size_px = settings.editor.font_size_px.clamp(14, 24);
    settings.editor.line_height = settings.editor.line_height.clamp(1.2, 2.4);
    settings.editor.auto_save_interval_seconds =
        settings.editor.auto_save_interval_seconds.clamp(1, 300);

    settings.git_sync.sync_interval_seconds =
        settings.git_sync.sync_interval_seconds.clamp(30, 300);
    settings.git_sync.commit_message_template = settings
        .git_sync
        .commit_message_template
        .trim()
        .to_string();
    if settings.git_sync.commit_message_template.is_empty() {
        settings.git_sync.commit_message_template = "chore(notes): auto-sync".to_string();
    }

    settings.ai.default_provider_id = settings
        .ai
        .default_provider_id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    settings.ai.default_model_id = settings
        .ai
        .default_model_id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    settings.shortcuts.overrides = settings
        .shortcuts
        .overrides
        .into_iter()
        .filter_map(|override_entry| {
            let action_id = override_entry.action_id.trim().to_string();
            let accelerator = override_entry.accelerator.trim().to_string();
            if action_id.is_empty() || accelerator.is_empty() {
                None
            } else {
                Some(ShortcutOverride {
                    action_id,
                    accelerator,
                })
            }
        })
        .collect();

    settings
}

fn load_settings_from_connection(connection: &rusqlite::Connection) -> Result<AppSettings, String> {
    let Some(raw_value) = db::get_setting(connection, APP_SETTINGS_KEY)? else {
        return Ok(AppSettings::default());
    };

    let parsed = serde_json::from_str::<AppSettings>(&raw_value)
        .map_err(|error| format!("解析设置失败: {error}"))?;
    Ok(normalize_settings(parsed))
}

fn save_settings_to_connection(
    connection: &rusqlite::Connection,
    settings: &AppSettings,
) -> Result<(), String> {
    let normalized = normalize_settings(settings.clone());
    let raw_value = serde_json::to_string(&normalized)
        .map_err(|error| format!("序列化设置失败: {error}"))?;
    db::set_setting(connection, APP_SETTINGS_KEY, &raw_value)
}

#[tauri::command]
pub fn load_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let connection = state
        .db
        .lock()
        .map_err(|_| "数据库锁获取失败".to_string())?;
    load_settings_from_connection(&connection)
}

#[tauri::command]
pub fn save_settings(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    let connection = state
        .db
        .lock()
        .map_err(|_| "数据库锁获取失败".to_string())?;
    let normalized = normalize_settings(settings);
    save_settings_to_connection(&connection, &normalized)?;
    Ok(normalized)
}

#[tauri::command]
pub fn read_setting(
    state: State<'_, AppState>,
    key: String,
) -> Result<Option<String>, String> {
    let connection = state
        .db
        .lock()
        .map_err(|_| "数据库锁获取失败".to_string())?;
    db::get_setting(&connection, key.trim())
}

#[tauri::command]
pub fn write_setting(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let normalized_key = key.trim();
    if normalized_key.is_empty() {
        return Err("设置 key 不能为空".to_string());
    }

    let connection = state
        .db
        .lock()
        .map_err(|_| "数据库锁获取失败".to_string())?;
    db::set_setting(&connection, normalized_key, &value)
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;

    use super::{
        load_settings_from_connection, normalize_settings, save_settings_to_connection,
        AppLanguage, AppSettings, ThemeMode,
    };

    fn connection() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute(
                "CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)",
                [],
            )
            .unwrap();
        connection
    }

    #[test]
    fn load_settings_returns_defaults_when_missing() {
        let connection = connection();
        let settings = load_settings_from_connection(&connection).unwrap();

        assert_eq!(settings.theme_mode, ThemeMode::System);
        assert!(settings.reopen_last_workspace_on_startup);
        assert_eq!(settings.editor.font_family, "IBM Plex Sans");
    }

    #[test]
    fn save_and_load_settings_roundtrip() {
        let connection = connection();
        let saved = AppSettings {
            theme_mode: ThemeMode::Dark,
            language: AppLanguage::En,
            reopen_last_workspace_on_startup: false,
            ..AppSettings::default()
        };
        save_settings_to_connection(&connection, &saved).unwrap();

        let loaded = load_settings_from_connection(&connection).unwrap();
        assert_eq!(loaded.theme_mode, ThemeMode::Dark);
        assert_eq!(loaded.language, AppLanguage::En);
        assert!(!loaded.reopen_last_workspace_on_startup);
    }

    #[test]
    fn normalize_settings_clamps_ranges_and_discards_blank_shortcuts() {
        let normalized = normalize_settings(AppSettings {
            editor: super::EditorSettings {
                font_family: "   ".to_string(),
                font_size_px: 80,
                line_height: 9.9,
                show_line_numbers: true,
                auto_save_interval_seconds: 0,
            },
            git_sync: super::GitSyncSettings {
                auto_sync_enabled: true,
                sync_interval_seconds: 10,
                commit_message_template: "   ".to_string(),
            },
            shortcuts: super::ShortcutSettings {
                overrides: vec![
                    super::ShortcutOverride {
                        action_id: "toggle-settings".to_string(),
                        accelerator: "Cmd+,".to_string(),
                    },
                    super::ShortcutOverride {
                        action_id: "  ".to_string(),
                        accelerator: "  ".to_string(),
                    },
                ],
            },
            ..AppSettings::default()
        });

        assert_eq!(normalized.editor.font_family, "IBM Plex Sans");
        assert_eq!(normalized.editor.font_size_px, 24);
        assert_eq!(normalized.editor.line_height, 2.4);
        assert_eq!(normalized.editor.auto_save_interval_seconds, 1);
        assert_eq!(normalized.git_sync.sync_interval_seconds, 30);
        assert_eq!(
            normalized.git_sync.commit_message_template,
            "chore(notes): auto-sync"
        );
        assert_eq!(normalized.shortcuts.overrides.len(), 1);
    }
}

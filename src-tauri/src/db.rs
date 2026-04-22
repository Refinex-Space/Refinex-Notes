use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::Connection;
use tauri::{AppHandle, Manager, Runtime};

use crate::ai::{
    normalize_model_catalog, normalize_provider_configs, AIModelCatalogEntry, AIProviderConfig,
    AI_MODEL_CATALOG_SETTINGS_KEY, AI_PROVIDERS_SETTINGS_KEY,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RecentWorkspaceRecord {
    pub path: String,
    pub last_opened: i64,
}

const INIT_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS recent_workspaces (
    path TEXT PRIMARY KEY,
    last_opened INTEGER
);

CREATE TABLE IF NOT EXISTS file_meta (
    path TEXT PRIMARY KEY,
    title TEXT,
    tags TEXT,
    modified INTEGER
);

CREATE TABLE IF NOT EXISTS file_content_cache (
    workspace_path TEXT NOT NULL,
    path TEXT NOT NULL,
    content TEXT NOT NULL,
    modified INTEGER NOT NULL,
    PRIMARY KEY (workspace_path, path)
);
"#;

pub fn init_database<R: Runtime>(app: &AppHandle<R>) -> Result<Connection, String> {
    let db_path = resolve_database_path(app)?;
    let connection =
        Connection::open(&db_path).map_err(|error| format!("打开 SQLite 数据库失败: {error}"))?;

    initialize_schema(&connection)?;

    Ok(connection)
}

pub fn remember_workspace(connection: &Connection, workspace_path: &Path) -> Result<(), String> {
    let workspace_path = workspace_path.to_string_lossy().into_owned();
    connection
        .execute(
            r#"
            INSERT INTO recent_workspaces(path, last_opened)
            VALUES (?1, unixepoch())
            ON CONFLICT(path) DO UPDATE SET last_opened = excluded.last_opened
            "#,
            [workspace_path],
        )
        .map_err(|error| format!("记录最近工作区失败: {error}"))?;

    Ok(())
}

pub fn list_recent_workspaces(
    connection: &Connection,
) -> Result<Vec<RecentWorkspaceRecord>, String> {
    let mut statement = connection
        .prepare(
            r#"
            SELECT path, last_opened
            FROM recent_workspaces
            ORDER BY last_opened DESC, path ASC
            "#,
        )
        .map_err(|error| format!("读取最近工作区失败: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(RecentWorkspaceRecord {
                path: row.get(0)?,
                last_opened: row.get(1)?,
            })
        })
        .map_err(|error| format!("查询最近工作区失败: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("收集最近工作区失败: {error}"))
}

pub fn remove_recent_workspace(
    connection: &Connection,
    workspace_path: &str,
) -> Result<(), String> {
    connection
        .execute(
            "DELETE FROM recent_workspaces WHERE path = ?1",
            [workspace_path],
        )
        .map_err(|error| format!("移除最近工作区失败: {error}"))?;

    Ok(())
}

pub fn get_setting(connection: &Connection, key: &str) -> Result<Option<String>, String> {
    let mut statement = connection
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .map_err(|error| format!("读取设置失败: {error}"))?;

    statement
        .query_row([key], |row| row.get::<_, String>(0))
        .map(Some)
        .or_else(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => Ok(None),
            other => Err(format!("查询设置失败: {other}")),
        })
}

pub fn set_setting(connection: &Connection, key: &str, value: &str) -> Result<(), String> {
    connection
        .execute(
            r#"
            INSERT INTO settings(key, value)
            VALUES (?1, ?2)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            "#,
            (key, value),
        )
        .map_err(|error| format!("写入设置失败: {error}"))?;

    Ok(())
}

pub fn load_ai_provider_configs(connection: &Connection) -> Result<Vec<AIProviderConfig>, String> {
    let raw_value = match get_setting(connection, AI_PROVIDERS_SETTINGS_KEY)? {
        Some(raw_value) => raw_value,
        None => return Ok(Vec::new()),
    };

    let providers = serde_json::from_str(&raw_value)
        .map_err(|error| format!("解析 AI Provider 配置失败: {error}"))?;
    normalize_provider_configs(providers)
}

pub fn save_ai_provider_configs(
    connection: &Connection,
    providers: &[AIProviderConfig],
) -> Result<(), String> {
    let normalized = normalize_provider_configs(providers.to_vec())?;
    let raw_value = serde_json::to_string(&normalized)
        .map_err(|error| format!("序列化 AI Provider 配置失败: {error}"))?;
    set_setting(connection, AI_PROVIDERS_SETTINGS_KEY, &raw_value)
}

pub fn load_ai_model_catalog_entries(
    connection: &Connection,
) -> Result<Vec<AIModelCatalogEntry>, String> {
    let raw_value = match get_setting(connection, AI_MODEL_CATALOG_SETTINGS_KEY)? {
        Some(raw_value) => raw_value,
        None => return Ok(Vec::new()),
    };

    let entries = serde_json::from_str(&raw_value)
        .map_err(|error| format!("解析 AI 模型目录失败: {error}"))?;

    Ok(normalize_model_catalog(entries))
}

pub fn save_ai_model_catalog_entries(
    connection: &Connection,
    entries: &[AIModelCatalogEntry],
) -> Result<(), String> {
    let raw_value = serde_json::to_string(entries)
        .map_err(|error| format!("序列化 AI 模型目录失败: {error}"))?;
    set_setting(connection, AI_MODEL_CATALOG_SETTINGS_KEY, &raw_value)
}

pub fn get_cached_file_content(
    connection: &Connection,
    workspace_path: &Path,
    path: &str,
    modified: i64,
) -> Result<Option<String>, String> {
    let workspace = workspace_path.to_string_lossy().into_owned();
    let mut statement = connection
        .prepare(
            r#"
            SELECT content
            FROM file_content_cache
            WHERE workspace_path = ?1 AND path = ?2 AND modified = ?3
            "#,
        )
        .map_err(|error| format!("读取文件缓存失败: {error}"))?;

    statement
        .query_row((&workspace, path, modified), |row| row.get::<_, String>(0))
        .map(Some)
        .or_else(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => Ok(None),
            other => Err(format!("查询文件缓存失败: {other}")),
        })
}

pub fn upsert_file_content_cache(
    connection: &Connection,
    workspace_path: &Path,
    path: &str,
    modified: i64,
    content: &str,
) -> Result<(), String> {
    let workspace = workspace_path.to_string_lossy().into_owned();
    connection
        .execute(
            r#"
            INSERT INTO file_content_cache(workspace_path, path, content, modified)
            VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT(workspace_path, path)
            DO UPDATE SET content = excluded.content, modified = excluded.modified
            "#,
            (&workspace, path, content, modified),
        )
        .map_err(|error| format!("写入文件缓存失败: {error}"))?;

    Ok(())
}

pub fn delete_file_content_cache(
    connection: &Connection,
    workspace_path: &Path,
    path: &str,
) -> Result<(), String> {
    let workspace = workspace_path.to_string_lossy().into_owned();
    connection
        .execute(
            "DELETE FROM file_content_cache WHERE workspace_path = ?1 AND path = ?2",
            (&workspace, path),
        )
        .map_err(|error| format!("删除文件缓存失败: {error}"))?;

    Ok(())
}

pub fn resolve_database_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let home_dir = app
        .path()
        .home_dir()
        .map_err(|error| format!("解析用户主目录失败: {error}"))?;
    let app_dir = home_dir.join(".refinex-notes");

    fs::create_dir_all(&app_dir).map_err(|error| format!("创建应用数据目录失败: {error}"))?;

    Ok(app_dir.join("meta.db"))
}

fn initialize_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(INIT_SQL)
        .map_err(|error| format!("初始化 SQLite 表结构失败: {error}"))
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;

    use crate::ai::{AIModelCatalogEntry, AIProviderConfig, AIProviderKind};

    use super::{
        get_setting, initialize_schema, list_recent_workspaces, load_ai_model_catalog_entries,
        load_ai_provider_configs, remember_workspace, remove_recent_workspace,
        save_ai_model_catalog_entries, save_ai_provider_configs, set_setting,
    };

    #[test]
    fn initialize_schema_creates_expected_tables() {
        let connection = Connection::open_in_memory().unwrap();
        initialize_schema(&connection).unwrap();

        let mut statement = connection
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
            .unwrap();
        let tables = statement
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(
            tables,
            vec![
                "file_content_cache",
                "file_meta",
                "recent_workspaces",
                "settings"
            ]
        );
    }

    #[test]
    fn remember_workspace_upserts_recent_workspace() {
        let connection = Connection::open_in_memory().unwrap();
        initialize_schema(&connection).unwrap();

        remember_workspace(&connection, std::path::Path::new("/tmp/workspace")).unwrap();
        remember_workspace(&connection, std::path::Path::new("/tmp/workspace")).unwrap();

        let count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM recent_workspaces WHERE path = ?1",
                ["/tmp/workspace"],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(count, 1);
    }

    #[test]
    fn list_and_remove_recent_workspaces_follow_recent_order() {
        let connection = Connection::open_in_memory().unwrap();
        initialize_schema(&connection).unwrap();

        remember_workspace(&connection, std::path::Path::new("/tmp/workspace-a")).unwrap();
        remember_workspace(&connection, std::path::Path::new("/tmp/workspace-b")).unwrap();

        let listed = list_recent_workspaces(&connection).unwrap();
        assert_eq!(listed.len(), 2);
        assert!(listed.iter().any(|entry| entry.path == "/tmp/workspace-a"));
        assert!(listed.iter().any(|entry| entry.path == "/tmp/workspace-b"));

        remove_recent_workspace(&connection, "/tmp/workspace-b").unwrap();

        let listed = list_recent_workspaces(&connection).unwrap();
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].path, "/tmp/workspace-a");
    }

    #[test]
    fn settings_roundtrip_updates_existing_value() {
        let connection = Connection::open_in_memory().unwrap();
        initialize_schema(&connection).unwrap();

        set_setting(&connection, "theme", "light").unwrap();
        set_setting(&connection, "theme", "dark").unwrap();

        let stored = get_setting(&connection, "theme").unwrap();
        assert_eq!(stored.as_deref(), Some("dark"));
    }

    #[test]
    fn load_ai_provider_configs_returns_empty_when_not_configured() {
        let connection = Connection::open_in_memory().unwrap();
        initialize_schema(&connection).unwrap();

        let providers = load_ai_provider_configs(&connection).unwrap();
        assert!(providers.is_empty());
    }

    #[test]
    fn save_and_load_ai_provider_configs_roundtrip() {
        let connection = Connection::open_in_memory().unwrap();
        initialize_schema(&connection).unwrap();

        let providers = vec![
            AIProviderConfig {
                id: "deepseek".to_string(),
                name: "DeepSeek".to_string(),
                provider_kind: AIProviderKind::DeepSeek,
                enabled: true,
                base_url: None,
            },
            AIProviderConfig {
                id: "anthropic".to_string(),
                name: "Anthropic".to_string(),
                provider_kind: AIProviderKind::Anthropic,
                enabled: false,
                base_url: Some("https://api.anthropic.com".to_string()),
            },
        ];

        save_ai_provider_configs(&connection, &providers).unwrap();

        let stored = load_ai_provider_configs(&connection).unwrap();
        assert_eq!(stored, providers);
    }

    #[test]
    fn load_ai_model_catalog_entries_returns_empty_when_not_configured() {
        let connection = Connection::open_in_memory().unwrap();
        initialize_schema(&connection).unwrap();

        let entries = load_ai_model_catalog_entries(&connection).unwrap();
        assert!(entries.is_empty());
    }

    #[test]
    fn save_and_load_ai_model_catalog_entries_roundtrip() {
        let connection = Connection::open_in_memory().unwrap();
        initialize_schema(&connection).unwrap();

        let entries = vec![
            AIModelCatalogEntry {
                provider_id: "deepseek".to_string(),
                model_id: "deepseek-chat".to_string(),
                label: "DeepSeek Chat".to_string(),
                is_default: true,
            },
            AIModelCatalogEntry {
                provider_id: "deepseek".to_string(),
                model_id: "deepseek-reasoner".to_string(),
                label: "DeepSeek Reasoner".to_string(),
                is_default: false,
            },
        ];

        save_ai_model_catalog_entries(&connection, &entries).unwrap();

        let stored = load_ai_model_catalog_entries(&connection).unwrap();
        assert_eq!(stored, entries);
    }

    #[test]
    fn load_ai_model_catalog_entries_normalizes_defaults() {
        let connection = Connection::open_in_memory().unwrap();
        initialize_schema(&connection).unwrap();

        set_setting(
            &connection,
            "ai_model_catalog",
            r#"[{"providerId":"openai","modelId":"gpt-4o","label":"GPT-4o","isDefault":false},{"providerId":"openai","modelId":"gpt-4o-mini","label":"GPT-4o Mini","isDefault":false}]"#,
        )
        .unwrap();

        let stored = load_ai_model_catalog_entries(&connection).unwrap();
        assert_eq!(stored.len(), 2);
        assert!(stored[0].is_default);
        assert!(!stored[1].is_default);
    }
}

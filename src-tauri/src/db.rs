use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::Connection;
use tauri::{AppHandle, Manager, Runtime};

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
"#;

pub fn init_database<R: Runtime>(app: &AppHandle<R>) -> Result<Connection, String> {
    let db_path = resolve_database_path(app)?;
    let connection = Connection::open(&db_path)
        .map_err(|error| format!("打开 SQLite 数据库失败: {error}"))?;

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

pub fn list_recent_workspaces(connection: &Connection) -> Result<Vec<RecentWorkspaceRecord>, String> {
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

pub fn remove_recent_workspace(connection: &Connection, workspace_path: &str) -> Result<(), String> {
    connection
        .execute(
            "DELETE FROM recent_workspaces WHERE path = ?1",
            [workspace_path],
        )
        .map_err(|error| format!("移除最近工作区失败: {error}"))?;

    Ok(())
}

pub fn resolve_database_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let home_dir = app
        .path()
        .home_dir()
        .map_err(|error| format!("解析用户主目录失败: {error}"))?;
    let app_dir = home_dir.join(".refinex-notes");

    fs::create_dir_all(&app_dir)
        .map_err(|error| format!("创建应用数据目录失败: {error}"))?;

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

    use super::{
        initialize_schema, list_recent_workspaces, remember_workspace, remove_recent_workspace,
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

        assert_eq!(tables, vec!["file_meta", "recent_workspaces", "settings"]);
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
}

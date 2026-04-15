use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, State};

use crate::db;
use crate::search::indexer as search_indexer;
use crate::state::AppState;
use crate::watcher;

const IGNORED_NAMES: &[&str] = &[".git", "node_modules", ".DS_Store"];

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RecentWorkspaceEntry {
    pub path: String,
    pub last_opened: i64,
}

#[tauri::command]
pub fn open_workspace(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<FileNode>, String> {
    let workspace_path = canonicalize_workspace_path(&path)?;
    let file_tree = scan_directory_tree(&workspace_path, &workspace_path)?;
    let workspace_watcher =
        watcher::create_workspace_watcher(app_handle, workspace_path.clone())?;
    stop_running_sync(&state)?;

    {
        let connection = state
            .db
            .lock()
            .map_err(|_| "数据库锁获取失败".to_string())?;
        db::remember_workspace(&connection, &workspace_path)?;
    }

    {
        let mut workspace_guard = state
            .workspace_path
            .lock()
            .map_err(|_| "工作区状态锁获取失败".to_string())?;
        *workspace_guard = Some(workspace_path.clone());
    }

    {
        let mut watcher_guard = state
            .watcher
            .lock()
            .map_err(|_| "监听器状态锁获取失败".to_string())?;
        *watcher_guard = Some(workspace_watcher);
    }

    search_indexer::rebuild_workspace_index(&state, &workspace_path)?;

    Ok(file_tree)
}

#[tauri::command]
pub fn list_recent_workspaces(state: State<'_, AppState>) -> Result<Vec<RecentWorkspaceEntry>, String> {
    let connection = state
        .db
        .lock()
        .map_err(|_| "数据库锁获取失败".to_string())?;

    db::list_recent_workspaces(&connection).map(|entries| {
        entries
            .into_iter()
            .map(|entry| RecentWorkspaceEntry {
                path: entry.path,
                last_opened: entry.last_opened,
            })
            .collect()
    })
}

#[tauri::command]
pub fn remove_recent_workspace(
    state: State<'_, AppState>,
    path: String,
) -> Result<(), String> {
    let connection = state
        .db
        .lock()
        .map_err(|_| "数据库锁获取失败".to_string())?;

    db::remove_recent_workspace(&connection, &path)
}

#[tauri::command]
pub fn read_file_tree(
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<FileNode>, String> {
    let workspace_path = current_workspace_path(&state)?;
    let target_path = resolve_workspace_path(&workspace_path, &path)?;

    if !target_path.is_dir() {
        return Err("目标路径不是目录".to_string());
    }

    scan_directory_tree(&target_path, &workspace_path)
}

#[tauri::command]
pub fn read_file(state: State<'_, AppState>, path: String) -> Result<String, String> {
    let workspace_path = current_workspace_path(&state)?;
    let target_path = resolve_workspace_path(&workspace_path, &path)?;

    fs::read_to_string(&target_path)
        .map_err(|error| format!("读取文件失败: {error}"))
}

#[tauri::command]
pub fn write_file(
    state: State<'_, AppState>,
    path: String,
    content: String,
) -> Result<(), String> {
    let workspace_path = current_workspace_path(&state)?;
    let target_path = resolve_workspace_path(&workspace_path, &path)?;

    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("创建父目录失败: {error}"))?;
    }

    fs::write(&target_path, content).map_err(|error| format!("写入文件失败: {error}"))?;
    notify_git_sync(&state)
}

#[tauri::command]
pub fn create_file(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let workspace_path = current_workspace_path(&state)?;
    let target_path = resolve_workspace_path(&workspace_path, &path)?;

    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("创建父目录失败: {error}"))?;
    }

    fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&target_path)
        .map_err(|error| format!("创建文件失败: {error}"))?;

    notify_git_sync(&state)
}

#[tauri::command]
pub fn create_dir(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let workspace_path = current_workspace_path(&state)?;
    let target_path = resolve_workspace_path(&workspace_path, &path)?;

    fs::create_dir_all(&target_path).map_err(|error| format!("创建目录失败: {error}"))?;
    notify_git_sync(&state)
}

#[tauri::command]
pub fn delete_file(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let workspace_path = current_workspace_path(&state)?;
    let target_path = resolve_workspace_path(&workspace_path, &path)?;

    if target_path.is_dir() {
        fs::remove_dir_all(&target_path).map_err(|error| format!("删除目录失败: {error}"))
    } else {
        fs::remove_file(&target_path).map_err(|error| format!("删除文件失败: {error}"))
    }?;

    notify_git_sync(&state)
}

#[tauri::command]
pub fn rename_file(
    state: State<'_, AppState>,
    old_path: String,
    new_path: String,
) -> Result<(), String> {
    let workspace_path = current_workspace_path(&state)?;
    let source_path = resolve_workspace_path(&workspace_path, &old_path)?;
    let destination_path = resolve_workspace_path(&workspace_path, &new_path)?;

    if let Some(parent) = destination_path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("创建目标父目录失败: {error}"))?;
    }

    fs::rename(&source_path, &destination_path)
        .map_err(|error| format!("重命名失败: {error}"))?;

    notify_git_sync(&state)
}

fn current_workspace_path(state: &State<'_, AppState>) -> Result<PathBuf, String> {
    let workspace_guard = state
        .workspace_path
        .lock()
        .map_err(|_| "工作区状态锁获取失败".to_string())?;

    workspace_guard
        .clone()
        .ok_or_else(|| "尚未打开工作区".to_string())
}

fn canonicalize_workspace_path(path: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(path);
    if path.trim().is_empty() {
        return Err("工作区路径不能为空".to_string());
    }

    let canonical = fs::canonicalize(&candidate)
        .map_err(|error| format!("解析工作区路径失败: {error}"))?;

    if !canonical.is_dir() {
        return Err("工作区路径不是目录".to_string());
    }

    Ok(canonical)
}

fn resolve_workspace_path(workspace_path: &Path, path: &str) -> Result<PathBuf, String> {
    let candidate = if path.trim().is_empty() {
        workspace_path.to_path_buf()
    } else {
        let raw = PathBuf::from(path);
        if raw.is_absolute() {
            raw
        } else {
            workspace_path.join(raw)
        }
    };

    let normalized = normalize_workspace_child_path(workspace_path, &candidate)?;
    if normalized == workspace_path || normalized.starts_with(workspace_path) {
        Ok(normalized)
    } else {
        Err("路径超出当前工作区范围".to_string())
    }
}

fn normalize_workspace_child_path(workspace_path: &Path, candidate: &Path) -> Result<PathBuf, String> {
    if candidate.exists() {
        return fs::canonicalize(candidate).map_err(|error| format!("解析路径失败: {error}"));
    }

    let relative = candidate
        .strip_prefix(workspace_path)
        .map_err(|_| "路径超出当前工作区范围".to_string())?;

    let mut normalized = workspace_path.to_path_buf();
    for component in relative.components() {
        match component {
            std::path::Component::CurDir => {}
            std::path::Component::Normal(value) => normalized.push(value),
            _ => return Err("路径包含非法跳转".to_string()),
        }
    }

    Ok(normalized)
}

fn scan_directory_tree(root_path: &Path, workspace_path: &Path) -> Result<Vec<FileNode>, String> {
    let mut nodes = Vec::new();
    let entries = fs::read_dir(root_path).map_err(|error| format!("读取目录失败: {error}"))?;

    for entry in entries {
        let entry = entry.map_err(|error| format!("读取目录项失败: {error}"))?;
        let path = entry.path();
        let metadata = entry
            .metadata()
            .map_err(|error| format!("读取文件元数据失败: {error}"))?;
        let name = entry.file_name().to_string_lossy().into_owned();

        if should_ignore(&name) {
            continue;
        }

        let relative_path = to_relative_path(workspace_path, &path)?;
        if metadata.is_dir() {
            let children = scan_directory_tree(&path, workspace_path)?;
            nodes.push(FileNode {
                name,
                path: relative_path,
                is_dir: true,
                children: Some(children),
            });
        } else {
            nodes.push(FileNode {
                name,
                path: relative_path,
                is_dir: false,
                children: None,
            });
        }
    }

    nodes.sort_by(|left, right| match (left.is_dir, right.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => left.name.cmp(&right.name),
    });

    Ok(nodes)
}

fn stop_running_sync(state: &State<'_, AppState>) -> Result<(), String> {
    let controller = {
        let mut guard = state
            .git_sync
            .lock()
            .map_err(|_| "Git 同步状态锁获取失败".to_string())?;
        guard.take()
    };

    if let Some(controller) = controller {
        controller.stop();
    }

    Ok(())
}

fn notify_git_sync(state: &State<'_, AppState>) -> Result<(), String> {
    let guard = state
        .git_sync
        .lock()
        .map_err(|_| "Git 同步状态锁获取失败".to_string())?;

    if let Some(controller) = guard.as_ref() {
        controller.notify_local_change()?;
    }

    Ok(())
}

fn should_ignore(name: &str) -> bool {
    IGNORED_NAMES.iter().any(|ignored| ignored == &name)
}

fn to_relative_path(workspace_path: &Path, path: &Path) -> Result<String, String> {
    let relative = path
        .strip_prefix(workspace_path)
        .map_err(|_| "路径不在当前工作区内".to_string())?;

    Ok(relative.to_string_lossy().replace('\\', "/"))
}

#[cfg(test)]
mod tests {
    use super::{scan_directory_tree, FileNode};
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir() -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time should be monotonic")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("refinex-notes-files-{unique}"));
        fs::create_dir_all(&root).expect("temp dir should be creatable");
        root
    }

    fn flatten_paths(nodes: &[FileNode], values: &mut Vec<String>) {
        for node in nodes {
            values.push(node.path.clone());
            if let Some(children) = &node.children {
                flatten_paths(children, values);
            }
        }
    }

    #[test]
    fn scan_directory_tree_ignores_internal_entries() {
        let root = temp_dir();
        fs::create_dir_all(root.join(".git")).unwrap();
        fs::create_dir_all(root.join("node_modules/pkg")).unwrap();
        fs::create_dir_all(root.join("Notes/Sub")).unwrap();
        fs::write(root.join(".DS_Store"), "").unwrap();
        fs::write(root.join("Notes/alpha.md"), "# alpha").unwrap();
        fs::write(root.join("Notes/Sub/beta.md"), "# beta").unwrap();

        let tree = scan_directory_tree(&root, &root).unwrap();
        let mut flattened = Vec::new();
        flatten_paths(&tree, &mut flattened);

        assert_eq!(
            flattened,
            vec!["Notes", "Notes/Sub", "Notes/Sub/beta.md", "Notes/alpha.md"]
        );

        fs::remove_dir_all(root).unwrap();
    }
}

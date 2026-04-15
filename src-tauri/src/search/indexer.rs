use std::path::Path;

use tauri::State;

use crate::search::{WorkspaceSearchIndex, build_index, update_index};
use crate::state::AppState;

pub fn rebuild_workspace_index(state: &State<'_, AppState>, workspace_path: &Path) -> Result<(), String> {
    let search_index = build_index(workspace_path)?;
    let mut guard = state
        .search_index
        .lock()
        .map_err(|_| "搜索索引状态锁获取失败".to_string())?;
    *guard = Some(search_index);
    Ok(())
}

pub fn update_paths(
    state: &State<'_, AppState>,
    workspace_path: &Path,
    relative_paths: &[String],
) -> Result<(), String> {
    if relative_paths.is_empty() {
        return Ok(());
    }

    let mut guard = state
        .search_index
        .lock()
        .map_err(|_| "搜索索引状态锁获取失败".to_string())?;

    if guard.is_none() {
        *guard = Some(build_index(workspace_path)?);
        return Ok(());
    }

    let search_index = guard
        .as_mut()
        .ok_or_else(|| "搜索索引尚未初始化".to_string())?;

    if relative_paths.iter().any(|relative_path| needs_rebuild(workspace_path, relative_path)) {
        *search_index = build_index(workspace_path)?;
        return Ok(());
    }

    for relative_path in relative_paths {
        let absolute_path = workspace_path.join(relative_path);
        update_index(search_index, &absolute_path)?;
    }

    Ok(())
}

pub fn with_search_index<T>(
    state: &State<'_, AppState>,
    callback: impl FnOnce(&WorkspaceSearchIndex) -> Result<T, String>,
) -> Result<T, String> {
    let guard = state
        .search_index
        .lock()
        .map_err(|_| "搜索索引状态锁获取失败".to_string())?;
    let search_index = guard
        .as_ref()
        .ok_or_else(|| "搜索索引尚未初始化".to_string())?;

    callback(search_index)
}

pub fn with_optional_search_index<T>(
    state: &State<'_, AppState>,
    callback: impl FnOnce(&WorkspaceSearchIndex) -> Result<T, String>,
) -> Result<Option<T>, String> {
    let guard = state
        .search_index
        .lock()
        .map_err(|_| "搜索索引状态锁获取失败".to_string())?;

    match guard.as_ref() {
        Some(search_index) => callback(search_index).map(Some),
        None => Ok(None),
    }
}

fn needs_rebuild(workspace_path: &Path, relative_path: &str) -> bool {
    if relative_path.trim().is_empty() {
        return true;
    }

    let absolute_path = workspace_path.join(relative_path);
    if absolute_path.is_dir() {
        return true;
    }

    let parent = absolute_path.parent().map(Path::to_path_buf).unwrap_or_else(|| workspace_path.to_path_buf());
    !parent.starts_with(workspace_path)
}

#[cfg(test)]
mod tests {
    use super::needs_rebuild;
    use std::path::PathBuf;

    #[test]
    fn needs_rebuild_for_blank_path() {
        assert!(needs_rebuild(&PathBuf::from("/tmp/workspace"), ""));
    }

    #[test]
    fn does_not_rebuild_for_regular_file_path() {
        assert!(!needs_rebuild(
            &PathBuf::from("/tmp/workspace"),
            "Inbox/Quick Note.md",
        ));
    }
}

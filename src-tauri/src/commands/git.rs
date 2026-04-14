use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Emitter, State};

use crate::git;
use crate::git::sync::{GitSyncController, GitSyncPhase, GitSyncStatus};
use crate::state::AppState;

#[tauri::command]
pub fn git_init_repo(path: String) -> Result<(), String> {
    git::init_repo(&path).map_err(to_command_error)
}

#[tauri::command]
pub fn git_clone_repo(url: String, path: String) -> Result<(), String> {
    git::clone_repo(&url, &path).map_err(to_command_error)
}

#[tauri::command]
pub fn git_get_status(path: String) -> Result<Vec<git::FileStatus>, String> {
    git::get_status(&path).map_err(to_command_error)
}

#[tauri::command]
pub fn git_commit(path: String, message: String) -> Result<String, String> {
    git::stage_all(&path).map_err(to_command_error)?;
    git::commit(&path, &message).map_err(to_command_error)
}

#[tauri::command]
pub fn git_push(path: String) -> Result<(), String> {
    git::push(&path).map_err(to_command_error)
}

#[tauri::command]
pub fn git_pull(path: String) -> Result<(), String> {
    git::pull(&path).map_err(to_command_error)
}

#[tauri::command]
pub fn git_get_log(
    path: String,
    file_path: Option<String>,
    limit: usize,
) -> Result<Vec<git::CommitInfo>, String> {
    git::get_log(&path, file_path.as_deref(), normalize_log_limit(limit)).map_err(to_command_error)
}

#[tauri::command]
pub fn git_get_diff(path: String, commit_hash: String) -> Result<String, String> {
    git::get_diff(&path, &commit_hash).map_err(to_command_error)
}

#[tauri::command]
pub fn git_start_sync(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    interval_secs: u64,
) -> Result<(), String> {
    let workspace_path = current_workspace_path(&state)?;
    let controller = GitSyncController::start(app_handle, workspace_path, interval_secs);

    let previous = {
        let mut guard = state
            .git_sync
            .lock()
            .map_err(|_| "Git 同步状态锁获取失败".to_string())?;
        guard.replace(controller)
    };

    if let Some(previous) = previous {
        previous.stop();
    }

    Ok(())
}

#[tauri::command]
pub fn git_stop_sync(app_handle: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let (workspace_path, controller) = {
        let mut guard = state
            .git_sync
            .lock()
            .map_err(|_| "Git 同步状态锁获取失败".to_string())?;
        let workspace_path = guard
            .as_ref()
            .map(|controller| controller.workspace_path().to_path_buf())
            .or_else(|| state.workspace_path.lock().ok().and_then(|path| path.clone()));
        (workspace_path, guard.take())
    };

    if let Some(controller) = controller {
        controller.stop();
    }

    if let Some(workspace_path) = workspace_path {
        let _ = app_handle.emit("git-sync-status", stopped_status(workspace_path));
    }

    Ok(())
}

#[tauri::command]
pub fn git_force_sync(state: State<'_, AppState>) -> Result<(), String> {
    let guard = state
        .git_sync
        .lock()
        .map_err(|_| "Git 同步状态锁获取失败".to_string())?;

    let controller = guard
        .as_ref()
        .ok_or_else(|| "Git 自动同步尚未启动".to_string())?;
    controller.force_sync()
}

fn current_workspace_path(state: &State<'_, AppState>) -> Result<PathBuf, String> {
    let workspace_path = state
        .workspace_path
        .lock()
        .map_err(|_| "工作区状态锁获取失败".to_string())?
        .clone();

    workspace_path_or_error(workspace_path)
}

fn workspace_path_or_error(workspace_path: Option<PathBuf>) -> Result<PathBuf, String> {
    workspace_path.ok_or_else(|| "尚未打开工作区".to_string())
}

fn normalize_log_limit(limit: usize) -> usize {
    limit.max(1)
}

fn stopped_status(workspace_path: PathBuf) -> GitSyncStatus {
    GitSyncStatus {
        state: GitSyncPhase::NotInitialized,
        workspace_path: workspace_path.to_string_lossy().into_owned(),
        detail: Some("自动同步已停止".to_string()),
        updated_at: unix_timestamp_now(),
    }
}

fn unix_timestamp_now() -> Option<u64> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .ok()
        .map(|duration| duration.as_secs())
}

fn to_command_error(error: git::GitError) -> String {
    error.message().to_string()
}

#[cfg(test)]
mod tests {
    use super::{normalize_log_limit, stopped_status, workspace_path_or_error};
    use crate::git::sync::GitSyncPhase;
    use std::path::PathBuf;

    #[test]
    fn normalize_log_limit_never_returns_zero() {
        assert_eq!(normalize_log_limit(0), 1);
        assert_eq!(normalize_log_limit(25), 25);
    }

    #[test]
    fn workspace_path_or_error_requires_open_workspace() {
        let error = workspace_path_or_error(None).unwrap_err();
        assert!(error.contains("工作区"));
    }

    #[test]
    fn stopped_status_marks_not_initialized() {
        let status = stopped_status(PathBuf::from("/tmp/workspace"));
        assert_eq!(status.state, GitSyncPhase::NotInitialized);
        assert!(status.detail.unwrap().contains("停止"));
    }
}

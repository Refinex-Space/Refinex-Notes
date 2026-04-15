use std::path::PathBuf;
use std::sync::Mutex;

use notify::RecommendedWatcher;
use rusqlite::Connection;
use tauri::AppHandle;

use crate::git::sync::GitSyncController;
use crate::search::WorkspaceSearchIndex;

#[allow(dead_code)]
pub struct AppState {
    pub app_handle: AppHandle,
    pub github_client_id: String,
    pub pending_device_code: Mutex<Option<String>>,
    pub db: Mutex<Connection>,
    pub workspace_path: Mutex<Option<PathBuf>>,
    pub watcher: Mutex<Option<RecommendedWatcher>>,
    pub git_sync: Mutex<Option<GitSyncController>>,
    pub search_index: Mutex<Option<WorkspaceSearchIndex>>,
}

impl AppState {
    pub fn new(app_handle: AppHandle, github_client_id: String, db: Connection) -> Self {
        Self {
            app_handle,
            github_client_id,
            pending_device_code: Mutex::new(None),
            db: Mutex::new(db),
            workspace_path: Mutex::new(None),
            watcher: Mutex::new(None),
            git_sync: Mutex::new(None),
            search_index: Mutex::new(None),
        }
    }
}

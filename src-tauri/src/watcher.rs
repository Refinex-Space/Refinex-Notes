use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::time::Duration;

use notify::{RecursiveMode, Watcher};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Runtime};

const DEBOUNCE_WINDOW: Duration = Duration::from_millis(500);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FilesChangedPayload {
    pub paths: Vec<String>,
}

pub fn create_workspace_watcher<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_path: PathBuf,
) -> Result<notify::RecommendedWatcher, String> {
    let watched_root = workspace_path.clone();
    let event_root = workspace_path;
    let (sender, receiver) = mpsc::channel();

    let mut watcher = notify::recommended_watcher(move |result| {
        let _ = sender.send(result);
    })
    .map_err(|error| format!("创建文件监听器失败: {error}"))?;

    watcher
        .watch(&watched_root, RecursiveMode::Recursive)
        .map_err(|error| format!("启动工作区监听失败: {error}"))?;

    std::thread::spawn(move || {
        debounce_and_emit(app_handle, event_root, receiver);
    });

    Ok(watcher)
}

fn debounce_and_emit<R: Runtime>(
    app_handle: AppHandle<R>,
    workspace_path: PathBuf,
    receiver: mpsc::Receiver<notify::Result<notify::Event>>,
) {
    let mut pending_paths = BTreeSet::new();

    loop {
        match receiver.recv_timeout(DEBOUNCE_WINDOW) {
            Ok(Ok(event)) => {
                for path in event.paths {
                    if let Some(relative_path) = to_workspace_relative_path(&workspace_path, &path) {
                        pending_paths.insert(relative_path);
                    }
                }
            }
            Ok(Err(error)) => {
                eprintln!("workspace watcher error: {error}");
            }
            Err(RecvTimeoutError::Timeout) => {
                flush_pending(&app_handle, &mut pending_paths);
            }
            Err(RecvTimeoutError::Disconnected) => {
                flush_pending(&app_handle, &mut pending_paths);
                break;
            }
        }
    }
}

fn flush_pending<R: Runtime>(app_handle: &AppHandle<R>, pending_paths: &mut BTreeSet<String>) {
    if pending_paths.is_empty() {
        return;
    }

    let payload = FilesChangedPayload {
        paths: pending_paths.iter().cloned().collect(),
    };
    pending_paths.clear();

    if let Err(error) = app_handle.emit("files-changed", payload) {
        eprintln!("emit files-changed failed: {error}");
    }
}

fn to_workspace_relative_path(workspace_path: &Path, candidate: &Path) -> Option<String> {
    let relative = candidate.strip_prefix(workspace_path).ok()?;
    let value = relative.to_string_lossy().replace('\\', "/");
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

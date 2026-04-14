use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tokio::time::{self, Duration, Instant};

use super::{
    branch_divergence, commit, fetch, get_status, open_repository, pull, push, stage_all,
    GitErrorKind, GitResult, DEFAULT_AUTO_COMMIT_MESSAGE,
};

const SAVE_DEBOUNCE_WINDOW: Duration = Duration::from_secs(30);
const DEFAULT_SYNC_INTERVAL: Duration = Duration::from_secs(60);
const IDLE_TIMER: Duration = Duration::from_secs(365 * 24 * 60 * 60);

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum GitSyncPhase {
    NotInitialized,
    Dirty,
    Committed,
    Fetching,
    Merging,
    Pushing,
    Synced,
    Conflicted,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitSyncStatus {
    pub state: GitSyncPhase,
    pub workspace_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<u64>,
}

#[derive(Debug, Clone, Copy)]
enum SyncTrigger {
    Immediate,
    LocalChange,
}

pub struct GitSyncController {
    workspace_path: PathBuf,
    trigger_tx: mpsc::UnboundedSender<SyncTrigger>,
    task: JoinHandle<()>,
}

impl GitSyncController {
    pub fn start(app_handle: AppHandle, workspace_path: PathBuf, interval_secs: u64) -> Self {
        let (trigger_tx, trigger_rx) = mpsc::unbounded_channel();
        let task = spawn_sync_task(app_handle, workspace_path.clone(), interval_secs, trigger_rx);

        let controller = Self {
            workspace_path,
            trigger_tx,
            task,
        };
        let _ = controller.force_sync();
        controller
    }

    pub fn workspace_path(&self) -> &Path {
        &self.workspace_path
    }

    pub fn notify_local_change(&self) -> Result<(), String> {
        self.trigger_tx
            .send(SyncTrigger::LocalChange)
            .map_err(|_| "同步任务已停止，无法登记本地变更".to_string())
    }

    pub fn force_sync(&self) -> Result<(), String> {
        self.trigger_tx
            .send(SyncTrigger::Immediate)
            .map_err(|_| "同步任务已停止，无法触发立即同步".to_string())
    }

    pub fn stop(self) {
        self.task.abort();
    }
}

pub(crate) fn run_sync_cycle<F>(workspace_path: &str, emit: &mut F) -> GitResult<()>
where
    F: FnMut(GitSyncStatus),
{
    let repo = match open_repository(workspace_path) {
        Ok(repo) => repo,
        Err(error) => {
            emit(sync_status(
                GitSyncPhase::NotInitialized,
                workspace_path,
                Some(error.message().to_string()),
            ));
            return Ok(());
        }
    };

    if repo.find_remote("origin").is_err() {
        emit(sync_status(
            GitSyncPhase::NotInitialized,
            workspace_path,
            Some("当前仓库尚未配置 remote origin".to_string()),
        ));
        return Ok(());
    }
    drop(repo);

    let local_status = get_status(workspace_path)?;
    if !local_status.is_empty() {
        emit(sync_status(GitSyncPhase::Dirty, workspace_path, None));
    }

    emit(sync_status(GitSyncPhase::Fetching, workspace_path, None));
    fetch(workspace_path)?;

    let (_ahead_before, behind_before) = sync_branch_divergence(workspace_path)?;
    if behind_before > 0 {
        emit(sync_status(GitSyncPhase::Merging, workspace_path, None));
        if let Err(error) = pull(workspace_path) {
            if error.kind() == GitErrorKind::Conflict {
                emit(sync_status(
                    GitSyncPhase::Conflicted,
                    workspace_path,
                    Some(error.message().to_string()),
                ));
            }
            return Err(error);
        }
    }

    let local_status_after_pull = get_status(workspace_path)?;
    if !local_status_after_pull.is_empty() {
        stage_all(workspace_path)?;
        let commit_hash = commit(workspace_path, DEFAULT_AUTO_COMMIT_MESSAGE)?;
        emit(sync_status(
            GitSyncPhase::Committed,
            workspace_path,
            Some(commit_hash),
        ));
    }

    let (ahead_after, _) = sync_branch_divergence(workspace_path)?;
    if ahead_after > 0 {
        emit(sync_status(GitSyncPhase::Pushing, workspace_path, None));
        push(workspace_path)?;
    }

    emit(sync_status(GitSyncPhase::Synced, workspace_path, None));
    Ok(())
}

fn spawn_sync_task(
    app_handle: AppHandle,
    workspace_path: PathBuf,
    interval_secs: u64,
    mut trigger_rx: mpsc::UnboundedReceiver<SyncTrigger>,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        let mut interval = time::interval(sync_interval(interval_secs));
        interval.tick().await;

        let sleep = time::sleep(IDLE_TIMER);
        tokio::pin!(sleep);
        let mut debounce_active = false;

        loop {
            tokio::select! {
                _ = interval.tick() => {
                    let path_string = workspace_path.to_string_lossy().into_owned();
                    let mut emitter = |status: GitSyncStatus| emit_status(&app_handle, status);
                    let _ = run_sync_cycle(&path_string, &mut emitter);
                }
                maybe_trigger = trigger_rx.recv() => match maybe_trigger {
                    Some(SyncTrigger::Immediate) => {
                        debounce_active = false;
                        sleep.as_mut().reset(Instant::now() + IDLE_TIMER);
                        let path_string = workspace_path.to_string_lossy().into_owned();
                        let mut emitter = |status: GitSyncStatus| emit_status(&app_handle, status);
                        let _ = run_sync_cycle(&path_string, &mut emitter);
                    }
                    Some(SyncTrigger::LocalChange) => {
                        emit_status(
                            &app_handle,
                            sync_status(
                                GitSyncPhase::Dirty,
                                &workspace_path.to_string_lossy(),
                                Some("检测到本地保存，等待防抖同步".to_string()),
                            ),
                        );
                        debounce_active = true;
                        sleep.as_mut().reset(Instant::now() + SAVE_DEBOUNCE_WINDOW);
                    }
                    None => break,
                },
                _ = &mut sleep, if debounce_active => {
                    debounce_active = false;
                    sleep.as_mut().reset(Instant::now() + IDLE_TIMER);
                    let path_string = workspace_path.to_string_lossy().into_owned();
                    let mut emitter = |status: GitSyncStatus| emit_status(&app_handle, status);
                    let _ = run_sync_cycle(&path_string, &mut emitter);
                }
            }
        }
    })
}

fn emit_status(app_handle: &AppHandle, status: GitSyncStatus) {
    if let Err(error) = app_handle.emit("git-sync-status", status) {
        eprintln!("emit git-sync-status failed: {error}");
    }
}

fn sync_status(
    state: GitSyncPhase,
    workspace_path: &str,
    detail: Option<String>,
) -> GitSyncStatus {
    GitSyncStatus {
        state,
        workspace_path: workspace_path.to_string(),
        detail,
        updated_at: unix_timestamp_now(),
    }
}

fn sync_branch_divergence(workspace_path: &str) -> GitResult<(usize, usize)> {
    match branch_divergence(workspace_path) {
        Ok(value) => Ok(value),
        Err(error) if error.kind() == GitErrorKind::NotFound => {
            let repo = open_repository(workspace_path)?;
            let local_has_head = repo.head().ok().and_then(|reference| reference.target()).is_some();
            Ok((usize::from(local_has_head), 0))
        }
        Err(error) => Err(error),
    }
}

fn sync_interval(interval_secs: u64) -> Duration {
    if interval_secs == 0 {
        DEFAULT_SYNC_INTERVAL
    } else {
        Duration::from_secs(interval_secs)
    }
}

fn unix_timestamp_now() -> Option<u64> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .ok()
        .map(|duration| duration.as_secs())
}

#[cfg(test)]
mod tests {
    use super::{run_sync_cycle, GitSyncPhase};
    use crate::git::{clone_repo, commit, init_repo, push, stage_all, GitErrorKind};
    use git2::{Repository, RepositoryInitOptions};
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn sync_cycle_commits_and_pushes_dirty_workspace() {
        let remote_dir = TempDir::new_bare("sync-remote");
        let local_dir = TempDir::new("sync-local");

        init_repo(local_dir.path_str()).unwrap();
        connect_origin(local_dir.path(), remote_dir.path());
        write_file(local_dir.path(), "note.md", "auto sync\n");

        let mut statuses = Vec::new();
        run_sync_cycle(local_dir.path_str(), &mut |status| statuses.push(status)).unwrap();

        assert!(statuses.iter().any(|status| status.state == GitSyncPhase::Dirty));
        assert!(statuses.iter().any(|status| status.state == GitSyncPhase::Fetching));
        assert!(statuses.iter().any(|status| status.state == GitSyncPhase::Committed));
        assert!(statuses.iter().any(|status| status.state == GitSyncPhase::Pushing));
        assert_eq!(statuses.last().unwrap().state, GitSyncPhase::Synced);

        let verify_dir = TempDir::new("sync-verify");
        clone_repo(remote_dir.path_str(), verify_dir.path_str()).unwrap();
        assert_eq!(fs::read_to_string(verify_dir.path().join("note.md")).unwrap(), "auto sync\n");
    }

    #[test]
    fn sync_cycle_pulls_remote_changes() {
        let remote_dir = TempDir::new_bare("pull-remote");
        let seed_dir = TempDir::new("pull-seed");
        let local_dir = TempDir::new("pull-local");
        let peer_dir = TempDir::new("pull-peer");

        init_repo(seed_dir.path_str()).unwrap();
        connect_origin(seed_dir.path(), remote_dir.path());
        write_file(seed_dir.path(), "base.md", "base\n");
        stage_all(seed_dir.path_str()).unwrap();
        commit(seed_dir.path_str(), "seed").unwrap();
        push(seed_dir.path_str()).unwrap();

        clone_repo(remote_dir.path_str(), local_dir.path_str()).unwrap();
        clone_repo(remote_dir.path_str(), peer_dir.path_str()).unwrap();

        write_file(peer_dir.path(), "remote.md", "from remote\n");
        stage_all(peer_dir.path_str()).unwrap();
        commit(peer_dir.path_str(), "peer").unwrap();
        push(peer_dir.path_str()).unwrap();

        let mut statuses = Vec::new();
        run_sync_cycle(local_dir.path_str(), &mut |status| statuses.push(status)).unwrap();

        assert!(statuses.iter().any(|status| status.state == GitSyncPhase::Fetching));
        assert!(statuses.iter().any(|status| status.state == GitSyncPhase::Merging));
        assert_eq!(statuses.last().unwrap().state, GitSyncPhase::Synced);
        assert_eq!(fs::read_to_string(local_dir.path().join("remote.md")).unwrap(), "from remote\n");
    }

    #[test]
    fn sync_cycle_reports_conflicted_when_rebase_fails() {
        let remote_dir = TempDir::new_bare("conflicted-remote");
        let seed_dir = TempDir::new("conflicted-seed");
        let local_dir = TempDir::new("conflicted-local");
        let peer_dir = TempDir::new("conflicted-peer");

        init_repo(seed_dir.path_str()).unwrap();
        connect_origin(seed_dir.path(), remote_dir.path());
        write_file(seed_dir.path(), "note.md", "base line\n");
        stage_all(seed_dir.path_str()).unwrap();
        commit(seed_dir.path_str(), "seed").unwrap();
        push(seed_dir.path_str()).unwrap();

        clone_repo(remote_dir.path_str(), local_dir.path_str()).unwrap();
        clone_repo(remote_dir.path_str(), peer_dir.path_str()).unwrap();

        write_file(local_dir.path(), "note.md", "local line\n");
        stage_all(local_dir.path_str()).unwrap();
        commit(local_dir.path_str(), "local").unwrap();

        write_file(peer_dir.path(), "note.md", "remote line\n");
        stage_all(peer_dir.path_str()).unwrap();
        commit(peer_dir.path_str(), "remote").unwrap();
        push(peer_dir.path_str()).unwrap();

        let mut statuses = Vec::new();
        let error = run_sync_cycle(local_dir.path_str(), &mut |status| statuses.push(status)).unwrap_err();

        assert_eq!(error.kind(), GitErrorKind::Conflict);
        assert!(statuses.iter().any(|status| status.state == GitSyncPhase::Merging));
        assert_eq!(statuses.last().unwrap().state, GitSyncPhase::Conflicted);
    }

    fn connect_origin(repo_path: &Path, remote_path: &Path) {
        let repo = Repository::open(repo_path).unwrap();
        repo.remote("origin", remote_path.to_str().unwrap()).unwrap();
    }

    fn write_file(root: &Path, relative_path: &str, content: &str) {
        let target = root.join(relative_path);
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(target, content).unwrap();
    }

    struct TempDir {
        path: PathBuf,
    }

    impl TempDir {
        fn new(label: &str) -> Self {
            let path = unique_path(label);
            fs::create_dir_all(&path).unwrap();
            Self { path }
        }

        fn new_bare(label: &str) -> Self {
            let path = unique_path(label);
            let mut options = RepositoryInitOptions::new();
            options.bare(true).initial_head("main");
            Repository::init_opts(&path, &options).unwrap();
            Self { path }
        }

        fn path(&self) -> &Path {
            &self.path
        }

        fn path_str(&self) -> &str {
            self.path.to_str().unwrap()
        }
    }

    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    fn unique_path(label: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("refinex-notes-sync-{label}-{suffix}"))
    }
}

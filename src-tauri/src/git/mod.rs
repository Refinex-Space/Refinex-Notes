pub mod auth;
pub mod sync;

use std::fs;
use std::fmt;
use std::path::{Path, PathBuf};

use git2::build::RepoBuilder;
use git2::{
    BranchType, DiffFormat, DiffOptions, ErrorCode, FetchOptions, IndexAddOption, Oid,
    PushOptions, Repository, RepositoryInitOptions, Signature, Sort, Status, StatusOptions,
    StatusShow,
};
use serde::Serialize;

pub const DEFAULT_AUTO_COMMIT_MESSAGE: &str = "auto-sync";

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum FileStatusKind {
    Untracked,
    Added,
    Modified,
    Deleted,
    Renamed,
    Typechange,
    Conflicted,
    Ignored,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FileStatus {
    pub path: String,
    pub status: FileStatusKind,
    pub staged: bool,
    pub unstaged: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CommitInfo {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub date: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GitErrorKind {
    Authentication,
    Conflict,
    InvalidState,
    NoChanges,
    NotFound,
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GitError {
    kind: GitErrorKind,
    message: String,
}

impl GitError {
    pub fn new(kind: GitErrorKind, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
        }
    }

    pub fn conflict(message: impl Into<String>) -> Self {
        Self::new(GitErrorKind::Conflict, message)
    }

    pub fn no_changes(message: impl Into<String>) -> Self {
        Self::new(GitErrorKind::NoChanges, message)
    }

    pub fn invalid_state(message: impl Into<String>) -> Self {
        Self::new(GitErrorKind::InvalidState, message)
    }

    pub fn kind(&self) -> GitErrorKind {
        self.kind
    }

    pub fn message(&self) -> &str {
        &self.message
    }
}

impl fmt::Display for GitError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl std::error::Error for GitError {}

pub type GitResult<T> = Result<T, GitError>;

pub(crate) fn map_git2_error(error: git2::Error) -> GitError {
    let kind = match error.code() {
        ErrorCode::Auth | ErrorCode::Certificate => GitErrorKind::Authentication,
        ErrorCode::Conflict => GitErrorKind::Conflict,
        ErrorCode::NotFound | ErrorCode::UnbornBranch => GitErrorKind::NotFound,
        _ => GitErrorKind::Other,
    };

    GitError::new(kind, error.message())
}

pub(crate) fn open_repository(path: &str) -> GitResult<Repository> {
    Repository::open(path).map_err(map_git2_error)
}

pub(crate) fn repository_signature(repo: &Repository) -> GitResult<Signature<'static>> {
    repo.signature()
        .or_else(|_| Signature::now("Refinex Notes", "refinex-notes@local"))
        .map_err(map_git2_error)
}

pub(crate) fn simplify_status(status: Status) -> Option<FileStatusKind> {
    if status.is_conflicted() {
        return Some(FileStatusKind::Conflicted);
    }
    if status.is_wt_new() {
        return Some(FileStatusKind::Untracked);
    }
    if status.is_index_new() {
        return Some(FileStatusKind::Added);
    }
    if status.is_wt_deleted() || status.is_index_deleted() {
        return Some(FileStatusKind::Deleted);
    }
    if status.is_wt_renamed() || status.is_index_renamed() {
        return Some(FileStatusKind::Renamed);
    }
    if status.is_wt_typechange() || status.is_index_typechange() {
        return Some(FileStatusKind::Typechange);
    }
    if status.is_ignored() {
        return Some(FileStatusKind::Ignored);
    }
    if status.is_wt_modified() || status.is_index_modified() {
        return Some(FileStatusKind::Modified);
    }

    None
}

pub(crate) fn classify_status_presence(status: Status) -> (bool, bool) {
    let staged = status.is_index_new()
        || status.is_index_modified()
        || status.is_index_deleted()
        || status.is_index_renamed()
        || status.is_index_typechange();

    let unstaged = status.is_wt_new()
        || status.is_wt_modified()
        || status.is_wt_deleted()
        || status.is_wt_renamed()
        || status.is_wt_typechange()
        || status.is_conflicted();

    (staged, unstaged)
}

pub fn init_repo(path: &str) -> GitResult<()> {
    let workspace_path = PathBuf::from(path);
    fs::create_dir_all(&workspace_path)
        .map_err(|error| GitError::new(GitErrorKind::Other, format!("创建仓库目录失败: {error}")))?;

    let mut options = RepositoryInitOptions::new();
    options.initial_head("main");
    Repository::init_opts(&workspace_path, &options)
        .map(|_| ())
        .map_err(map_git2_error)
}

pub fn clone_repo(url: &str, path: &str) -> GitResult<()> {
    let mut fetch_options = FetchOptions::new();
    fetch_options.remote_callbacks(auth::remote_callbacks().map_err(|message| {
        GitError::new(GitErrorKind::Authentication, message)
    })?);

    RepoBuilder::new()
        .fetch_options(fetch_options)
        .clone(url, Path::new(path))
        .map(|_| ())
        .map_err(map_git2_error)
}

pub fn get_status(path: &str) -> GitResult<Vec<FileStatus>> {
    let repo = open_repository(path)?;
    let mut options = StatusOptions::new();
    options
        .show(StatusShow::IndexAndWorkdir)
        .include_untracked(true)
        .recurse_untracked_dirs(true)
        .renames_head_to_index(true)
        .renames_index_to_workdir(true);

    let statuses = repo.statuses(Some(&mut options)).map_err(map_git2_error)?;
    let mut items = Vec::new();

    for entry in statuses.iter() {
        if let (Some(relative_path), Some(status)) = (entry.path(), simplify_status(entry.status())) {
            let (staged, unstaged) = classify_status_presence(entry.status());
            items.push(FileStatus {
                path: relative_path.replace('\\', "/"),
                status,
                staged,
                unstaged,
            });
        }
    }

    items.sort_by(|left, right| left.path.cmp(&right.path));
    Ok(items)
}

pub fn stage_all(path: &str) -> GitResult<()> {
    let repo = open_repository(path)?;
    let mut index = repo.index().map_err(map_git2_error)?;

    index
        .add_all(["*"], IndexAddOption::DEFAULT, None)
        .map_err(map_git2_error)?;
    index.update_all(["*"], None).map_err(map_git2_error)?;
    index.write().map_err(map_git2_error)
}

pub fn commit(path: &str, message: &str) -> GitResult<String> {
    if message.trim().is_empty() {
        return Err(GitError::invalid_state("commit message 不能为空"));
    }

    let repo = open_repository(path)?;
    if get_status(path)?.is_empty() {
        return Err(GitError::no_changes("当前没有可提交的变更"));
    }

    let signature = repository_signature(&repo)?;
    let mut index = repo.index().map_err(map_git2_error)?;
    let tree_id = index.write_tree().map_err(map_git2_error)?;
    index.write().map_err(map_git2_error)?;
    let tree = repo.find_tree(tree_id).map_err(map_git2_error)?;

    let head = repo.head();
    let commit_oid = match head {
        Ok(reference) => {
            let parent = reference.peel_to_commit().map_err(map_git2_error)?;
            repo.commit(Some("HEAD"), &signature, &signature, message, &tree, &[&parent])
                .map_err(map_git2_error)?
        }
        Err(error) if matches!(error.code(), ErrorCode::UnbornBranch | ErrorCode::NotFound) => repo
            .commit(Some("HEAD"), &signature, &signature, message, &tree, &[])
            .map_err(map_git2_error)?,
        Err(error) => return Err(map_git2_error(error)),
    };

    Ok(commit_oid.to_string())
}

pub fn fetch(path: &str) -> GitResult<()> {
    let repo = open_repository(path)?;
    let mut remote = repo.find_remote("origin").map_err(map_git2_error)?;
    let mut fetch_options = FetchOptions::new();
    fetch_options.remote_callbacks(auth::remote_callbacks().map_err(|message| {
        GitError::new(GitErrorKind::Authentication, message)
    })?);

    remote
        .fetch(&[] as &[&str], Some(&mut fetch_options), None)
        .map_err(map_git2_error)
}

pub fn push(path: &str) -> GitResult<()> {
    let repo = open_repository(path)?;
    let branch_name = current_branch_name(&repo)?;
    let mut remote = repo.find_remote("origin").map_err(map_git2_error)?;
    let mut push_options = PushOptions::new();
    push_options.remote_callbacks(auth::remote_callbacks().map_err(|message| {
        GitError::new(GitErrorKind::Authentication, message)
    })?);

    let refspec = format!("refs/heads/{branch_name}:refs/heads/{branch_name}");
    remote
        .push(&[refspec.as_str()], Some(&mut push_options))
        .map_err(map_git2_error)?;

    if let Ok(mut branch) = repo.find_branch(&branch_name, BranchType::Local) {
        let _ = branch.set_upstream(Some(&format!("origin/{branch_name}")));
    }

    Ok(())
}

pub fn pull(path: &str) -> GitResult<()> {
    let repo = open_repository(path)?;
    let branch_name = current_branch_name(&repo)?;

    fetch(path)?;

    let remote_ref_name = format!("refs/remotes/origin/{branch_name}");
    let remote_reference = repo.find_reference(&remote_ref_name).map_err(map_git2_error)?;
    let remote_commit = repo
        .reference_to_annotated_commit(&remote_reference)
        .map_err(map_git2_error)?;

    let local_reference = repo.head().map_err(map_git2_error)?;
    let local_commit = repo
        .reference_to_annotated_commit(&local_reference)
        .map_err(map_git2_error)?;

    let (analysis, _) = repo
        .merge_analysis(&[&remote_commit])
        .map_err(map_git2_error)?;
    if analysis.is_up_to_date() {
        return Ok(());
    }

    if let Ok(mut branch) = repo.find_branch(&branch_name, BranchType::Local) {
        let _ = branch.set_upstream(Some(&format!("origin/{branch_name}")));
    }

    let signature = repository_signature(&repo)?;
    let mut rebase = repo
        .rebase(Some(&local_commit), Some(&remote_commit), None, None)
        .map_err(map_git2_error)?;

    while let Some(operation) = rebase.next() {
        operation.map_err(map_git2_error)?;
        let index = repo.index().map_err(map_git2_error)?;
        if index.has_conflicts() {
            rebase.abort().map_err(map_git2_error)?;
            return Err(GitError::conflict("pull --rebase 检测到冲突"));
        }
        rebase
            .commit(None, &signature, None)
            .map_err(map_git2_error)?;
    }

    rebase.finish(Some(&signature)).map_err(map_git2_error)?;
    Ok(())
}

pub fn get_log(path: &str, file_path: Option<&str>, limit: usize) -> GitResult<Vec<CommitInfo>> {
    let repo = open_repository(path)?;
    if limit == 0 {
        return Ok(Vec::new());
    }

    let mut revwalk = repo.revwalk().map_err(map_git2_error)?;
    revwalk.push_head().map_err(map_git2_error)?;
    revwalk.set_sorting(Sort::TIME).map_err(map_git2_error)?;

    let mut commits = Vec::new();
    for oid in revwalk {
        let oid = oid.map_err(map_git2_error)?;
        let commit = repo.find_commit(oid).map_err(map_git2_error)?;
        if let Some(target_path) = file_path {
            if !commit_touches_path(&repo, &commit.id(), target_path)? {
                continue;
            }
        }

        commits.push(CommitInfo {
            hash: commit.id().to_string(),
            message: commit.summary().unwrap_or_default().to_string(),
            author: commit
                .author()
                .name()
                .or(commit.author().email())
                .unwrap_or("unknown")
                .to_string(),
            date: commit.time().seconds(),
        });

        if commits.len() >= limit {
            break;
        }
    }

    Ok(commits)
}

pub fn get_diff(path: &str, commit_hash: &str) -> GitResult<String> {
    let repo = open_repository(path)?;
    let oid = Oid::from_str(commit_hash)
        .map_err(|error| GitError::new(GitErrorKind::NotFound, format!("无效 commit hash: {error}")))?;
    let commit = repo.find_commit(oid).map_err(map_git2_error)?;
    let current_tree = commit.tree().map_err(map_git2_error)?;
    let parent_tree = if commit.parent_count() > 0 {
        Some(commit.parent(0).map_err(map_git2_error)?.tree().map_err(map_git2_error)?)
    } else {
        None
    };

    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&current_tree), None)
        .map_err(map_git2_error)?;

    let mut patch = String::new();
    diff.print(DiffFormat::Patch, |_delta, _hunk, line| {
        match line.origin() {
            ' ' | '+' | '-' => patch.push(line.origin()),
            _ => {}
        }
        patch.push_str(&String::from_utf8_lossy(line.content()));
        true
    })
    .map_err(map_git2_error)?;

    Ok(patch)
}

pub(crate) fn branch_divergence(path: &str) -> GitResult<(usize, usize)> {
    let repo = open_repository(path)?;
    let branch_name = current_branch_name(&repo)?;
    let local_oid = repo
        .head()
        .map_err(map_git2_error)?
        .target()
        .ok_or_else(|| GitError::invalid_state("当前 HEAD 没有有效 commit"))?;
    let remote_reference = repo
        .find_reference(&format!("refs/remotes/origin/{branch_name}"))
        .map_err(map_git2_error)?;
    let remote_oid = remote_reference
        .target()
        .ok_or_else(|| GitError::invalid_state("远端分支没有有效 commit"))?;

    repo.graph_ahead_behind(local_oid, remote_oid)
        .map_err(map_git2_error)
}

fn current_branch_name(repo: &Repository) -> GitResult<String> {
    match repo.head() {
        Ok(reference) => reference
            .shorthand()
            .map(ToString::to_string)
            .ok_or_else(|| GitError::invalid_state("无法解析当前分支名称")),
        Err(error) if matches!(error.code(), ErrorCode::UnbornBranch | ErrorCode::NotFound) => {
            let head_reference = repo.find_reference("HEAD").map_err(map_git2_error)?;
            head_reference
                .symbolic_target()
                .and_then(|value| value.strip_prefix("refs/heads/"))
                .map(ToString::to_string)
                .ok_or_else(|| GitError::invalid_state("当前仓库尚未初始化分支"))
        }
        Err(error) => Err(map_git2_error(error)),
    }
}

fn commit_touches_path(repo: &Repository, oid: &Oid, file_path: &str) -> GitResult<bool> {
    let commit = repo.find_commit(*oid).map_err(map_git2_error)?;
    let current_tree = commit.tree().map_err(map_git2_error)?;
    let parent_tree = if commit.parent_count() > 0 {
        Some(commit.parent(0).map_err(map_git2_error)?.tree().map_err(map_git2_error)?)
    } else {
        None
    };

    let mut diff_options = DiffOptions::new();
    diff_options.pathspec(file_path);
    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&current_tree), Some(&mut diff_options))
        .map_err(map_git2_error)?;

    Ok(diff.deltas().len() > 0)
}

#[cfg(test)]
mod tests {
    use super::{
        branch_divergence, classify_status_presence, clone_repo, commit, get_diff, get_log,
        get_status, init_repo, pull, push, simplify_status, stage_all, FileStatusKind, GitError,
        GitErrorKind, GitErrorKind as Kind,
    };
    use git2::{Repository, RepositoryInitOptions, Status};
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn simplify_status_prioritizes_conflict() {
        let status = Status::WT_MODIFIED | Status::CONFLICTED;
        assert_eq!(simplify_status(status), Some(FileStatusKind::Conflicted));
    }

    #[test]
    fn simplify_status_maps_untracked_before_added() {
        let status = Status::WT_NEW | Status::INDEX_NEW;
        assert_eq!(simplify_status(status), Some(FileStatusKind::Untracked));
    }

    #[test]
    fn classify_status_presence_tracks_index_and_worktree_sides() {
        let (staged, unstaged) = classify_status_presence(Status::INDEX_MODIFIED);
        assert_eq!((staged, unstaged), (true, false));

        let (staged, unstaged) = classify_status_presence(Status::WT_MODIFIED);
        assert_eq!((staged, unstaged), (false, true));

        let (staged, unstaged) = classify_status_presence(Status::INDEX_MODIFIED | Status::WT_MODIFIED);
        assert_eq!((staged, unstaged), (true, true));
    }

    #[test]
    fn git_error_exposes_kind_and_message() {
        let error = GitError::new(GitErrorKind::InvalidState, "状态异常");
        assert_eq!(error.kind(), GitErrorKind::InvalidState);
        assert_eq!(error.message(), "状态异常");
    }

    #[test]
    fn core_git_ops_cover_status_commit_log_and_diff() {
        let repo_dir = TempDir::new("core");
        init_repo(repo_dir.path_str()).unwrap();
        write_file(repo_dir.path(), "note.md", "hello git\n");

        let statuses = get_status(repo_dir.path_str()).unwrap();
        assert_eq!(statuses.len(), 1);
        assert_eq!(statuses[0].path, "note.md");
        assert_eq!(statuses[0].status, FileStatusKind::Untracked);
        assert!(statuses[0].unstaged);
        assert!(!statuses[0].staged);

        stage_all(repo_dir.path_str()).unwrap();
        let commit_hash = commit(repo_dir.path_str(), "初始提交").unwrap();

        assert!(get_status(repo_dir.path_str()).unwrap().is_empty());

        let history = get_log(repo_dir.path_str(), None, 10).unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].hash, commit_hash);
        assert_eq!(history[0].message, "初始提交");

        let file_history = get_log(repo_dir.path_str(), Some("note.md"), 10).unwrap();
        assert_eq!(file_history.len(), 1);

        let diff = get_diff(repo_dir.path_str(), &commit_hash).unwrap();
        assert!(diff.contains("+hello git"));
    }

    #[test]
    fn clone_fetch_pull_rebase_and_push_work_with_local_bare_remote() {
        let remote_dir = TempDir::new_bare("remote");
        let seed_dir = TempDir::new("seed");
        let clone_a_dir = TempDir::new("clone-a");
        let clone_b_dir = TempDir::new("clone-b");

        init_repo(seed_dir.path_str()).unwrap();
        connect_origin(seed_dir.path(), remote_dir.path());
        write_file(seed_dir.path(), "base.md", "base\n");
        stage_all(seed_dir.path_str()).unwrap();
        commit(seed_dir.path_str(), "seed").unwrap();
        push(seed_dir.path_str()).unwrap();

        clone_repo(remote_dir.path_str(), clone_a_dir.path_str()).unwrap();
        clone_repo(remote_dir.path_str(), clone_b_dir.path_str()).unwrap();

        write_file(clone_a_dir.path(), "local.md", "local change\n");
        stage_all(clone_a_dir.path_str()).unwrap();
        commit(clone_a_dir.path_str(), "local").unwrap();

        write_file(clone_b_dir.path(), "remote.md", "remote change\n");
        stage_all(clone_b_dir.path_str()).unwrap();
        commit(clone_b_dir.path_str(), "remote").unwrap();
        push(clone_b_dir.path_str()).unwrap();

        let (_ahead_before, behind_before) = branch_divergence(clone_a_dir.path_str()).unwrap_or((0, 0));
        assert_eq!(behind_before, 0);

        super::fetch(clone_a_dir.path_str()).unwrap();
        let (_ahead, behind) = branch_divergence(clone_a_dir.path_str()).unwrap();
        assert_eq!(behind, 1);

        pull(clone_a_dir.path_str()).unwrap();
        push(clone_a_dir.path_str()).unwrap();

        let verify_dir = TempDir::new("verify");
        clone_repo(remote_dir.path_str(), verify_dir.path_str()).unwrap();
        assert_eq!(fs::read_to_string(verify_dir.path().join("base.md")).unwrap(), "base\n");
        assert_eq!(fs::read_to_string(verify_dir.path().join("local.md")).unwrap(), "local change\n");
        assert_eq!(fs::read_to_string(verify_dir.path().join("remote.md")).unwrap(), "remote change\n");
    }

    #[test]
    fn pull_reports_conflict_when_rebase_hits_same_hunk() {
        let remote_dir = TempDir::new_bare("conflict-remote");
        let seed_dir = TempDir::new("conflict-seed");
        let local_dir = TempDir::new("conflict-local");
        let peer_dir = TempDir::new("conflict-peer");

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

        let error = pull(local_dir.path_str()).unwrap_err();
        assert_eq!(error.kind(), Kind::Conflict);
        assert!(error.message().contains("冲突"));
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
        std::env::temp_dir().join(format!("refinex-notes-git-{label}-{suffix}"))
    }
}

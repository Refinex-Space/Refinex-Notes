pub mod auth;
pub mod sync;

use std::fmt;

use git2::{ErrorCode, Repository, Signature, Status};
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

#[cfg(test)]
mod tests {
    use super::{simplify_status, FileStatusKind, GitError, GitErrorKind};
    use git2::Status;

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
    fn git_error_exposes_kind_and_message() {
        let error = GitError::new(GitErrorKind::InvalidState, "状态异常");
        assert_eq!(error.kind(), GitErrorKind::InvalidState);
        assert_eq!(error.message(), "状态异常");
    }
}

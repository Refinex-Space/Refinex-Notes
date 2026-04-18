export type GitSyncPhase =
  | "synced"
  | "fetching"
  | "merging"
  | "pushing"
  | "dirty"
  | "committed"
  | "conflicted"
  | "offline"
  | "not-initialized";

export type NativeGitSyncPhase =
  | "not-initialized"
  | "dirty"
  | "committed"
  | "fetching"
  | "merging"
  | "pushing"
  | "synced"
  | "conflicted";

export type GitFileStatus =
  | "clean"
  | "untracked"
  | "added"
  | "modified"
  | "deleted"
  | "renamed"
  | "typechange"
  | "conflicted"
  | "ignored";

export interface GitStatusEntry {
  path: string;
  status: Exclude<GitFileStatus, "clean">;
  staged: boolean;
  unstaged: boolean;
}

export interface GitHistoryEntry {
  hash: string;
  message: string;
  author: string;
  date: number;
}

export interface GitSyncEventPayload {
  state: NativeGitSyncPhase;
  workspacePath: string;
  detail?: string | null;
  updatedAt?: number | null;
}

export interface GitSyncSnapshot {
  phase: GitSyncPhase;
  detail: string | null;
  workspacePath: string | null;
  updatedAt: number | null;
}

export interface GitCommitPreview {
  hash: string;
  title: string;
  subtitle: string;
  relativeTime: string;
}

export interface GitStoreState {
  syncStatus: GitSyncPhase;
  syncDetail: string | null;
  lastSyncTime: number | null;
  changedFiles: GitStatusEntry[];
  repoHistory: GitHistoryEntry[];
  statusByPath: Record<string, GitFileStatus>;
  history: GitHistoryEntry[];
  selectedCommitHash: string | null;
  selectedCommitDiff: string | null;
  isSyncEnabled: boolean;
  isLoadingHistory: boolean;
  isLoadingRepoHistory: boolean;
  isLoadingStatus: boolean;
  isRunningAction: boolean;
  errorMessage: string | null;
  currentBranch: string | null;
}

export interface GitStoreActions {
  hydrateWorkspace: (workspacePath: string | null) => Promise<void>;
  refreshStatus: () => Promise<void>;
  startSync: (intervalSeconds?: number) => Promise<void>;
  stopSync: () => Promise<void>;
  forceSync: () => Promise<void>;
  commit: (message: string) => Promise<void>;
  push: () => Promise<void>;
  pull: () => Promise<void>;
  getHistory: (path: string) => Promise<GitHistoryEntry[]>;
  getRepoHistory: () => Promise<GitHistoryEntry[]>;
  selectHistoryEntry: (hash: string | null) => Promise<void>;
  initRepo: () => Promise<void>;
  cloneRepo: (url: string, targetPath: string) => Promise<void>;
  handleSyncEvent: (payload: GitSyncEventPayload) => void;
  clearError: () => void;
  fetchBranch: () => Promise<void>;
  stageFile: (path: string) => Promise<void>;
  unstageFile: (path: string) => Promise<void>;
  stageAll: () => Promise<void>;
  commitStaged: (message: string) => Promise<void>;
  fetchWorkingDiff: (filePath: string) => Promise<string>;
  fetchCommitFiles: (hash: string) => Promise<GitStatusEntry[]>;
  fetchCommitFileDiff: (hash: string, filePath: string) => Promise<string>;
}

export type GitStore = GitStoreState & GitStoreActions;

export type GitSyncStatus = GitSyncPhase;

export type GitSyncStatus =
  | "synced"
  | "syncing"
  | "dirty"
  | "conflicted"
  | "offline"
  | "not-initialized";

export interface GitHistoryEntry {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitStoreState {
  syncStatus: GitSyncStatus;
  lastSyncTime: Date | null;
  changedFiles: string[];
}

export interface GitStoreActions {
  commit: (message: string) => Promise<void>;
  push: () => Promise<void>;
  pull: () => Promise<void>;
  getHistory: (path: string) => Promise<GitHistoryEntry[]>;
  initRepo: () => Promise<void>;
}

export type GitStore = GitStoreState & GitStoreActions;

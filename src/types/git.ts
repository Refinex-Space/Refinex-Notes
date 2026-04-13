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

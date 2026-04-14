import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import type {
  GitHistoryEntry,
  GitStatusEntry,
  GitSyncEventPayload,
} from "../types/git";

function requireNativeGit() {
  if (!isTauri()) {
    throw new Error("Git 功能仅在 Tauri 桌面环境可用");
  }
}

export const gitService = {
  isNativeAvailable() {
    return isTauri();
  },

  async initRepo(path: string) {
    requireNativeGit();
    await invoke<void>("git_init_repo", { path });
  },

  async cloneRepo(url: string, path: string) {
    requireNativeGit();
    await invoke<void>("git_clone_repo", { url, path });
  },

  async getStatus(path: string) {
    requireNativeGit();
    return invoke<GitStatusEntry[]>("git_get_status", { path });
  },

  async commit(path: string, message: string) {
    requireNativeGit();
    return invoke<string>("git_commit", { path, message });
  },

  async push(path: string) {
    requireNativeGit();
    await invoke<void>("git_push", { path });
  },

  async pull(path: string) {
    requireNativeGit();
    await invoke<void>("git_pull", { path });
  },

  async getHistory(path: string, filePath?: string | null, limit = 24) {
    requireNativeGit();
    return invoke<GitHistoryEntry[]>("git_get_log", {
      path,
      filePath: filePath ?? null,
      limit,
    });
  },

  async getDiff(path: string, commitHash: string) {
    requireNativeGit();
    return invoke<string>("git_get_diff", { path, commitHash });
  },

  async startSync(intervalSeconds = 60) {
    requireNativeGit();
    await invoke<void>("git_start_sync", { intervalSecs: intervalSeconds });
  },

  async stopSync() {
    requireNativeGit();
    await invoke<void>("git_stop_sync");
  },

  async forceSync() {
    requireNativeGit();
    await invoke<void>("git_force_sync");
  },

  async onSyncStatus(handler: (payload: GitSyncEventPayload) => void) {
    if (!isTauri()) {
      return () => {};
    }

    return listen<GitSyncEventPayload>("git-sync-status", (event) => {
      handler(event.payload);
    });
  },
};

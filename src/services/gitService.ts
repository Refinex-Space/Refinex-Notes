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

  async getBranch(path: string) {
    requireNativeGit();
    return invoke<string>("git_get_branch", { path });
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

  async stageAll(path: string) {
    requireNativeGit();
    await invoke<void>("git_stage_all", { path });
  },

  async stageFile(repoPath: string, filePath: string) {
    requireNativeGit();
    await invoke<void>("git_stage_file", { path: repoPath, filePath });
  },

  async unstageFile(repoPath: string, filePath: string) {
    requireNativeGit();
    await invoke<void>("git_unstage_file", { path: repoPath, filePath });
  },

  async getWorkingDiff(repoPath: string, filePath: string) {
    requireNativeGit();
    return invoke<string>("git_get_working_diff", { path: repoPath, filePath });
  },

  async commitStaged(path: string, message: string) {
    requireNativeGit();
    return invoke<string>("git_commit_staged", { path, message });
  },

  async getCommitFiles(repoPath: string, commitHash: string) {
    requireNativeGit();
    return invoke<import("../types/git").GitStatusEntry[]>(
      "git_get_commit_files",
      {
        path: repoPath,
        commitHash,
      },
    );
  },

  async getCommitFileDiff(
    repoPath: string,
    commitHash: string,
    filePath: string,
  ) {
    requireNativeGit();
    return invoke<string>("git_get_commit_file_diff", {
      path: repoPath,
      commitHash,
      filePath,
    });
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

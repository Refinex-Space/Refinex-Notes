import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { gitService } from "../services/gitService";
import type {
  GitFileStatus,
  GitStatusEntry,
  GitStore,
  GitStoreState,
  GitSyncEventPayload,
  GitSyncPhase,
} from "../types/git";
import { useNoteStore } from "./noteStore";

function createInitialState(): GitStoreState {
  return {
    syncStatus: gitService.isNativeAvailable() ? "not-initialized" : "offline",
    syncDetail: null,
    lastSyncTime: null,
    changedFiles: [],
    statusByPath: {},
    history: [],
    repoHistory: [],
    selectedCommitHash: null,
    selectedCommitDiff: null,
    isSyncEnabled: false,
    isLoadingHistory: false,
    isLoadingRepoHistory: false,
    isLoadingStatus: false,
    isRunningAction: false,
    errorMessage: null,
  };
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Git 操作失败";
}

function currentWorkspacePath() {
  return useNoteStore.getState().workspacePath;
}

function currentFilePath() {
  return useNoteStore.getState().currentFile;
}

function ensureWorkspacePath() {
  const workspacePath = currentWorkspacePath();
  if (!workspacePath) {
    throw new Error("尚未打开工作区");
  }
  return workspacePath;
}

function buildStatusByPath(changedFiles: readonly GitStatusEntry[]) {
  return changedFiles.reduce<Record<string, GitFileStatus>>((result, entry) => {
    result[entry.path] = entry.status;
    return result;
  }, {});
}

function detectRepoMissing(message: string) {
  return /repository|repo|尚未初始化|not a git repository|could not find repository/i.test(
    message,
  );
}

function mapNativeSyncPhase(phase: GitSyncEventPayload["state"]): GitSyncPhase {
  switch (phase) {
    case "synced":
      return "synced";
    case "fetching":
      return "fetching";
    case "merging":
      return "merging";
    case "pushing":
      return "pushing";
    case "dirty":
      return "dirty";
    case "committed":
      return "committed";
    case "conflicted":
      return "conflicted";
    default:
      return "not-initialized";
  }
}

function deriveSyncStatus(
  changedFiles: readonly GitStatusEntry[],
  currentStatus: GitSyncPhase,
) {
  if (currentStatus === "fetching" || currentStatus === "merging" || currentStatus === "pushing") {
    return currentStatus;
  }
  if (currentStatus === "conflicted") {
    return "conflicted";
  }
  return changedFiles.length > 0 ? "dirty" : "synced";
}

export function resetGitStore() {
  useGitStore.setState(createInitialState());
}

export const useGitStore = create<GitStore>()(
  immer((set, get) => ({
    ...createInitialState(),

    hydrateWorkspace: async (workspacePath) => {
      if (!workspacePath) {
        set((state) => {
          Object.assign(state, createInitialState());
        });
        return;
      }

      set((state) => {
        state.isSyncEnabled = false;
        state.syncDetail = "自动同步已关闭，请手动提交、推送或拉取。";
      });
      await get().refreshStatus();
    },

    refreshStatus: async () => {
      if (!gitService.isNativeAvailable()) {
        set((state) => {
          state.syncStatus = "offline";
          state.syncDetail = "Git 仅在桌面环境可用";
          state.errorMessage = null;
          state.changedFiles = [];
          state.statusByPath = {};
          state.isLoadingStatus = false;
        });
        return;
      }

      const workspacePath = currentWorkspacePath();
      if (!workspacePath) {
        set((state) => {
          Object.assign(state, createInitialState());
        });
        return;
      }

      set((state) => {
        state.isLoadingStatus = true;
        state.errorMessage = null;
      });

      try {
        const changedFiles = await gitService.getStatus(workspacePath);
        set((state) => {
          state.changedFiles = changedFiles;
          state.statusByPath = buildStatusByPath(changedFiles);
          state.syncStatus = deriveSyncStatus(changedFiles, state.syncStatus);
          state.syncDetail = changedFiles.length
            ? `${changedFiles.length} 个文件有待同步改动`
            : "工作区已同步";
          state.isLoadingStatus = false;
        });
      } catch (error) {
        const message = normalizeError(error);
        set((state) => {
          state.isLoadingStatus = false;
          state.changedFiles = [];
          state.statusByPath = {};
          state.history = [];
          state.repoHistory = [];
          state.selectedCommitHash = null;
          state.selectedCommitDiff = null;
          state.errorMessage = detectRepoMissing(message) ? null : message;
          state.syncStatus = detectRepoMissing(message) ? "not-initialized" : "offline";
          state.syncDetail = detectRepoMissing(message) ? "当前工作区尚未初始化 Git 仓库" : message;
        });
      }
    },

    startSync: async (intervalSeconds = 60) => {
      const workspacePath = ensureWorkspacePath();
      set((state) => {
        state.isRunningAction = true;
        state.errorMessage = null;
      });

      try {
        await gitService.startSync(intervalSeconds);
        set((state) => {
          state.isRunningAction = false;
          state.isSyncEnabled = true;
          state.syncStatus = state.changedFiles.length > 0 ? "dirty" : "synced";
          state.syncDetail = `自动同步已启动（${intervalSeconds} 秒）`;
        });
        await get().refreshStatus();
      } catch (error) {
        set((state) => {
          state.isRunningAction = false;
          state.errorMessage = normalizeError(error);
          state.syncDetail = normalizeError(error);
        });
      }

      void workspacePath;
    },

    stopSync: async () => {
      set((state) => {
        state.isRunningAction = true;
        state.errorMessage = null;
      });

      try {
        await gitService.stopSync();
        set((state) => {
          state.isRunningAction = false;
          state.isSyncEnabled = false;
          state.syncStatus = "not-initialized";
          state.syncDetail = "自动同步已停止";
        });
      } catch (error) {
        set((state) => {
          state.isRunningAction = false;
          state.errorMessage = normalizeError(error);
        });
      }
    },

    forceSync: async () => {
      set((state) => {
        state.isRunningAction = true;
        state.errorMessage = null;
        state.syncStatus = "fetching";
        state.syncDetail = "正在立即同步…";
      });

      try {
        await gitService.forceSync();
        set((state) => {
          state.isRunningAction = false;
          state.isSyncEnabled = true;
        });
      } catch (error) {
        set((state) => {
          state.isRunningAction = false;
          state.errorMessage = normalizeError(error);
          state.syncStatus = "offline";
          state.syncDetail = normalizeError(error);
        });
      }
    },

    commit: async (message) => {
      const workspacePath = ensureWorkspacePath();
      set((state) => {
        state.isRunningAction = true;
        state.errorMessage = null;
      });

      try {
        await gitService.commit(workspacePath, message);
        set((state) => {
          state.isRunningAction = false;
          state.syncStatus = "committed";
          state.syncDetail = "已创建新的提交";
        });
        await get().refreshStatus();
      } catch (error) {
        set((state) => {
          state.isRunningAction = false;
          state.errorMessage = normalizeError(error);
        });
      }
    },

    push: async () => {
      const workspacePath = ensureWorkspacePath();
      set((state) => {
        state.isRunningAction = true;
        state.errorMessage = null;
        state.syncStatus = "pushing";
      });

      try {
        await gitService.push(workspacePath);
        set((state) => {
          state.isRunningAction = false;
          state.syncDetail = "已推送到 origin";
        });
        await get().refreshStatus();
      } catch (error) {
        set((state) => {
          state.isRunningAction = false;
          state.errorMessage = normalizeError(error);
        });
      }
    },

    pull: async () => {
      const workspacePath = ensureWorkspacePath();
      set((state) => {
        state.isRunningAction = true;
        state.errorMessage = null;
        state.syncStatus = "merging";
      });

      try {
        await gitService.pull(workspacePath);
        set((state) => {
          state.isRunningAction = false;
          state.syncDetail = "已拉取远端更新";
        });
        await get().refreshStatus();
      } catch (error) {
        const message = normalizeError(error);
        set((state) => {
          state.isRunningAction = false;
          state.errorMessage = message;
          state.syncStatus = /conflict|冲突/i.test(message) ? "conflicted" : "offline";
          state.syncDetail = message;
        });
      }
    },

    getHistory: async (path) => {
      const workspacePath = ensureWorkspacePath();
      set((state) => {
        state.isLoadingHistory = true;
        state.errorMessage = null;
      });

      try {
        const history = await gitService.getHistory(workspacePath, path, 30);
        set((state) => {
          state.history = history;
          state.isLoadingHistory = false;
          state.selectedCommitHash = history[0]?.hash ?? null;
          state.selectedCommitDiff = null;
        });
        return history;
      } catch (error) {
        set((state) => {
          state.isLoadingHistory = false;
          state.errorMessage = normalizeError(error);
          state.history = [];
          state.selectedCommitHash = null;
          state.selectedCommitDiff = null;
        });
        return [];
      }
    },

    getRepoHistory: async () => {
      const workspacePath = ensureWorkspacePath();
      set((state) => {
        state.isLoadingRepoHistory = true;
        state.errorMessage = null;
      });

      try {
        const history = await gitService.getHistory(workspacePath, null, 12);
        set((state) => {
          state.repoHistory = history;
          state.isLoadingRepoHistory = false;
        });
        return history;
      } catch (error) {
        set((state) => {
          state.isLoadingRepoHistory = false;
          state.errorMessage = normalizeError(error);
          state.repoHistory = [];
        });
        return [];
      }
    },

    selectHistoryEntry: async (hash) => {
      const workspacePath = ensureWorkspacePath();
      if (!hash) {
        set((state) => {
          state.selectedCommitHash = null;
          state.selectedCommitDiff = null;
        });
        return;
      }

      set((state) => {
        state.isLoadingHistory = true;
        state.selectedCommitHash = hash;
        state.errorMessage = null;
      });

      try {
        const diff = await gitService.getDiff(workspacePath, hash);
        set((state) => {
          state.selectedCommitDiff = diff;
          state.isLoadingHistory = false;
        });
      } catch (error) {
        set((state) => {
          state.isLoadingHistory = false;
          state.errorMessage = normalizeError(error);
          state.selectedCommitDiff = null;
        });
      }
    },

    initRepo: async () => {
      const workspacePath = ensureWorkspacePath();
      set((state) => {
        state.isRunningAction = true;
        state.errorMessage = null;
      });

      try {
        await gitService.initRepo(workspacePath);
        set((state) => {
          state.isRunningAction = false;
          state.syncStatus = "dirty";
          state.syncDetail = "仓库已初始化";
        });
        await get().refreshStatus();
      } catch (error) {
        set((state) => {
          state.isRunningAction = false;
          state.errorMessage = normalizeError(error);
        });
      }
    },

    cloneRepo: async (url, targetPath) => {
      set((state) => {
        state.isRunningAction = true;
        state.errorMessage = null;
      });

      try {
        await gitService.cloneRepo(url, targetPath);
        set((state) => {
          state.isRunningAction = false;
          state.syncStatus = "synced";
          state.syncDetail = "仓库已克隆";
        });
      } catch (error) {
        set((state) => {
          state.isRunningAction = false;
          state.errorMessage = normalizeError(error);
        });
      }
    },

    handleSyncEvent: (payload) => {
      const workspacePath = currentWorkspacePath();
      if (workspacePath && payload.workspacePath !== workspacePath) {
        return;
      }

      set((state) => {
        state.isSyncEnabled = true;
        state.syncStatus = mapNativeSyncPhase(payload.state);
        state.syncDetail = payload.detail ?? state.syncDetail;
        state.lastSyncTime = payload.updatedAt ?? state.lastSyncTime;
      });

      if (
        payload.state === "synced" ||
        payload.state === "dirty" ||
        payload.state === "committed" ||
        payload.state === "conflicted" ||
        payload.state === "not-initialized"
      ) {
        void get().refreshStatus();
      }
    },

    clearError: () => {
      set((state) => {
        state.errorMessage = null;
      });
    },
  })),
);

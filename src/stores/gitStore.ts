import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import type { GitStore } from "../types/git";

export const useGitStore = create<GitStore>()(
  immer(() => ({
    syncStatus: "not-initialized",
    syncDetail: null,
    lastSyncTime: null,
    changedFiles: [],
    statusByPath: {},
    history: [],
    selectedCommitHash: null,
    selectedCommitDiff: null,
    isSyncEnabled: false,
    isLoadingHistory: false,
    isLoadingStatus: false,
    isRunningAction: false,
    errorMessage: null,
    hydrateWorkspace: async () => {},
    refreshStatus: async () => {},
    startSync: async () => {},
    stopSync: async () => {},
    forceSync: async () => {},
    commit: async () => {},
    push: async () => {},
    pull: async () => {},
    getHistory: async () => [],
    selectHistoryEntry: async () => {},
    initRepo: async () => {},
    cloneRepo: async () => {},
    handleSyncEvent: () => {},
    clearError: () => {},
  })),
);

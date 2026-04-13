import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import type { GitStore } from "../types/git";

export const useGitStore = create<GitStore>()(
  immer(() => ({
    syncStatus: "not-initialized",
    lastSyncTime: null,
    changedFiles: [],
    commit: async () => {},
    push: async () => {},
    pull: async () => {},
    getHistory: async () => [],
    initRepo: async () => {},
  })),
);

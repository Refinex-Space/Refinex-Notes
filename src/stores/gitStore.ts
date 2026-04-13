import { create } from "zustand";

export type GitSyncStatus = "idle" | "syncing" | "synced" | "conflicted";

interface GitStoreState {
  status: GitSyncStatus;
  setStatus: (status: GitSyncStatus) => void;
}

export const useGitStore = create<GitStoreState>((set) => ({
  status: "idle",
  setStatus: (status) => set({ status }),
}));

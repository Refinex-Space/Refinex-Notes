import { create } from "zustand";

export type AuthStatus = "unknown" | "authenticated" | "anonymous";

interface AuthStoreState {
  status: AuthStatus;
  setStatus: (status: AuthStatus) => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  status: "unknown",
  setStatus: (status) => set({ status }),
}));

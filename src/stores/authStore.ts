import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import type { AuthStore } from "../types/auth";

export const useAuthStore = create<AuthStore>()(
  immer(() => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
  })),
);

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { authService } from "../services/authService";
import type { AuthStore } from "../types/auth";

let activePollRunId = 0;

function createInitialState() {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    hasResolvedAuth: false,
    authStep: "idle" as const,
    deviceCode: null,
    progressMessage: null,
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

  return "认证流程发生未知错误";
}

export function resetAuthStore() {
  activePollRunId = 0;
  useAuthStore.setState(createInitialState());
}

export const useAuthStore = create<AuthStore>()(
  immer((set, get) => ({
    ...createInitialState(),
    login: async () => {
      const state = get();
      if (state.isLoading || state.authStep === "polling") {
        return;
      }

      const pollRunId = activePollRunId + 1;
      activePollRunId = pollRunId;

      set((draft) => {
        draft.isLoading = true;
        draft.hasResolvedAuth = true;
        draft.authStep = "idle";
        draft.deviceCode = null;
        draft.progressMessage = null;
        draft.errorMessage = null;
      });

      try {
        const deviceCode = await authService.startLogin();

        set((draft) => {
          draft.isLoading = false;
          draft.authStep = "polling";
          draft.deviceCode = deviceCode;
          draft.progressMessage = "等待浏览器授权...";
        });

        void authService
          .pollForLogin(deviceCode.interval, (event) => {
            if (pollRunId !== activePollRunId) {
              return;
            }

            set((draft) => {
              draft.progressMessage = event.message;
            });
          })
          .then((user) => {
            if (pollRunId !== activePollRunId) {
              return;
            }

            set((draft) => {
              draft.user = user;
              draft.isAuthenticated = true;
              draft.authStep = "authenticated";
              draft.deviceCode = null;
              draft.progressMessage = null;
              draft.errorMessage = null;
            });
          })
          .catch((error) => {
            if (pollRunId !== activePollRunId) {
              return;
            }

            set((draft) => {
              draft.isAuthenticated = false;
              draft.user = null;
              draft.authStep = "idle";
              draft.deviceCode = null;
              draft.progressMessage = null;
              draft.errorMessage = normalizeError(error);
            });
          });
      } catch (error) {
        if (pollRunId !== activePollRunId) {
          return;
        }

        set((draft) => {
          draft.isLoading = false;
          draft.isAuthenticated = false;
          draft.user = null;
          draft.authStep = "idle";
          draft.deviceCode = null;
          draft.progressMessage = null;
          draft.errorMessage = normalizeError(error);
        });
      }
    },
    logout: async () => {
      activePollRunId += 1;

      set((draft) => {
        draft.isLoading = true;
        draft.errorMessage = null;
      });

      try {
        await authService.logout();
      } finally {
        set((draft) => {
          draft.user = null;
          draft.isAuthenticated = false;
          draft.isLoading = false;
          draft.hasResolvedAuth = true;
          draft.authStep = "idle";
          draft.deviceCode = null;
          draft.progressMessage = null;
          draft.errorMessage = null;
        });
      }
    },
    checkAuth: async () => {
      const state = get();
      if (state.isLoading || state.hasResolvedAuth) {
        return;
      }

      set((draft) => {
        draft.isLoading = true;
        draft.authStep = "checking";
        draft.errorMessage = null;
      });

      try {
        const user = await authService.checkStatus();

        set((draft) => {
          draft.user = user;
          draft.isAuthenticated = user !== null;
          draft.isLoading = false;
          draft.hasResolvedAuth = true;
          draft.authStep = user ? "authenticated" : "idle";
          draft.deviceCode = null;
          draft.progressMessage = null;
        });
      } catch (error) {
        set((draft) => {
          draft.user = null;
          draft.isAuthenticated = false;
          draft.isLoading = false;
          draft.hasResolvedAuth = true;
          draft.authStep = "idle";
          draft.deviceCode = null;
          draft.progressMessage = null;
          draft.errorMessage = normalizeError(error);
        });
      }
    },
  })),
);

import { Channel, invoke, isTauri } from "@tauri-apps/api/core";

import type {
  AuthProgressEvent,
  DeviceCodeResponse,
  UserProfile,
} from "../types/auth";

function requireNativeAuth() {
  if (!isTauri()) {
    throw new Error("GitHub 登录仅在 Tauri 桌面环境可用");
  }
}

export const authService = {
  isNativeAvailable() {
    return isTauri();
  },

  async checkStatus() {
    if (!isTauri()) {
      return null;
    }

    return invoke<UserProfile | null>("check_auth_status");
  },

  async startLogin() {
    requireNativeAuth();
    return invoke<DeviceCodeResponse>("github_auth_start");
  },

  async pollForLogin(
    intervalSeconds: number,
    onProgress?: (event: AuthProgressEvent) => void,
  ) {
    requireNativeAuth();

    const progress = new Channel<AuthProgressEvent>((event) => {
      onProgress?.(event);
    });

    return invoke<UserProfile>("github_auth_poll", {
      progress,
      intervalSeconds,
    });
  },

  async logout() {
    if (!isTauri()) {
      return;
    }

    await invoke<void>("github_logout");
  },

  async openVerificationUri(url: string) {
    if (isTauri()) {
      await invoke<void>("open_external_url", { url });
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  },
};

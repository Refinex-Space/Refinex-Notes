import { invoke, isTauri } from "@tauri-apps/api/core";

import type {
  AIModelInfo,
  AIProviderDraft,
  AIProviderSettingsRecord,
  AITestConnectionResult,
  AppSettings,
} from "../types";

function requireNativeSettings() {
  if (!isTauri()) {
    throw new Error("设置功能仅在 Tauri 桌面环境可用");
  }
}

interface SaveProviderSettingsOptions {
  providers: AIProviderDraft[];
  modelCatalog: AIModelInfo[];
  apiKeys: Array<{
    providerId: string;
    apiKey: string;
  }>;
}

export const settingsService = {
  isNativeAvailable() {
    return isTauri();
  },

  async loadSettings() {
    if (!isTauri()) {
      return null;
    }

    return invoke<AppSettings>("load_settings");
  },

  async saveSettings(settings: AppSettings) {
    requireNativeSettings();
    return invoke<AppSettings>("save_settings", { settings });
  },

  async readSetting(key: string) {
    requireNativeSettings();
    return invoke<string | null>("read_setting", { key });
  },

  async writeSetting(key: string, value: string) {
    requireNativeSettings();
    await invoke<void>("write_setting", { key, value });
  },

  async listProviderSettings() {
    requireNativeSettings();
    return invoke<AIProviderSettingsRecord[]>("ai_list_provider_settings");
  },

  async listModels(providerId: string) {
    requireNativeSettings();
    return invoke<AIModelInfo[]>("ai_list_models", { providerId });
  },

  async saveProviderSettings({
    providers,
    modelCatalog,
    apiKeys,
  }: SaveProviderSettingsOptions) {
    requireNativeSettings();
    return invoke<AIProviderSettingsRecord[]>("ai_save_provider_settings", {
      providers: providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        providerKind: provider.providerKind,
        enabled: provider.enabled,
        baseUrl: provider.baseUrl ?? null,
      })),
      modelCatalog,
      apiKeys,
    });
  },

  async testConnection(providerId: string, model?: string | null) {
    requireNativeSettings();
    return invoke<AITestConnectionResult>("ai_test_connection", {
      providerId,
      model: model ?? null,
    });
  },
};

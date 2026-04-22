import { beforeEach, describe, expect, it, vi } from "vitest";

import { settingsService } from "../../services/settingsService";
import { resetSettingsStore, useSettingsStore } from "../settingsStore";

vi.mock("../../services/settingsService", () => ({
  settingsService: {
    isNativeAvailable: vi.fn(() => true),
    loadSettings: vi.fn(),
    saveSettings: vi.fn(),
    readSetting: vi.fn(),
    writeSetting: vi.fn(),
    listProviderSettings: vi.fn(),
    listModels: vi.fn(),
    saveProviderSettings: vi.fn(),
    testConnection: vi.fn(),
  },
}));

describe("settingsStore", () => {
  beforeEach(() => {
    resetSettingsStore();
    vi.clearAllMocks();
    vi.mocked(settingsService.isNativeAvailable).mockReturnValue(true);
  });

  it("hydrates app settings, provider drafts and model catalogs from native services", async () => {
    vi.mocked(settingsService.loadSettings).mockResolvedValue({
      themeMode: "dark",
      language: "zhCn",
      reopenLastWorkspaceOnStartup: false,
      editor: {
        fontFamily: "IBM Plex Sans",
        fontSizePx: 18,
        lineHeight: 1.7,
        showLineNumbers: true,
        autoSaveIntervalSeconds: 8,
      },
      gitSync: {
        autoSyncEnabled: true,
        syncIntervalSeconds: 90,
        commitMessageTemplate: "chore(notes): sync",
      },
      ai: {
        defaultProviderId: "deepseek",
        defaultModelId: "deepseek-chat",
      },
      shortcuts: {
        overrides: [],
      },
    });
    vi.mocked(settingsService.listProviderSettings).mockResolvedValue([
      {
        id: "deepseek",
        name: "DeepSeek",
        providerKind: "deepseek",
        enabled: true,
        baseUrl: "https://api.deepseek.com/v1",
        hasApiKey: true,
      },
    ]);
    vi.mocked(settingsService.listModels).mockResolvedValue([
      {
        providerId: "deepseek",
        modelId: "deepseek-chat",
        label: "DeepSeek Chat",
        isDefault: true,
      },
    ]);

    await useSettingsStore.getState().loadSettings();

    const state = useSettingsStore.getState();
    expect(state.settings.themeMode).toBe("dark");
    expect(state.settings.reopenLastWorkspaceOnStartup).toBe(false);
    expect(state.providerDrafts[0]?.hasApiKey).toBe(true);
    expect(state.modelsByProvider.deepseek?.[0]?.modelId).toBe("deepseek-chat");
  });

  it("adds removable custom providers with local model drafts", () => {
    const providerId = useSettingsStore.getState().addCustomProvider();

    let state = useSettingsStore.getState();
    expect(state.providerDrafts.some((provider) => provider.id === providerId)).toBe(
      true,
    );
    expect(state.modelsByProvider[providerId]).toHaveLength(1);

    useSettingsStore.getState().removeCustomProvider(providerId);

    state = useSettingsStore.getState();
    expect(state.providerDrafts.some((provider) => provider.id === providerId)).toBe(
      false,
    );
    expect(state.modelsByProvider[providerId]).toBeUndefined();
  });
});

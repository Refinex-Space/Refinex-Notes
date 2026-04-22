import type {
  AIModelInfo,
  AIProviderKind,
  AIProviderSettingsRecord,
  AITestConnectionResult,
} from "./ai";

export type ThemeMode = "light" | "dark" | "system";
export type AppLanguage = "zhCn" | "en";
export type SettingsSection =
  | "general"
  | "editor"
  | "ai"
  | "git"
  | "shortcuts"
  | "account";

export interface EditorSettings {
  fontFamily: string;
  fontSizePx: number;
  lineHeight: number;
  showLineNumbers: boolean;
  autoSaveIntervalSeconds: number;
}

export interface GitSyncSettings {
  autoSyncEnabled: boolean;
  syncIntervalSeconds: number;
  commitMessageTemplate: string;
}

export interface AISettings {
  defaultProviderId: string | null;
  defaultModelId: string | null;
}

export interface ShortcutOverride {
  actionId: string;
  accelerator: string;
}

export interface ShortcutSettings {
  overrides: ShortcutOverride[];
}

export interface AppSettings {
  themeMode: ThemeMode;
  language: AppLanguage;
  reopenLastWorkspaceOnStartup: boolean;
  editor: EditorSettings;
  gitSync: GitSyncSettings;
  ai: AISettings;
  shortcuts: ShortcutSettings;
}

export interface AIProviderDraft extends AIProviderSettingsRecord {
  isCustom: boolean;
}

export interface ProviderApiKeyDraft {
  value: string;
  isDirty: boolean;
}

export interface SettingsStoreState {
  settings: AppSettings;
  providerDrafts: AIProviderDraft[];
  modelsByProvider: Record<string, AIModelInfo[]>;
  apiKeyDrafts: Record<string, ProviderApiKeyDraft>;
  isLoading: boolean;
  isSaving: boolean;
  isLoaded: boolean;
  testingProviderId: string | null;
  lastTestResult: AITestConnectionResult | null;
  errorMessage: string | null;
}

export interface SaveSettingsOptions {
  silent?: boolean;
}

export interface SettingsStoreActions {
  loadSettings: () => Promise<void>;
  saveSettings: (options?: SaveSettingsOptions) => Promise<void>;
  setThemeMode: (themeMode: ThemeMode) => void;
  setLanguage: (language: AppLanguage) => void;
  setReopenLastWorkspaceOnStartup: (enabled: boolean) => void;
  updateEditorSettings: (patch: Partial<EditorSettings>) => void;
  updateGitSyncSettings: (patch: Partial<GitSyncSettings>) => void;
  updateAISettings: (patch: Partial<AISettings>) => void;
  updateProviderDraft: (
    providerId: string,
    patch: Partial<AIProviderDraft>,
  ) => void;
  addCustomProvider: () => string;
  removeCustomProvider: (providerId: string) => void;
  setProviderApiKeyDraft: (providerId: string, value: string) => void;
  addProviderModel: (providerId: string) => void;
  updateProviderModel: (
    providerId: string,
    modelId: string,
    patch: Partial<AIModelInfo>,
  ) => void;
  removeProviderModel: (providerId: string, modelId: string) => void;
  setDefaultProviderAndModel: (
    providerId: string | null,
    modelId: string | null,
  ) => void;
  testProviderConnection: (providerId: string) => Promise<AITestConnectionResult>;
  clearError: () => void;
}

export type SettingsStore = SettingsStoreState & SettingsStoreActions;

export function createDefaultSettings(): AppSettings {
  return {
    themeMode: "system",
    language: "zhCn",
    reopenLastWorkspaceOnStartup: true,
    editor: {
      fontFamily: "IBM Plex Sans",
      fontSizePx: 16,
      lineHeight: 1.65,
      showLineNumbers: false,
      autoSaveIntervalSeconds: 5,
    },
    gitSync: {
      autoSyncEnabled: false,
      syncIntervalSeconds: 60,
      commitMessageTemplate: "chore(notes): auto-sync",
    },
    ai: {
      defaultProviderId: null,
      defaultModelId: null,
    },
    shortcuts: {
      overrides: [],
    },
  };
}

export function createDefaultProviderApiKeyDraft(): ProviderApiKeyDraft {
  return {
    value: "",
    isDirty: false,
  };
}

export function isCustomProviderKind(kind: AIProviderKind) {
  return kind === "custom-openai-compatible";
}

export type ThemeMode = "light" | "dark" | "system";

export interface AIProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  enabled: boolean;
}

export interface SettingsStoreState {
  theme: ThemeMode;
  fontSize: number;
  fontFamily: string;
  aiProviders: AIProviderConfig[];
  autoSync: boolean;
  syncInterval: number;
}

export interface SettingsStoreActions {
  updateSetting: <K extends keyof SettingsStoreState>(
    key: K,
    value: SettingsStoreState[K],
  ) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export type SettingsStore = SettingsStoreState & SettingsStoreActions;

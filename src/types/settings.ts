export type ThemeMode = "light" | "dark" | "system";

export interface AIProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  enabled: boolean;
}

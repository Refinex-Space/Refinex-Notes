export type AIMessageRole = "user" | "assistant";
export type AICommandMessageRole = "system" | AIMessageRole;
export type AIProviderKind =
  | "deepseek"
  | "qwen"
  | "glm"
  | "kimi"
  | "minimax"
  | "openai"
  | "anthropic"
  | "custom-openai-compatible";
export type AITestConnectionMode = "configOnly" | "liveRequest";

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  timestamp: number;
}

export interface AICommandMessage {
  role: AICommandMessageRole;
  content: string;
}

export interface AIProviderInfo {
  id: string;
  name: string;
  providerKind: AIProviderKind;
  baseUrl?: string | null;
}

export interface AIProviderSettingsRecord {
  id: string;
  name: string;
  providerKind: AIProviderKind;
  enabled: boolean;
  baseUrl?: string | null;
  hasApiKey: boolean;
}

export interface AIModelInfo {
  providerId: string;
  modelId: string;
  label: string;
  isDefault: boolean;
}

export interface AITestConnectionResult {
  providerId: string;
  modelId: string;
  ready: boolean;
  checkMode: AITestConnectionMode;
}

export interface AIContext {
  currentDocument: {
    content: string;
    filePath: string;
    cursorPosition: number;
    selectedText?: string;
  };
  workspace: {
    directoryTree: string;
    openFiles: string[];
    recentFiles?: string[];
  };
}

export interface AIStoreState {
  messages: AIMessage[];
  isStreaming: boolean;
  isLoadingProviders: boolean;
  providers: AIProviderInfo[];
  modelsByProvider: Record<string, AIModelInfo[]>;
  activeProvider: string | null;
  activeModel: string | null;
  errorMessage: string | null;
  activeRequestId: string | null;
}

export interface AIStoreActions {
  loadProviders: () => Promise<void>;
  loadModels: (providerId: string) => Promise<void>;
  selectProvider: (providerId: string) => Promise<void>;
  selectModel: (modelId: string) => void;
  streamPrompt: (args: {
    userMessage: string;
    promptContent: string;
    selectedText?: string;
    includeCurrentDocument?: boolean;
  }) => Promise<void>;
  sendMessage: (
    content: string,
    options?: { includeCurrentDocument?: boolean },
  ) => Promise<void>;
  cancelStream: () => Promise<void>;
  clearHistory: () => void;
}

export type AIStore = AIStoreState & AIStoreActions;

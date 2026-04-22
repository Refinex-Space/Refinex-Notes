export type AIMessageRole = "user" | "assistant";
export type AICommandMessageRole = "system" | AIMessageRole;
export type AIMessageAttachmentKind = "image" | "text";
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
  attachments?: AIMessageAttachment[];
}

interface AIMessageAttachmentBase {
  id: string;
  kind: AIMessageAttachmentKind;
  name: string;
  mimeType: string;
  size: number;
}

export interface AIImageAttachment extends AIMessageAttachmentBase {
  kind: "image";
  base64Data: string;
}

export interface AITextAttachment extends AIMessageAttachmentBase {
  kind: "text";
  textContent: string;
}

export type AIMessageAttachment = AIImageAttachment | AITextAttachment;

export type AIConversationTitleSource = "auto" | "manual";

export interface AIConversation {
  id: string;
  title: string;
  titleSource: AIConversationTitleSource;
  messages: AIMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface AICommandMessage {
  role: AICommandMessageRole;
  content: string;
  attachments?: AIMessageAttachment[];
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
  referencedDocuments: Array<{
    path: string;
    title: string;
    content: string;
  }>;
  workspace: {
    directoryTree: string;
    openFiles: string[];
    recentFiles?: string[];
  };
}

export interface AIStoreState {
  conversations: AIConversation[];
  activeConversationId: string | null;
  messages: AIMessage[];
  isStreaming: boolean;
  isLoadingProviders: boolean;
  providers: AIProviderInfo[];
  modelsByProvider: Record<string, AIModelInfo[]>;
  activeProvider: string | null;
  activeModel: string | null;
  errorMessage: string | null;
  activeRequestId: string | null;
  activeRequestConversationId: string | null;
}

export interface AIStoreActions {
  loadProviders: () => Promise<void>;
  loadModels: (providerId: string) => Promise<void>;
  selectProvider: (providerId: string) => Promise<void>;
  selectModel: (modelId: string) => void;
  createConversation: () => string;
  switchConversation: (conversationId: string) => void;
  renameConversation: (conversationId: string, title: string) => void;
  deleteConversation: (conversationId: string) => void;
  streamPrompt: (args: {
    userMessage: string;
    promptContent: string;
    selectedText?: string;
    includeCurrentDocument?: boolean;
    attachedDocumentPaths?: string[];
    attachments?: AIMessageAttachment[];
  }) => Promise<void>;
  sendMessage: (
    content: string,
    options?: {
      includeCurrentDocument?: boolean;
      attachedDocumentPaths?: string[];
      attachments?: AIMessageAttachment[];
    },
  ) => Promise<void>;
  cancelStream: () => Promise<void>;
  clearHistory: () => void;
}

export type AIStore = AIStoreState & AIStoreActions;

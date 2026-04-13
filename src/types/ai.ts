export type AIMessageRole = "user" | "assistant";

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  timestamp: Date;
}

export interface AIStoreState {
  messages: AIMessage[];
  isStreaming: boolean;
  activeProvider: string;
  activeModel: string;
}

export interface AIStoreActions {
  sendMessage: (content: string) => Promise<void>;
  cancelStream: () => void;
  clearHistory: () => void;
  switchProvider: (id: string) => void;
}

export type AIStore = AIStoreState & AIStoreActions;

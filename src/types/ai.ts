export type AIMessageRole = "user" | "assistant";

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  timestamp: Date;
}

import { Channel, invoke, isTauri } from "@tauri-apps/api/core";

import type {
  AICommandMessage,
  AIModelInfo,
  AIProviderInfo,
} from "../types/ai";

function requireNativeAI() {
  if (!isTauri()) {
    throw new Error("AI 功能仅在 Tauri 桌面环境可用");
  }
}

interface StreamOptions {
  messages: AICommandMessage[];
  providerId: string;
  model: string;
  onToken: (token: string) => void;
}

export const aiService = {
  isNativeAvailable() {
    return isTauri();
  },

  async listProviders() {
    requireNativeAI();
    return invoke<AIProviderInfo[]>("ai_list_providers");
  },

  async listModels(providerId: string) {
    requireNativeAI();
    return invoke<AIModelInfo[]>("ai_list_models", { providerId });
  },

  async stream({ messages, providerId, model, onToken }: StreamOptions) {
    requireNativeAI();

    const channel = new Channel<string>();
    channel.onmessage = onToken;

    await invoke<void>("ai_chat_stream", {
      messages,
      providerId,
      model,
      channel,
    });
  },

  async cancelStream() {
    requireNativeAI();
    await invoke<void>("ai_cancel_stream");
  },
};

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import type { AIStore } from "../types/ai";

export const useAIStore = create<AIStore>()(
  immer(() => ({
    messages: [],
    isStreaming: false,
    activeProvider: "deepseek",
    activeModel: "",
    sendMessage: async () => {},
    cancelStream: () => {},
    clearHistory: () => {},
    switchProvider: () => {},
  })),
);

import { create } from "zustand";

interface AIStoreState {
  activeProvider: string;
  setActiveProvider: (activeProvider: string) => void;
}

export const useAIStore = create<AIStoreState>((set) => ({
  activeProvider: "deepseek",
  setActiveProvider: (activeProvider) => set({ activeProvider }),
}));

import { create } from "zustand";

interface EditorStoreState {
  ready: boolean;
  setReady: (ready: boolean) => void;
}

export const useEditorStore = create<EditorStoreState>((set) => ({
  ready: false,
  setReady: (ready) => set({ ready }),
}));

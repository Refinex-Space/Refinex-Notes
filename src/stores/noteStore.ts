import { create } from "zustand";

interface NoteStoreState {
  currentPath: string | null;
  setCurrentPath: (path: string | null) => void;
}

export const useNoteStore = create<NoteStoreState>((set) => ({
  currentPath: null,
  setCurrentPath: (currentPath) => set({ currentPath }),
}));

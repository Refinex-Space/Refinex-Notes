import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import type { NoteStore } from "../types/notes";

export const useNoteStore = create<NoteStore>()(
  immer(() => ({
    files: [],
    currentFile: null,
    openFiles: [],
    recentFiles: [],
    openFile: async () => {},
    closeFile: async () => {},
    createFile: async () => {},
    deleteFile: async () => {},
    renameFile: async () => {},
    refreshFileTree: async () => {},
  })),
);

import { create } from "zustand";

import type { CursorPosition, EditorStore } from "../types/editor";

function createInitialState() {
  return {
    activeTab: "Inbox/Welcome.md" as string | null,
    unsavedChanges: new Set<string>(),
    cursorPosition: { line: 1, col: 1 } satisfies CursorPosition,
  };
}

export function resetEditorStore() {
  useEditorStore.setState(createInitialState());
}

export const useEditorStore = create<EditorStore>()((set) => ({
  ...createInitialState(),
  setActiveTab: (path) => {
    set(() => ({ activeTab: path }));
  },
  markDirty: (path) => {
    set((state) => ({
      unsavedChanges: new Set([...state.unsavedChanges, path]),
    }));
  },
  markClean: (path) => {
    set((state) => ({
      unsavedChanges: new Set(
        [...state.unsavedChanges].filter((entry) => entry !== path),
      ),
    }));
  },
  setCursorPosition: (cursorPosition) => {
    set(() => ({ cursorPosition }));
  },
}));

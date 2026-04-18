import { create } from "zustand";

import type { CursorPosition, EditorStore } from "../types/editor";

function createInitialState() {
  return {
    activeTab: null as string | null,
    unsavedChanges: new Set<string>(),
    cursorPosition: { line: 1, col: 1 } satisfies CursorPosition,
    sourceMode: false,
  };
}

export function resetEditorStore() {
  useEditorStore.setState(createInitialState());
}

export const useEditorStore = create<EditorStore>()((set) => ({
  ...createInitialState(),
  setActiveTab: (path) => {
    set(() => ({ activeTab: path, sourceMode: false }));
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
  setSourceMode: (enabled) => {
    set(() => ({ sourceMode: enabled }));
  },
  toggleSourceMode: () => {
    set((state) => ({ sourceMode: !state.sourceMode }));
  },
}));

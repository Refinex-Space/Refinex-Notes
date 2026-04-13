import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import type { EditorStore } from "../types/editor";

export const useEditorStore = create<EditorStore>()(
  immer(() => ({
    activeTab: null,
    unsavedChanges: new Set<string>(),
    cursorPosition: { line: 1, col: 1 },
    setActiveTab: () => {},
    markDirty: () => {},
    markClean: () => {},
  })),
);

export interface CursorPosition {
  line: number;
  col: number;
}

export interface EditorStoreState {
  activeTab: string | null;
  unsavedChanges: Set<string>;
  cursorPosition: CursorPosition;
}

export interface EditorStoreActions {
  setActiveTab: (path: string | null) => void;
  markDirty: (path: string) => void;
  markClean: (path: string) => void;
  setCursorPosition: (cursorPosition: CursorPosition) => void;
}

export type EditorStore = EditorStoreState & EditorStoreActions;

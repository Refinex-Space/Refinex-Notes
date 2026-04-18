export interface CursorPosition {
  line: number;
  col: number;
}

export interface EditorStoreState {
  activeTab: string | null;
  unsavedChanges: Set<string>;
  cursorPosition: CursorPosition;
  /** Whether the active editor is showing raw Markdown source instead of rich rendering. */
  sourceMode: boolean;
}

export interface EditorStoreActions {
  setActiveTab: (path: string | null) => void;
  markDirty: (path: string) => void;
  markClean: (path: string) => void;
  setCursorPosition: (cursorPosition: CursorPosition) => void;
  setSourceMode: (enabled: boolean) => void;
  toggleSourceMode: () => void;
}

export type EditorStore = EditorStoreState & EditorStoreActions;

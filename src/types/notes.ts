export type FileGitStatus =
  | "added"
  | "modified"
  | "deleted"
  | "untracked"
  | "clean";

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
  gitStatus?: FileGitStatus;
}

export interface NoteStoreState {
  files: FileNode[];
  currentFile: string | null;
  openFiles: string[];
  recentFiles: string[];
}

export interface NoteStoreActions {
  openFile: (path: string) => Promise<void>;
  closeFile: (path: string) => Promise<void>;
  createFile: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  refreshFileTree: () => Promise<void>;
}

export type NoteStore = NoteStoreState & NoteStoreActions;

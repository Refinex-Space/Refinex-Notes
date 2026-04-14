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

export interface NoteDocument {
  path: string;
  name: string;
  content: string;
  savedContent: string;
  language: string;
  gitStatus: FileGitStatus;
  isMarkdown: boolean;
}

export interface NoteStoreState {
  workspacePath: string | null;
  files: FileNode[];
  documents: Record<string, NoteDocument>;
  folders: string[];
  currentFile: string | null;
  openFiles: string[];
  recentFiles: string[];
}

export interface NoteStoreActions {
  openWorkspace: (path: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  closeFile: (path: string) => Promise<void>;
  createFile: (path: string) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  refreshFileTree: () => Promise<void>;
  refreshWorkspace: (changedPaths?: string[]) => Promise<void>;
  saveCurrentFile: () => Promise<void>;
  updateFileContent: (path: string, content: string) => void;
}

export type NoteStore = NoteStoreState & NoteStoreActions;

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

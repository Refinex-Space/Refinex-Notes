import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import type { FileNode, RecentWorkspace } from "../types/notes";

export interface FilesChangedPayload {
  paths: string[];
}

async function chooseWorkspaceDirectory() {
  if (!isTauri()) {
    return null;
  }

  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    directory: true,
    multiple: false,
    recursive: true,
    title: "选择 Refinex Notes 工作区",
  });

  return typeof selected === "string" ? selected : null;
}

export const fileService = {
  isNativeAvailable() {
    return isTauri();
  },

  async selectWorkspace() {
    return chooseWorkspaceDirectory();
  },

  async openWorkspace(path: string) {
    return invoke<FileNode[]>("open_workspace", { path });
  },

  async closeWorkspace() {
    return invoke<void>("close_workspace");
  },

  async listRecentWorkspaces() {
    return invoke<RecentWorkspace[]>("list_recent_workspaces");
  },

  async removeRecentWorkspace(path: string) {
    return invoke<void>("remove_recent_workspace", { path });
  },

  async readFileTree(path: string) {
    return invoke<FileNode[]>("read_file_tree", { path });
  },

  async readFile(path: string) {
    return invoke<string>("read_file", { path });
  },

  async writeFile(path: string, content: string) {
    return invoke<void>("write_file", { path, content });
  },

  async createFile(path: string) {
    return invoke<void>("create_file", { path });
  },

  async createDir(path: string) {
    return invoke<void>("create_dir", { path });
  },

  async deleteFile(path: string) {
    return invoke<void>("delete_file", { path });
  },

  async renameFile(oldPath: string, newPath: string) {
    return invoke<void>("rename_file", { oldPath, newPath });
  },

  async onFilesChanged(handler: (payload: FilesChangedPayload) => void) {
    if (!isTauri()) {
      return () => {};
    }

    return listen<FilesChangedPayload>("files-changed", (event) => {
      handler(event.payload);
    });
  },
};

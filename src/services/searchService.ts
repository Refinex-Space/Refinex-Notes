import { invoke, isTauri } from "@tauri-apps/api/core";

import type { SearchResult } from "../types/search";

function requireNativeSearch() {
  if (!isTauri()) {
    throw new Error("搜索功能仅在 Tauri 桌面环境可用");
  }
}

export const searchService = {
  isNativeAvailable() {
    return isTauri();
  },

  async searchFiles(query: string) {
    requireNativeSearch();
    return invoke<SearchResult[]>("search_files", { query });
  },

  async searchFulltext(query: string) {
    requireNativeSearch();
    return invoke<SearchResult[]>("search_fulltext", { query });
  },
};

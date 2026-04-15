import { beforeEach, describe, expect, it, vi } from "vitest";

import { gitService } from "../../services/gitService";
import type { GitHistoryEntry, GitStatusEntry } from "../../types/git";
import { resetGitStore, useGitStore } from "../gitStore";
import { resetNoteStore, useNoteStore } from "../noteStore";

vi.mock("../../services/gitService", () => ({
  gitService: {
    isNativeAvailable: vi.fn(() => true),
    initRepo: vi.fn(),
    cloneRepo: vi.fn(),
    getStatus: vi.fn(),
    commit: vi.fn(),
    push: vi.fn(),
    pull: vi.fn(),
    getHistory: vi.fn(),
    getDiff: vi.fn(),
    startSync: vi.fn(),
    stopSync: vi.fn(),
    forceSync: vi.fn(),
    onSyncStatus: vi.fn(),
  },
}));

describe("gitStore", () => {
  const changedFiles: GitStatusEntry[] = [
    { path: "notes/today.md", status: "modified", staged: false, unstaged: true },
    { path: "ideas/new.md", status: "untracked", staged: false, unstaged: true },
  ];

  const history: GitHistoryEntry[] = [
    {
      hash: "abc123",
      message: "update today",
      author: "refinex",
      date: 1_713_027_600,
    },
  ];

  beforeEach(() => {
    resetGitStore();
    resetNoteStore();
    vi.clearAllMocks();

    useNoteStore.setState({
      workspacePath: "/tmp/workspace",
      currentFile: "notes/today.md",
    });
  });

  it("refreshes workspace status and builds a path map", async () => {
    vi.mocked(gitService.getStatus).mockResolvedValue(changedFiles);

    await useGitStore.getState().refreshStatus();

    expect(useGitStore.getState().syncStatus).toBe("dirty");
    expect(useGitStore.getState().changedFiles).toEqual(changedFiles);
    expect(useGitStore.getState().statusByPath).toEqual({
      "notes/today.md": "modified",
      "ideas/new.md": "untracked",
    });
  });

  it("maps repository-missing errors to not-initialized instead of offline", async () => {
    vi.mocked(gitService.getStatus).mockRejectedValue(
      new Error("could not find repository from '/tmp/workspace'"),
    );

    await useGitStore.getState().refreshStatus();

    expect(useGitStore.getState().syncStatus).toBe("not-initialized");
    expect(useGitStore.getState().errorMessage).toBeNull();
    expect(useGitStore.getState().syncDetail).toContain("尚未初始化");
  });

  it("loads history and selected diff for the current file", async () => {
    vi.mocked(gitService.getHistory).mockResolvedValue(history);
    vi.mocked(gitService.getDiff).mockResolvedValue("@@ -1 +1 @@\n-old\n+new\n");

    const result = await useGitStore.getState().getHistory("notes/today.md");
    await useGitStore.getState().selectHistoryEntry("abc123");

    expect(result).toEqual(history);
    expect(useGitStore.getState().history).toEqual(history);
    expect(useGitStore.getState().selectedCommitHash).toBe("abc123");
    expect(useGitStore.getState().selectedCommitDiff).toContain("+new");
  });

  it("loads repository history separately from file history", async () => {
    vi.mocked(gitService.getHistory).mockResolvedValue(history);

    const result = await useGitStore.getState().getRepoHistory();

    expect(result).toEqual(history);
    expect(useGitStore.getState().repoHistory).toEqual(history);
    expect(vi.mocked(gitService.getHistory)).toHaveBeenCalledWith("/tmp/workspace", null, 12);
  });

  it("handles sync events and refreshes status on synced transitions", async () => {
    vi.mocked(gitService.getStatus).mockResolvedValue([]);

    useGitStore.getState().handleSyncEvent({
      state: "synced",
      workspacePath: "/tmp/workspace",
      detail: "同步完成",
      updatedAt: 1_713_027_601,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(useGitStore.getState().syncStatus).toBe("synced");
    expect(useGitStore.getState().syncDetail).toBe("工作区已同步");
    expect(useGitStore.getState().lastSyncTime).toBe(1_713_027_601);
    expect(vi.mocked(gitService.getStatus)).toHaveBeenCalled();
  });
});

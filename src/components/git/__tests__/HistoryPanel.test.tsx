import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { formatRelativeTime, HistoryPanel } from "../HistoryPanel";
import { useGitStore } from "../../../stores/gitStore";
import type { GitStore } from "../../../types/git";

vi.mock("../../../stores/gitStore", () => ({
  useGitStore: vi.fn(),
}));

function mockGitStore(overrides: Record<string, unknown> = {}) {
  const store: GitStore = {
    syncStatus: "synced",
    syncDetail: null,
    lastSyncTime: null,
    changedFiles: [],
    statusByPath: {},
    history: [],
    repoHistory: [],
    isSyncEnabled: false,
    isLoadingHistory: false,
    isLoadingRepoHistory: false,
    isLoadingStatus: false,
    isRunningAction: false,
    selectedCommitHash: null,
    selectedCommitDiff: null,
    getHistory: vi.fn(),
    getRepoHistory: vi.fn(),
    selectHistoryEntry: vi.fn(),
    hydrateWorkspace: vi.fn(),
    refreshStatus: vi.fn(),
    startSync: vi.fn(),
    stopSync: vi.fn(),
    forceSync: vi.fn(),
    commit: vi.fn(),
    push: vi.fn(),
    pull: vi.fn(),
    initRepo: vi.fn(),
    cloneRepo: vi.fn(),
    handleSyncEvent: vi.fn(),
    clearError: vi.fn(),
    fetchBranch: vi.fn(),
    stageFile: vi.fn(),
    unstageFile: vi.fn(),
    stageAll: vi.fn(),
    commitStaged: vi.fn(),
    fetchWorkingDiff: vi.fn(),
    fetchCommitFiles: vi.fn(),
    fetchCommitFileDiff: vi.fn(),
    errorMessage: null,
    currentBranch: null,
    ...overrides,
  };

  vi.mocked(useGitStore).mockImplementation(
    (selector: (state: typeof store) => unknown) => {
      return selector(store);
    },
  );
}

describe("HistoryPanel", () => {
  it("formats timestamps as relative time", () => {
    const now = new Date("2026-04-14T12:00:00Z").getTime();
    expect(formatRelativeTime(Math.floor(now / 1000) - 3600, now)).toContain(
      "小时前",
    );
  });

  it("renders an empty-state message when no file is open", () => {
    mockGitStore();
    const markup = renderToStaticMarkup(<HistoryPanel currentFile={null} />);
    expect(markup).toContain("先从文件树中打开一篇 Markdown");
  });

  it("renders repository recent commits above file history", () => {
    mockGitStore({
      repoHistory: [
        {
          hash: "abc123",
          message: "repo commit",
          author: "refinex",
          date: 1_713_027_600,
        },
      ],
      history: [
        {
          hash: "def456",
          message: "file commit",
          author: "refinex",
          date: 1_713_027_700,
        },
      ],
    });

    const markup = renderToStaticMarkup(
      <HistoryPanel currentFile="Inbox/Welcome.md" />,
    );
    expect(markup).toContain("Repository");
    expect(markup).toContain("repo commit");
    expect(markup).toContain("file commit");
  });
});

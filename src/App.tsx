import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Kbd } from "@radix-ui/themes";
import {
  AlertCircle,
  GitBranch,
  RefreshCcw,
  Search as SearchIcon,
  Wand2,
} from "lucide-react";
import { TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

import { CommandPalette } from "./components/CommandPalette";
import { AccountStatus } from "./components/auth/AccountStatus";
import { GitEmptyState } from "./components/git/GitEmptyState";
import { GitOverviewPanel } from "./components/git/GitOverviewPanel";
import { LoginScreen } from "./components/auth/LoginScreen";
import { DocumentOutlineDock } from "./components/editor/DocumentOutlineDock";
import { TabBar } from "./components/editor/TabBar";
import { AppLayout } from "./components/layout/AppLayout";
import { StatusBar } from "./components/layout/StatusBar";
import { HistoryPanel } from "./components/git/HistoryPanel";
import { SetupPanel } from "./components/git/SetupPanel";
import { SyncStatus } from "./components/git/SyncStatus";
import { FileTree, FileTreeEmptyState } from "./components/sidebar/FileTree";
import { SearchPanel } from "./components/sidebar/SearchPanel";
import { WorkspaceSwitcher } from "./components/sidebar/WorkspaceSwitcher";
import {
  buildCommandPaletteItems,
  countWords,
  createNextNotePath,
  findHeadingPosition,
  findTextPosition,
  searchResultsToCommandPaletteItems,
} from "./components/app-shell-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import { RefinexEditor, serializeEditorState } from "./editor";
import { fileService } from "./services/fileService";
import { gitService } from "./services/gitService";
import { searchService } from "./services/searchService";
import { useAuthStore } from "./stores/authStore";
import { useEditorStore } from "./stores/editorStore";
import { useGitStore } from "./stores/gitStore";
import { useNoteStore } from "./stores/noteStore";
import type { OutlineHeading } from "./types";
import type { SearchResult } from "./types/search";

const sidebarActionButtonClassName = [
  "inline-flex h-9 w-9 items-center justify-center",
  "bg-transparent text-muted transition",
  "hover:text-fg",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
].join(" ");

function SidebarContent({
  onSelectSearchResult,
  workspacePath,
  onOpenWorkspace,
  onSelectWorkspace,
  onRemoveWorkspace,
  recentWorkspaces,
}: {
  onSelectSearchResult: (result: SearchResult, query: string) => void;
  workspacePath: string | null;
  onOpenWorkspace: () => void;
  onSelectWorkspace: (path: string) => void;
  onRemoveWorkspace: (path: string) => void;
  recentWorkspaces: ReturnType<
    typeof useNoteStore.getState
  >["recentWorkspaces"];
}) {
  const hasFiles = useNoteStore((state) => state.files.length > 0);
  const sidebarSurfaceClassName = "bg-[rgb(var(--color-bg)/0.9)]";

  return (
    <div className={`flex h-full min-h-0 flex-col ${sidebarSurfaceClassName}`}>
      <section className="shrink-0 border-b border-border/70 px-3 py-3">
        <TooltipProvider>
          <div className="flex items-center gap-2">
            <WorkspaceSwitcher
              workspacePath={workspacePath}
              recentWorkspaces={recentWorkspaces}
              onOpenWorkspace={onOpenWorkspace}
              onSelectWorkspace={onSelectWorkspace}
              onRemoveWorkspace={onRemoveWorkspace}
            />

            <SearchPanel
              workspacePath={workspacePath}
              onSelectResult={onSelectSearchResult}
              tooltipLabel="搜索项目"
              trigger={
                <button
                  type="button"
                  aria-label="搜索项目"
                  className={sidebarActionButtonClassName}
                >
                  <SearchIcon className="h-4 w-4" />
                </button>
              }
            />
          </div>
        </TooltipProvider>
      </section>

      {hasFiles ? (
        <section
          className={`flex min-h-0 flex-1 flex-col ${sidebarSurfaceClassName}`}
        >
          <div
            className={`min-h-0 flex-1 overflow-hidden ${sidebarSurfaceClassName}`}
          >
            <FileTree />
          </div>
        </section>
      ) : (
        <section
          className={[
            "grid min-h-0 flex-1 place-items-center overflow-hidden",
            sidebarSurfaceClassName,
          ].join(" ")}
        >
          <FileTreeEmptyState workspacePath={workspacePath} />
        </section>
      )}
    </div>
  );
}

type RightPanelTab = "history" | "setup";

function RightPanelContent({
  currentFile,
  workspacePath,
  activeTab,
  setActiveTab,
}: {
  currentFile: string | null;
  workspacePath: string | null;
  activeTab: RightPanelTab;
  setActiveTab: Dispatch<SetStateAction<RightPanelTab>>;
}) {
  const user = useAuthStore((state) => state.user);
  const openWorkspace = useNoteStore((state) => state.openWorkspace);
  const initRepo = useGitStore((state) => state.initRepo);
  const cloneRepo = useGitStore((state) => state.cloneRepo);
  const changedFiles = useGitStore((state) => state.changedFiles);
  const syncStatus = useGitStore((state) => state.syncStatus);
  const syncDetail = useGitStore((state) => state.syncDetail);
  const isRunningAction = useGitStore((state) => state.isRunningAction);
  const errorMessage = useGitStore((state) => state.errorMessage);

  const showSetup =
    Boolean(workspacePath) &&
    (syncStatus === "not-initialized" || activeTab === "setup");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        {!workspacePath ? (
          <GitEmptyState title="" description="" />
        ) : showSetup ? (
          <SetupPanel
            workspacePath={workspacePath}
            userLogin={user?.login ?? null}
            isBusy={isRunningAction}
            errorMessage={errorMessage}
            onInitRepo={() => {
              void initRepo().then(() => {
                setActiveTab("history");
              });
            }}
            onCloneRepo={(url, targetPath) => {
              void cloneRepo(url, targetPath).then(async () => {
                if (useGitStore.getState().errorMessage) {
                  return;
                }
                await openWorkspace(targetPath);
                setActiveTab("history");
              });
            }}
          />
        ) : !currentFile ? (
          <GitOverviewPanel
            changedFiles={changedFiles}
            syncStatus={syncStatus}
            syncDetail={syncDetail}
          />
        ) : (
          <HistoryPanel currentFile={currentFile} />
        )}
      </div>
    </div>
  );
}

function EmptyEditorState() {
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_42%,rgba(14,165,233,0.08),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_50%_42%,rgba(34,211,238,0.08),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(148,163,184,0.04)_100%)] dark:bg-[linear-gradient(180deg,transparent_0%,rgba(148,163,184,0.02)_100%)]" />

      <section className="relative w-full max-w-xl px-8 text-center">
        <div className="mt-8 flex items-center justify-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-border/60 bg-[rgb(var(--color-bg)/0.78)] px-4 py-2 text-xs text-muted backdrop-blur-xl">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent/70" />
              工作区浏览
            </span>
            <span className="h-3 w-px bg-border/80" />
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-fg">
                <Kbd>Cmd</Kbd>
                <span>/</span>
                <Kbd>Ctrl</Kbd>
                <span>+</span>
                <Kbd>K</Kbd>
              </span>
              快速新建
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function SplashScreen() {
  return (
    <main className="flex h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_55%,#e2e8f0_100%)] px-6 text-fg dark:bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_38%),linear-gradient(180deg,#071120_0%,#050a17_55%,#03060f_100%)]">
      <section className="w-full max-w-sm rounded-[2rem] border border-border/70 bg-white/80 p-8 text-center shadow-[0_24px_120px_rgba(148,163,184,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_24px_120px_rgba(0,0,0,0.45)]">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-50 text-cyan-600 dark:border-cyan-300/18 dark:bg-cyan-400/10 dark:text-cyan-100">
          <RefreshCcw className="h-6 w-6 animate-spin" />
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-fg">
          Refinex-Notes
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          正在检查 GitHub 登录状态并恢复本地会话…
        </p>
      </section>
    </main>
  );
}

function WorkspaceShell({
  theme,
  setTheme,
}: {
  theme: "light" | "dark";
  setTheme: Dispatch<SetStateAction<"light" | "dark">>;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("history");
  const [pendingSearchJump, setPendingSearchJump] = useState<{
    path: string;
    query: string;
  } | null>(null);

  const workspacePath = useNoteStore((state) => state.workspacePath);
  const recentWorkspaces = useNoteStore((state) => state.recentWorkspaces);
  const documents = useNoteStore((state) => state.documents);
  const currentFile = useNoteStore((state) => state.currentFile);
  const openWorkspace = useNoteStore((state) => state.openWorkspace);
  const hydrateRecentWorkspaces = useNoteStore(
    (state) => state.hydrateRecentWorkspaces,
  );
  const openFile = useNoteStore((state) => state.openFile);
  const removeRecentWorkspace = useNoteStore(
    (state) => state.removeRecentWorkspace,
  );
  const createFile = useNoteStore((state) => state.createFile);
  const refreshWorkspace = useNoteStore((state) => state.refreshWorkspace);
  const saveCurrentFile = useNoteStore((state) => state.saveCurrentFile);
  const updateFileContent = useNoteStore((state) => state.updateFileContent);

  const activeTab = useEditorStore((state) => state.activeTab);
  const unsavedChanges = useEditorStore((state) => state.unsavedChanges);
  const cursorPosition = useEditorStore((state) => state.cursorPosition);
  const setActiveTab = useEditorStore((state) => state.setActiveTab);
  const markDirty = useEditorStore((state) => state.markDirty);
  const markClean = useEditorStore((state) => state.markClean);
  const setCursorPosition = useEditorStore((state) => state.setCursorPosition);
  const hydrateWorkspace = useGitStore((state) => state.hydrateWorkspace);
  const handleSyncEvent = useGitStore((state) => state.handleSyncEvent);

  const editorViewRef = useRef<EditorView | null>(null);
  const editorScrollRef = useRef<HTMLDivElement | null>(null);

  const currentDocument = currentFile ? (documents[currentFile] ?? null) : null;

  useEffect(() => {
    setActiveTab(currentFile);
  }, [currentFile, setActiveTab]);

  useEffect(() => {
    if (
      !pendingSearchJump ||
      !currentDocument ||
      currentDocument.path !== pendingSearchJump.path
    ) {
      return;
    }

    const view = editorViewRef.current;
    if (!view) {
      return;
    }

    const position = findTextPosition(view.state.doc, pendingSearchJump.query);
    if (position !== null) {
      const selection = TextSelection.near(view.state.doc.resolve(position));
      view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
      view.focus();
    }

    setPendingSearchJump(null);
  }, [currentDocument, pendingSearchJump]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "s"
      ) {
        return;
      }

      event.preventDefault();
      if (editorViewRef.current && currentFile) {
        const markdown = serializeEditorState(editorViewRef.current.state);
        updateFileContent(currentFile, markdown);

        if (currentDocument && markdown === currentDocument.savedContent) {
          markClean(currentFile);
        } else {
          markDirty(currentFile);
        }
      }
      void saveCurrentFile();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    currentDocument,
    currentFile,
    markClean,
    markDirty,
    saveCurrentFile,
    updateFileContent,
  ]);

  useEffect(() => {
    void hydrateRecentWorkspaces();
  }, [hydrateRecentWorkspaces]);

  useEffect(() => {
    void hydrateWorkspace(workspacePath);
  }, [hydrateWorkspace, workspacePath]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void fileService
      .onFilesChanged((payload) => {
        if (disposed) {
          return;
        }
        void refreshWorkspace(payload.paths);
      })
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }
        cleanup = unlisten;
      });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [refreshWorkspace]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void gitService
      .onSyncStatus((payload) => {
        if (disposed) {
          return;
        }
        handleSyncEvent(payload);
      })
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }
        cleanup = unlisten;
      });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [handleSyncEvent]);

  const commandPaletteFiles = useMemo(
    () => buildCommandPaletteItems(documents),
    [documents],
  );
  const wordCount = useMemo(
    () => countWords(currentDocument?.content ?? ""),
    [currentDocument?.content],
  );
  const syncTone =
    currentFile && unsavedChanges.has(currentFile) ? "pending" : "synced";
  const syncLabel =
    syncTone === "pending"
      ? "本地改动待同步（mock）"
      : "Git 状态已同步（mock）";

  const handleSelectHeading = (heading: OutlineHeading) => {
    const view = editorViewRef.current;
    if (!view) {
      return;
    }

    const position = findHeadingPosition(view.state.doc, heading);
    if (position === null) {
      return;
    }

    const target = Math.min(position + 1, view.state.doc.content.size);
    const selection = TextSelection.near(view.state.doc.resolve(target));
    view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
    view.focus();
  };

  const handleCreateQuickNote = () => {
    const nextPath = createNextNotePath(Object.keys(documents));
    void createFile(nextPath);
  };

  const handleOpenWorkspace = () => {
    void fileService.selectWorkspace().then((path) => {
      if (!path) {
        return;
      }
      void openWorkspace(path);
    });
  };

  const handleSelectWorkspace = (path: string) => {
    void openWorkspace(path).catch(async () => {
      await removeRecentWorkspace(path);
    });
  };

  const handleSelectSearchResult = (result: SearchResult, query: string) => {
    void openFile(result.path).then(() => {
      setPendingSearchJump({ path: result.path, query });
    });
  };

  const handleCommandPaletteSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || !workspacePath || !searchService.isNativeAvailable()) {
      return commandPaletteFiles;
    }

    const results = await searchService.searchFiles(trimmed);
    return searchResultsToCommandPaletteItems(results);
  };

  return (
    <>
      <AppLayout
        sidebar={
          <SidebarContent
            onSelectSearchResult={handleSelectSearchResult}
            workspacePath={workspacePath}
            onOpenWorkspace={handleOpenWorkspace}
            onSelectWorkspace={handleSelectWorkspace}
            onRemoveWorkspace={(path) => {
              void removeRecentWorkspace(path);
            }}
            recentWorkspaces={recentWorkspaces}
          />
        }
        tabBar={<TabBar />}
        editor={
          currentDocument ? (
            <div className="relative h-full min-h-0 bg-bg">
              <div ref={editorScrollRef} className="h-full overflow-auto">
                <RefinexEditor
                  documentPath={currentDocument.path}
                  value={currentDocument.content}
                  className="min-h-full px-6 py-5"
                  onChange={(markdown) => {
                    updateFileContent(currentDocument.path, markdown);

                    if (markdown === currentDocument.savedContent) {
                      markClean(currentDocument.path);
                      return;
                    }

                    markDirty(currentDocument.path);
                  }}
                  onCursorChange={setCursorPosition}
                  onEditorView={(view) => {
                    editorViewRef.current = view;
                  }}
                />
              </div>
              <DocumentOutlineDock
                markdown={currentDocument.content}
                editorViewRef={editorViewRef}
                scrollContainerRef={editorScrollRef}
                onSelectHeading={handleSelectHeading}
              />
            </div>
          ) : (
            <EmptyEditorState />
          )
        }
        rightPanel={
          <RightPanelContent
            currentFile={currentFile}
            workspacePath={workspacePath}
            activeTab={rightPanelTab}
            setActiveTab={setRightPanelTab}
          />
        }
        statusBar={
          <StatusBar
            syncLabel={syncLabel}
            syncTone={syncTone}
            cursor={cursorPosition}
            wordCount={wordCount}
            language={currentDocument?.language ?? "Markdown"}
            gitStatusSlot={
              <div className="flex items-center gap-2">
                <AccountStatus />
                <SyncStatus
                  onOpenHistory={() => setRightPanelTab("history")}
                  onOpenSettings={() => setRightPanelTab("setup")}
                />
              </div>
            }
          />
        }
        sidebarTitle=""
        rightPanelTitle=""
      />

      <CommandPalette
        files={commandPaletteFiles}
        theme={theme}
        searchFiles={handleCommandPaletteSearch}
        onCreateFile={handleCreateQuickNote}
        onOpenFile={(path) => {
          void openFile(path);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleTheme={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
      />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>应用设置（占位）</DialogTitle>
            <DialogDescription>
              Phase 4.1
              先把设置入口接到命令面板；完整设置面板会在后续阶段替换这里。
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-3xl border border-border/70 bg-bg/80 p-4 text-sm leading-6 text-muted">
            当前主题：<strong className="text-fg">{theme}</strong>
            ，当前激活标签：
            <strong className="text-fg">
              {activeTab
                ? ` ${documents[activeTab]?.name ?? activeTab}`
                : " 无"}
            </strong>
            。
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const hasResolvedAuth = useAuthStore((state) => state.hasResolvedAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const errorMessage = useAuthStore((state) => state.errorMessage);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  if (!hasResolvedAuth) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen />
        {errorMessage ? (
          <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-rose-300/20 bg-rose-400/12 px-4 py-2 text-sm text-rose-100 shadow-lg backdrop-blur">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
        ) : null}
      </>
    );
  }

  return <WorkspaceShell theme={theme} setTheme={setTheme} />;
}

export default App;

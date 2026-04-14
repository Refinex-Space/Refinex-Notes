import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  BrainCircuit,
  FileSearch,
  FolderOpen,
  GitBranch,
  LogOut,
  RefreshCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

import { CommandPalette } from "./components/CommandPalette";
import { LoginScreen } from "./components/auth/LoginScreen";
import { TabBar } from "./components/editor/TabBar";
import { AppLayout } from "./components/layout/AppLayout";
import { StatusBar } from "./components/layout/StatusBar";
import { HistoryPanel } from "./components/git/HistoryPanel";
import { SetupPanel } from "./components/git/SetupPanel";
import { SyncStatus } from "./components/git/SyncStatus";
import { FileTree } from "./components/sidebar/FileTree";
import { OutlinePanel } from "./components/sidebar/OutlinePanel";
import {
  buildCommandPaletteItems,
  countWords,
  createNextNotePath,
  findHeadingPosition,
} from "./components/app-shell-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { RefinexEditor } from "./editor";
import { fileService } from "./services/fileService";
import { gitService } from "./services/gitService";
import { useAuthStore } from "./stores/authStore";
import { useEditorStore } from "./stores/editorStore";
import { useGitStore } from "./stores/gitStore";
import { useNoteStore } from "./stores/noteStore";
import type { OutlineHeading } from "./types";

function SidebarContent({
  markdown,
  onSelectHeading,
  workspacePath,
  onOpenWorkspace,
}: {
  markdown: string;
  onSelectHeading: (heading: OutlineHeading) => void;
  workspacePath: string | null;
  onOpenWorkspace: () => void;
}) {
  const workspaceLabel = workspacePath?.split(/[\\/]/).filter(Boolean).at(-1) ?? null;
  const authenticatedUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,rgba(8,14,29,0.98),rgba(4,9,21,0.98))]">
      <section className="shrink-0 border-b border-border/70 p-4">
        <div className="rounded-[1.25rem] border border-white/6 bg-white/[0.03] p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted/90">
                Workspace
              </p>
              <p className="mt-2 truncate text-sm font-semibold text-fg">
                {workspaceLabel ?? "尚未打开本地工作区"}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {workspacePath ?? "选择一个本地目录后，这里会在侧栏里显示工作区路径与导航入口。"}
              </p>
              {authenticatedUser ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[11px] text-fg/90">
                  <Activity className="h-3.5 w-3.5 text-emerald-300" />
                  <span className="truncate">
                    GitHub 已连接：{authenticatedUser.login}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="rounded-full border border-white/6 bg-bg/70 p-2 text-muted">
              <FileSearch className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/6 bg-bg/60 px-3 py-2.5">
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-fg/70" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-fg/95">
                {workspacePath ?? "点击右侧按钮选择工作区"}
              </p>
              <p className="text-[11px] leading-5 text-muted">
                当前先以文件树导航为主，全局搜索下一阶段接入。
              </p>
            </div>
            <div className="shrink-0">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-fg transition hover:border-accent/35 hover:bg-accent/8 hover:text-accent"
                onClick={onOpenWorkspace}
              >
                打开
              </button>
            </div>
          </div>
          {authenticatedUser ? (
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted transition hover:text-rose-200"
              onClick={() => {
                void logout();
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              退出 GitHub
            </button>
          ) : null}
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col border-b border-border/70">
        <div className="border-b border-border/70 px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted/90">
            Files
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <FileTree />
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border/70 px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted/90">
            Outline
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <OutlinePanel markdown={markdown} onSelectHeading={onSelectHeading} />
        </div>
      </section>
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
  const startSync = useGitStore((state) => state.startSync);
  const syncStatus = useGitStore((state) => state.syncStatus);
  const isRunningAction = useGitStore((state) => state.isRunningAction);
  const errorMessage = useGitStore((state) => state.errorMessage);

  const showSetup = syncStatus === "not-initialized" || activeTab === "setup";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-accent" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-fg">Git Panel</p>
            <p className="text-xs text-muted">
              {showSetup ? "初始化或 clone 工作区仓库" : "查看当前文件的提交时间线"}
            </p>
          </div>
        </div>
        <div className="mt-3 inline-flex rounded-full border border-border/70 bg-white/[0.03] p-1">
          {(["history", "setup"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={[
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                activeTab === tab
                  ? "bg-accent/12 text-accent"
                  : "text-muted hover:text-fg",
              ].join(" ")}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "history" ? "历史" : "引导"}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {showSetup ? (
          <SetupPanel
            workspacePath={workspacePath}
            userLogin={user?.login ?? null}
            isBusy={isRunningAction}
            errorMessage={errorMessage}
            onInitRepo={() => {
              void initRepo().then(() => startSync());
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
        ) : (
          <HistoryPanel currentFile={currentFile} />
        )}
      </div>
    </div>
  );
}

function EmptyEditorState() {
  return (
    <div className="flex h-full items-center justify-center bg-bg/40">
      <div className="max-w-md rounded-3xl border border-border/70 bg-bg/80 p-6 text-center">
        <Wand2 className="mx-auto h-6 w-6 text-accent" />
        <h2 className="mt-4 text-lg font-semibold text-fg">没有打开的笔记</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          从左侧文件树打开一篇 Markdown，或通过 Cmd/Ctrl + K 新建一篇快速笔记。
        </p>
      </div>
    </div>
  );
}

function SplashScreen() {
  return (
    <main className="flex h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_38%),linear-gradient(180deg,#071120_0%,#050a17_55%,#03060f_100%)] px-6 text-fg">
      <section className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 text-center shadow-[0_24px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/18 bg-cyan-400/10 text-cyan-100">
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

  const workspacePath = useNoteStore((state) => state.workspacePath);
  const documents = useNoteStore((state) => state.documents);
  const currentFile = useNoteStore((state) => state.currentFile);
  const openWorkspace = useNoteStore((state) => state.openWorkspace);
  const openFile = useNoteStore((state) => state.openFile);
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
  const startSync = useGitStore((state) => state.startSync);
  const stopSync = useGitStore((state) => state.stopSync);
  const handleSyncEvent = useGitStore((state) => state.handleSyncEvent);

  const editorViewRef = useRef<EditorView | null>(null);

  const currentDocument = currentFile ? documents[currentFile] ?? null : null;

  useEffect(() => {
    setActiveTab(currentFile);
  }, [currentFile, setActiveTab]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") {
        return;
      }

      event.preventDefault();
      void saveCurrentFile();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveCurrentFile]);

  useEffect(() => {
    void hydrateWorkspace(workspacePath);
    if (!workspacePath || !gitService.isNativeAvailable()) {
      return;
    }

    void startSync();

    return () => {
      void stopSync();
    };
  }, [hydrateWorkspace, startSync, stopSync, workspacePath]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void fileService.onFilesChanged((payload) => {
      if (disposed) {
        return;
      }
      void refreshWorkspace(payload.paths);
    }).then((unlisten) => {
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

    void gitService.onSyncStatus((payload) => {
      if (disposed) {
        return;
      }
      handleSyncEvent(payload);
    }).then((unlisten) => {
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
  const syncTone = currentFile && unsavedChanges.has(currentFile) ? "pending" : "synced";
  const syncLabel =
    syncTone === "pending" ? "本地改动待同步（mock）" : "Git 状态已同步（mock）";

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

  return (
    <>
      <AppLayout
        title="Refinex Notes Workspace"
        sidebar={
          <SidebarContent
            markdown={currentDocument?.content ?? ""}
            onSelectHeading={handleSelectHeading}
            workspacePath={workspacePath}
            onOpenWorkspace={handleOpenWorkspace}
          />
        }
        tabBar={<TabBar />}
        editor={
          currentDocument ? (
            <div className="h-full min-h-0 overflow-auto bg-bg">
              <RefinexEditor
                key={currentDocument.path}
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
              <SyncStatus
                onOpenHistory={() => setRightPanelTab("history")}
                onOpenSettings={() => setRightPanelTab("setup")}
              />
            }
          />
        }
        sidebarTitle="Navigator"
        rightPanelTitle="Git"
      />

      <CommandPalette
        files={commandPaletteFiles}
        theme={theme}
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
              Phase 4.1 先把设置入口接到命令面板；完整设置面板会在后续阶段替换这里。
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-3xl border border-border/70 bg-bg/80 p-4 text-sm leading-6 text-muted">
            当前主题：<strong className="text-fg">{theme}</strong>
            ，当前激活标签：
            <strong className="text-fg">
              {activeTab ? ` ${documents[activeTab]?.name ?? activeTab}` : " 无"}
            </strong>
            。
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
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

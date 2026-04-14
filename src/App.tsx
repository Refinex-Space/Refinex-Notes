import { useEffect, useMemo, useRef, useState } from "react";
import {
  BrainCircuit,
  FileSearch,
  FolderOpen,
  GitBranch,
  Sparkles,
  Wand2,
} from "lucide-react";
import { TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

import { CommandPalette } from "./components/CommandPalette";
import { TabBar } from "./components/editor/TabBar";
import { AppLayout } from "./components/layout/AppLayout";
import { StatusBar } from "./components/layout/StatusBar";
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
import { useEditorStore } from "./stores/editorStore";
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
  return (
    <div className="flex h-full min-h-0 flex-col">
      <section className="border-b border-border/70 p-4">
        <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-bg/70 p-4">
          <FileSearch className="mt-0.5 h-4 w-4 text-accent" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-fg">Search</p>
            <p className="text-sm leading-6 text-muted">
              全局搜索会在下一阶段接入。当前先使用文件树 + 命令面板浏览工作区。
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-bg px-3 py-1.5 text-xs font-semibold text-fg transition hover:border-accent/50 hover:text-accent"
                onClick={onOpenWorkspace}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                选择工作区
              </button>
              <span className="truncate text-xs text-muted">
                {workspacePath ?? "当前仍在使用内置 mock 工作区"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="min-h-0 flex-1 border-b border-border/70">
        <div className="border-b border-border/70 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
            Files
          </p>
        </div>
        <div className="min-h-0 overflow-auto">
          <FileTree />
        </div>
      </section>

      <section className="min-h-0 flex-1">
        <div className="border-b border-border/70 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
            Outline
          </p>
        </div>
        <div className="min-h-0 overflow-auto">
          <OutlinePanel markdown={markdown} onSelectHeading={onSelectHeading} />
        </div>
      </section>
    </div>
  );
}

function RightPanelContent() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <section className="rounded-3xl border border-border/70 bg-bg/70 p-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-fg">AI Panel</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">
          这里会接入写作建议、总结和智能续写。本阶段保留应用壳位置与信息层级。
        </p>
      </section>

      <section className="rounded-3xl border border-border/70 bg-bg/70 p-4">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-fg">Git Panel</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">
          文件树里的 Git 颜色目前使用 mock 数据；真实 diff、history 和 sync 会在后续阶段落地。
        </p>
      </section>

      <section className="rounded-3xl border border-border/70 bg-accent/6 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-fg">Shell Notes</p>
        </div>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
          <li>1. 左右面板支持折叠与拖拽改宽</li>
          <li>2. 标签栏、状态栏和命令面板已接入共享 store</li>
          <li>3. 大纲点击会将编辑器滚动到对应标题</li>
        </ul>
      </section>
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

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const editorViewRef = useRef<EditorView | null>(null);

  const currentDocument = currentFile ? documents[currentFile] ?? null : null;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

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
            <div className="h-full overflow-auto bg-bg">
              <RefinexEditor
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
        rightPanel={<RightPanelContent />}
        statusBar={
          <StatusBar
            syncLabel={syncLabel}
            syncTone={syncTone}
            cursor={cursorPosition}
            wordCount={wordCount}
            language={currentDocument?.language ?? "Markdown"}
          />
        }
        sidebarTitle="Navigator"
        rightPanelTitle="AI / Git"
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

export default App;

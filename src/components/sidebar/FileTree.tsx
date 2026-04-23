import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  FileText,
  FolderClosed,
  FolderOpenDot,
  FolderOpen,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { useNoteStore } from "../../stores/noteStore";
import type { FileNode } from "../../types/notes";
import { setDocumentPerfSourceHint } from "../../utils/documentPerf";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import {
  getDefaultCreateFolderPath,
  getNodeDirectoryPath,
  isMarkdownPath,
} from "./sidebar-utils";
import { useGitStore } from "../../stores/gitStore";
import type { FileGitStatus } from "../../types/notes";

export function gitStatusTone(status: FileGitStatus | undefined) {
  switch (status) {
    case "added":
    case "untracked":
      return "text-emerald-400";
    case "modified":
      return "text-amber-400";
    case "deleted":
      return "text-rose-400";
    default:
      return "text-slate-500";
  }
}

function gitStatusLabel(status: FileGitStatus | undefined): string {
  switch (status) {
    case "added":
    case "untracked":
      return "A";
    case "modified":
      return "M";
    case "deleted":
      return "D";
    case "renamed":
      return "R";
    case "typechange":
      return "T";
    case "conflicted":
      return "C";
    default:
      return "";
  }
}

async function copyPath(path: string) {
  if (!navigator.clipboard) {
    return;
  }
  await navigator.clipboard.writeText(path);
}

function shouldRenderGitStatus(status: FileNode["gitStatus"]) {
  return status !== undefined && status !== "clean";
}

type DraftFileState = {
  directoryPath: string;
  value: string;
} | null;

export function FileTreeEmptyState({
  workspacePath,
  isLoading = false,
}: {
  workspacePath: string | null;
  isLoading?: boolean;
}) {
  const title = isLoading
    ? "正在载入工作区"
    : workspacePath
      ? "工作区为空"
      : "打开一个工作区";
  const caption = isLoading
    ? "先显示工作区外壳，目录会按需补全"
    : workspacePath
      ? "新建 Markdown 后会出现在这里"
      : "本地 Markdown / Git 仓库";

  return (
    <div className="w-full bg-[rgb(var(--color-bg)/0.9)] px-6 py-8">
      <div className="max-w-[14rem] text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-white/[0.05] text-fg/70">
          <FolderOpenDot className="h-6 w-6" />
        </div>
        <p className="mt-5 text-sm font-semibold tracking-tight text-fg">
          {title}
        </p>
        <p className="mt-2 text-xs leading-6 text-muted">{caption}</p>
      </div>
    </div>
  );
}

function FileRow({
  node,
  depth,
  currentFile,
  draftFile,
  onStartCreateFile,
  onDraftFileChange,
  onCommitDraftFile,
  onCancelDraftFile,
}: {
  node: FileNode;
  depth: number;
  currentFile: string | null;
  draftFile: DraftFileState;
  onStartCreateFile: (directoryPath: string) => void;
  onDraftFileChange: (value: string) => void;
  onCommitDraftFile: () => void;
  onCancelDraftFile: () => void;
}) {
  const openFile = useNoteStore((state) => state.openFile);
  const prefetchFile = useNoteStore((state) => state.prefetchFile);
  const loadDirectory = useNoteStore((state) => state.loadDirectory);
  const createFolder = useNoteStore((state) => state.createFolder);
  const renameFile = useNoteStore((state) => state.renameFile);
  const deleteFile = useNoteStore((state) => state.deleteFile);
  const loadingDirectories = useNoteStore((state) => state.loadingDirectories);
  const statusByPath = useGitStore((state) => state.statusByPath);
  const [isExpanded, setIsExpanded] = useState(false);

  const indentation = { paddingLeft: `${0.55 + depth * 0.9}rem` };
  const isCurrent = currentFile === node.path;
  const directoryPath = getNodeDirectoryPath(node);
  const effectiveGitStatus = statusByPath[node.path] ?? node.gitStatus;
  const isDirectoryLoading =
    node.isDir && loadingDirectories.includes(node.path);
  const canLoadDirectory = node.isDir && node.hasChildren && !node.isLoaded;
  const shouldShowDraftInDirectory =
    node.isDir && draftFile?.directoryPath === node.path;

  useEffect(() => {
    if (!shouldShowDraftInDirectory) {
      return;
    }

    setIsExpanded(true);
    if (canLoadDirectory && !isDirectoryLoading) {
      void loadDirectory(node.path);
    }
  }, [
    canLoadDirectory,
    isDirectoryLoading,
    loadDirectory,
    node.path,
    shouldShowDraftInDirectory,
  ]);

  const row = node.isDir ? (
    <div>
      <Accordion
        type="multiple"
        value={isExpanded ? [node.path] : []}
        onValueChange={(values) => {
          const nextExpanded = values.includes(node.path);
          setIsExpanded(nextExpanded);
          if (
            nextExpanded &&
            canLoadDirectory &&
            !isDirectoryLoading
          ) {
            void loadDirectory(node.path);
          }
        }}
      >
        <AccordionItem value={node.path} className="border-b-0">
          <AccordionTrigger
            className={[
              "!rounded-lg px-2.5 !py-1 !text-[13px] !font-medium !leading-[1.1rem]",
              "text-muted hover:bg-white/[0.04] hover:text-fg data-[state=open]:bg-white/[0.05] data-[state=open]:text-fg",
              // hide the built-in trailing chevron from accordion.tsx
              "[&>svg:last-child]:hidden",
              isCurrent ? "bg-accent/10 text-fg" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={indentation}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {/* chevron left of folder icon, rotates 90° when open */}
              <ChevronRight className="h-[11px] w-[11px] shrink-0 text-muted/50 transition-transform duration-150 group-data-[state=open]:rotate-90" />
              <span className="relative flex h-4 w-4 shrink-0 items-center justify-center text-fg/75">
                <FolderClosed className="h-3.5 w-3.5 group-data-[state=open]:hidden" />
                <FolderOpen className="hidden h-3.5 w-3.5 group-data-[state=open]:block" />
              </span>
              <span className="truncate">{node.name}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <div className="space-y-0 pt-px">
              {isDirectoryLoading ? (
                <div
                  className="px-2.5 py-1 text-[12px] text-muted"
                  style={{ paddingLeft: `${1.45 + depth * 0.9}rem` }}
                >
                  正在载入目录…
                </div>
              ) : null}
              {(node.children ?? []).map((child) => (
                <FileRow
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  currentFile={currentFile}
                  draftFile={draftFile}
                  onStartCreateFile={onStartCreateFile}
                  onDraftFileChange={onDraftFileChange}
                  onCommitDraftFile={onCommitDraftFile}
                  onCancelDraftFile={onCancelDraftFile}
                />
              ))}
              {shouldShowDraftInDirectory ? (
                <DraftFileRow
                  key={`${node.path}:draft`}
                  depth={depth + 1}
                  value={draftFile?.value ?? ""}
                  onChange={onDraftFileChange}
                  onCommit={onCommitDraftFile}
                  onCancel={onCancelDraftFile}
                />
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ) : (
    <button
      type="button"
      className={[
        "flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-left text-[13px] leading-[1.1rem] transition",
        "hover:bg-white/[0.04] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        isCurrent ? "bg-accent/10 text-fg" : gitStatusTone(effectiveGitStatus),
      ]
        .filter(Boolean)
        .join(" ")}
      style={indentation}
      onMouseEnter={() => {
        if (!isMarkdownPath(node.path)) {
          return;
        }
        void prefetchFile(node.path);
      }}
      onClick={() => {
        if (!isMarkdownPath(node.path)) {
          return;
        }
        setDocumentPerfSourceHint(node.path, "file-tree");
        void openFile(node.path);
      }}
      title={node.path}
    >
      {/* spacer matches ChevronRight width (w-[11px]) so file icon aligns with folder icon */}
      <span className="w-[11px] shrink-0" />
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        <FileText className="h-3.5 w-3.5 text-fg/55" />
      </span>
      <span className="truncate">{node.name}</span>
      {shouldRenderGitStatus(effectiveGitStatus) ? (
        <span
          className={[
            "ml-auto shrink-0 text-[10px] font-bold leading-none",
            gitStatusTone(effectiveGitStatus),
          ].join(" ")}
        >
          {gitStatusLabel(effectiveGitStatus)}
        </span>
      ) : null}
    </button>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem
          onSelect={() => {
            onStartCreateFile(directoryPath);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          新建文件
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            const nextPath = window.prompt(
              "新建文件夹路径",
              getDefaultCreateFolderPath(node),
            );
            if (!nextPath) {
              return;
            }
            void createFolder(nextPath);
          }}
        >
          <FolderPlus className="mr-2 h-4 w-4" />
          新建文件夹
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => {
            const nextPath = window.prompt("重命名路径", node.path);
            if (!nextPath || nextPath === node.path) {
              return;
            }
            void renameFile(node.path, nextPath);
          }}
        >
          <Pencil className="mr-2 h-4 w-4" />
          重命名
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            const confirmed = window.confirm(`删除 ${node.path}？`);
            if (!confirmed) {
              return;
            }
            void deleteFile(node.path);
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          删除
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => {
            void copyPath(node.isDir ? directoryPath : node.path);
          }}
        >
          <ChevronRight className="mr-2 h-4 w-4" />
          复制路径
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function DraftFileRow({
  depth,
  value,
  onChange,
  onCommit,
  onCancel,
}: {
  depth: number;
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const indentation = { paddingLeft: `${0.55 + depth * 0.9}rem` };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] leading-[1.1rem] text-fg"
      style={indentation}
    >
      <span className="w-[11px] shrink-0" />
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        <FileText className="h-3.5 w-3.5 text-fg/55" />
      </span>
      <input
        ref={inputRef}
        value={value}
        placeholder="输入文件名"
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCancel}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onCommit();
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
      />
    </div>
  );
}

export function FileTree() {
  const files = useNoteStore((state) => state.files);
  const workspacePath = useNoteStore((state) => state.workspacePath);
  const isWorkspaceLoading = useNoteStore((state) => state.isWorkspaceLoading);
  const currentFile = useNoteStore((state) => state.currentFile);
  const createFileInDirectory = useNoteStore((state) => state.createFileInDirectory);
  const [draftFile, setDraftFile] = useState<DraftFileState>(null);

  const handleCommitDraftFile = async () => {
    if (!draftFile) {
      return;
    }

    const nextDraft = draftFile;
    if (!nextDraft.value.trim()) {
      setDraftFile(null);
      return;
    }

    setDraftFile(null);
    await createFileInDirectory(nextDraft.directoryPath, nextDraft.value);
  };

  if (files.length === 0) {
    return (
      <FileTreeEmptyState
        workspacePath={workspacePath}
        isLoading={isWorkspaceLoading}
      />
    );
  }

  return (
    <div className="h-full overflow-auto bg-[rgb(var(--color-bg)/0.9)]">
      <FileTreeNodes
        files={files}
        currentFile={currentFile}
        draftFile={draftFile}
        onStartCreateFile={(directoryPath) => {
          setDraftFile({ directoryPath, value: "" });
        }}
        onDraftFileChange={(value) => {
          setDraftFile((previous) =>
            previous ? { ...previous, value } : previous,
          );
        }}
        onCommitDraftFile={() => {
          void handleCommitDraftFile();
        }}
        onCancelDraftFile={() => {
          setDraftFile(null);
        }}
      />
    </div>
  );
}

export function FileTreeNodes({
  files,
  currentFile,
  draftFile,
  onStartCreateFile,
  onDraftFileChange,
  onCommitDraftFile,
  onCancelDraftFile,
}: {
  files: readonly FileNode[];
  currentFile: string | null;
  draftFile: DraftFileState;
  onStartCreateFile: (directoryPath: string) => void;
  onDraftFileChange: (value: string) => void;
  onCommitDraftFile: () => void;
  onCancelDraftFile: () => void;
}) {
  return (
    <div className="space-y-0.5 px-2 py-2">
      {files.map((node) => (
        <FileRow
          key={node.path}
          node={node}
          depth={0}
          currentFile={currentFile}
          draftFile={draftFile}
          onStartCreateFile={onStartCreateFile}
          onDraftFileChange={onDraftFileChange}
          onCommitDraftFile={onCommitDraftFile}
          onCancelDraftFile={onCancelDraftFile}
        />
      ))}
      {draftFile?.directoryPath === "" ? (
        <DraftFileRow
          key="root:draft"
          depth={0}
          value={draftFile.value}
          onChange={onDraftFileChange}
          onCommit={onCommitDraftFile}
          onCancel={onCancelDraftFile}
        />
      ) : null}
    </div>
  );
}

export default FileTree;

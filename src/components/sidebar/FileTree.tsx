import {
  ChevronRight,
  Circle,
  FileText,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { useNoteStore } from "../../stores/noteStore";
import type { FileNode } from "../../types/notes";
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
  getDefaultCreateFilePath,
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

async function copyPath(path: string) {
  if (!navigator.clipboard) {
    return;
  }
  await navigator.clipboard.writeText(path);
}

function shouldRenderGitStatus(status: FileNode["gitStatus"]) {
  return status !== undefined && status !== "clean";
}

function FileRow({
  node,
  depth,
  currentFile,
}: {
  node: FileNode;
  depth: number;
  currentFile: string | null;
}) {
  const openFile = useNoteStore((state) => state.openFile);
  const createFile = useNoteStore((state) => state.createFile);
  const createFolder = useNoteStore((state) => state.createFolder);
  const renameFile = useNoteStore((state) => state.renameFile);
  const deleteFile = useNoteStore((state) => state.deleteFile);
  const statusByPath = useGitStore((state) => state.statusByPath);

  const indentation = { paddingLeft: `${0.55 + depth * 0.9}rem` };
  const isCurrent = currentFile === node.path;
  const directoryPath = getNodeDirectoryPath(node);
  const effectiveGitStatus = statusByPath[node.path] ?? node.gitStatus;

  const row = node.isDir ? (
    <div>
      <Accordion type="multiple">
        <AccordionItem value={node.path} className="border-b-0">
          <AccordionTrigger
            className={[
              "rounded-lg px-2.5 py-1.5 text-[13px] font-medium leading-5",
              "text-muted hover:bg-white/[0.04] hover:text-fg data-[state=open]:bg-white/[0.05] data-[state=open]:text-fg",
              isCurrent ? "bg-accent/10 text-fg" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={indentation}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="relative flex h-4 w-4 shrink-0 items-center justify-center text-fg/75">
                <FolderClosed className="h-3.5 w-3.5 group-data-[state=open]:hidden" />
                <FolderOpen className="hidden h-3.5 w-3.5 group-data-[state=open]:block" />
              </span>
              <span className="truncate">{node.name}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <div className="space-y-px pt-0.5">
              {(node.children ?? []).map((child) => (
                <FileRow
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  currentFile={currentFile}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ) : (
    <button
      type="button"
      className={[
        "flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] leading-5 transition",
        "hover:bg-white/[0.04] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        isCurrent ? "bg-accent/10 text-fg" : gitStatusTone(effectiveGitStatus),
      ]
        .filter(Boolean)
        .join(" ")}
      style={indentation}
      onClick={() => {
        if (!isMarkdownPath(node.path)) {
          return;
        }
        void openFile(node.path);
      }}
      title={node.path}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 text-fg/55" />
      <span className="truncate">{node.name}</span>
      {shouldRenderGitStatus(effectiveGitStatus) ? (
        <Circle
          className={[
            "ml-auto h-2 w-2 shrink-0 fill-current",
            gitStatusTone(effectiveGitStatus),
          ].join(" ")}
        />
      ) : null}
    </button>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem
          onSelect={() => {
            const nextPath = window.prompt("新建文件路径", getDefaultCreateFilePath(node));
            if (!nextPath) {
              return;
            }
            void createFile(nextPath);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          新建文件
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            const nextPath = window.prompt("新建文件夹路径", getDefaultCreateFolderPath(node));
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

export function FileTree() {
  const files = useNoteStore((state) => state.files);
  const workspacePath = useNoteStore((state) => state.workspacePath);
  const currentFile = useNoteStore((state) => state.currentFile);

  if (files.length === 0) {
    return (
      <div className="p-4 text-sm text-muted">
        {workspacePath
          ? "当前工作区中没有可显示的文件。"
          : "还没有选择工作区，点击上方按钮打开本地文件夹。"}
      </div>
    );
  }

  return <FileTreeNodes files={files} currentFile={currentFile} />;
}

export function FileTreeNodes({
  files,
  currentFile,
}: {
  files: readonly FileNode[];
  currentFile: string | null;
}) {
  return (
    <div className="space-y-px px-2 py-2">
      {files.map((node) => (
        <FileRow
          key={node.path}
          node={node}
          depth={0}
          currentFile={currentFile}
        />
      ))}
    </div>
  );
}

export default FileTree;

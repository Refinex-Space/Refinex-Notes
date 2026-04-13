import {
  ChevronRight,
  Circle,
  FileText,
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

function gitStatusTone(status: FileNode["gitStatus"]) {
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

  const indentation = { paddingLeft: `${depth * 0.75}rem` };
  const isCurrent = currentFile === node.path;
  const directoryPath = getNodeDirectoryPath(node);

  const row = node.isDir ? (
    <div>
      <Accordion type="multiple" defaultValue={[node.path]}>
        <AccordionItem value={node.path} className="border-b-0">
          <AccordionTrigger
            className={[
              "rounded-xl px-3 py-2 hover:bg-accent/8",
              isCurrent ? "bg-accent/10 text-fg" : "text-fg",
            ]
              .filter(Boolean)
              .join(" ")}
            style={indentation}
          >
            <span className="flex min-w-0 items-center gap-2">
              <FolderOpen className="h-4 w-4 shrink-0 text-accent" />
              <span className="truncate">{node.name}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <div className="space-y-1">
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
        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition",
        "hover:bg-accent/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        isCurrent ? "bg-accent/12 text-fg" : "text-muted",
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
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{node.name}</span>
      <Circle className={["ml-auto h-2.5 w-2.5 fill-current", gitStatusTone(node.gitStatus)].join(" ")} />
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
  const currentFile = useNoteStore((state) => state.currentFile);

  if (files.length === 0) {
    return (
      <div className="p-4 text-sm text-muted">
        还没有文件，右键侧边栏可创建新的笔记或文件夹。
      </div>
    );
  }

  return (
    <div className="space-y-1 p-3">
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

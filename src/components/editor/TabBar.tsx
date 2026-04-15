import { FileText, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";

import { useEditorStore } from "../../stores/editorStore";
import { useNoteStore } from "../../stores/noteStore";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

type DropPosition = "before" | "after";

interface DropIndicator {
  path: string;
  position: DropPosition;
}

export const TAB_RAIL_CLASS_NAME =
  "flex h-auto w-full justify-start overflow-x-auto rounded-[1.35rem] border-border/60 bg-[rgb(var(--color-bg)/0.82)] px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export const TAB_WRAPPER_CLASS_NAME =
  "group/tab relative flex min-w-[132px] max-w-[260px] shrink-0 items-stretch";

export const TAB_TRIGGER_CLASS_NAME =
  "relative flex h-8 w-full items-center justify-start rounded-[0.95rem] border border-transparent bg-transparent pl-2.5 pr-8 text-[12.5px] leading-4 text-muted";

export function getTabActionAvailability(openFiles: readonly string[], path: string) {
  const index = openFiles.indexOf(path);
  if (index === -1) {
    return {
      canCloseAll: openFiles.length > 0,
      canCloseOthers: false,
      canCloseLeft: false,
      canCloseRight: false,
    };
  }

  return {
    canCloseAll: openFiles.length > 0,
    canCloseOthers: openFiles.length > 1,
    canCloseLeft: index > 0,
    canCloseRight: index < openFiles.length - 1,
  };
}

function resolveDropPosition(
  event: Pick<DragEvent<HTMLElement>, "clientX" | "currentTarget">,
): DropPosition {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientX < rect.left + rect.width / 2 ? "before" : "after";
}

export function TabBar() {
  const openFiles = useNoteStore((state) => state.openFiles);
  const currentFile = useNoteStore((state) => state.currentFile);
  const documents = useNoteStore((state) => state.documents);
  const openFile = useNoteStore((state) => state.openFile);
  const closeFile = useNoteStore((state) => state.closeFile);
  const closeAllFiles = useNoteStore((state) => state.closeAllFiles);
  const closeOtherFiles = useNoteStore((state) => state.closeOtherFiles);
  const closeFilesToLeft = useNoteStore((state) => state.closeFilesToLeft);
  const closeFilesToRight = useNoteStore((state) => state.closeFilesToRight);
  const reorderOpenFiles = useNoteStore((state) => state.reorderOpenFiles);

  const activeTab = useEditorStore((state) => state.activeTab);
  const unsavedChanges = useEditorStore((state) => state.unsavedChanges);
  const setActiveTab = useEditorStore((state) => state.setActiveTab);

  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [draggingPath, setDraggingPath] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

  const activeValue = activeTab ?? currentFile ?? undefined;
  const hasMultipleTabs = openFiles.length > 1;

  const syncActiveTab = () => {
    setActiveTab(useNoteStore.getState().currentFile);
  };

  useEffect(() => {
    if (!activeValue) {
      return;
    }

    const activeNode = tabRefs.current[activeValue];
    activeNode?.scrollIntoView?.({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeValue]);

  if (openFiles.length === 0) {
    return (
      <div className="flex h-9 items-center px-3 text-[13px] text-muted">
        暂无打开的笔记
      </div>
    );
  }

  const tabAction = async (
    action: "close" | "closeAll" | "closeOthers" | "closeLeft" | "closeRight",
    path: string,
  ) => {
    if (action === "close") {
      await closeFile(path);
      syncActiveTab();
      return;
    }

    if (action === "closeAll") {
      await closeAllFiles();
      syncActiveTab();
      return;
    }

    if (action === "closeOthers") {
      await closeOtherFiles(path);
      syncActiveTab();
      return;
    }

    if (action === "closeLeft") {
      await closeFilesToLeft(path);
      syncActiveTab();
      return;
    }

    await closeFilesToRight(path);
    syncActiveTab();
  };

  const renderedTabs = useMemo(
    () =>
      openFiles.map((path) => {
        const document = documents[path];
        if (!document) {
          return null;
        }

        const isDirty = unsavedChanges.has(path);
        const isActive = activeValue === path;
        const actionAvailability = getTabActionAvailability(openFiles, path);

        return (
          <ContextMenu key={path}>
            <ContextMenuTrigger asChild>
              <div
                ref={(node) => {
                  tabRefs.current[path] = node;
                }}
                draggable={hasMultipleTabs}
                className={[
                  TAB_WRAPPER_CLASS_NAME,
                  draggingPath === path ? "scale-[0.985] opacity-55" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseDown={(event) => {
                  if (event.button !== 1) {
                    return;
                  }
                  event.preventDefault();
                  void tabAction("close", path);
                }}
                onDragStart={(event) => {
                  if (!hasMultipleTabs) {
                    return;
                  }
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", path);
                  setDraggingPath(path);
                }}
                onDragOver={(event) => {
                  if (!draggingPath || draggingPath === path) {
                    return;
                  }
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropIndicator({
                    path,
                    position: resolveDropPosition(event),
                  });
                }}
                onDrop={(event) => {
                  if (!draggingPath || draggingPath === path) {
                    return;
                  }
                  event.preventDefault();
                  const targetIndex = openFiles.indexOf(path);
                  if (targetIndex === -1) {
                    return;
                  }

                  const position = resolveDropPosition(event);
                  reorderOpenFiles(
                    draggingPath,
                    targetIndex + (position === "after" ? 1 : 0),
                  );
                  setDropIndicator(null);
                  setDraggingPath(null);
                }}
                onDragEnd={() => {
                  setDropIndicator(null);
                  setDraggingPath(null);
                }}
              >
                {dropIndicator?.path === path && dropIndicator.position === "before" ? (
                  <span className="pointer-events-none absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent/80" />
                ) : null}

                <TabsTrigger
                  value={path}
                  className={[
                    TAB_TRIGGER_CLASS_NAME,
                    "hover:border-border/45 hover:bg-white/[0.05] hover:text-fg",
                    "focus-visible:ring-accent/25",
                    isActive ? "border-border/70 bg-white/[0.08] text-fg" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <FileText
                      className={[
                        "h-3.5 w-3.5 shrink-0",
                        isActive ? "text-accent" : "text-accent/80",
                      ].join(" ")}
                    />
                    <span className="truncate">{document.name}</span>
                    {isDirty ? (
                      <span
                        aria-label="未保存修改"
                        className="h-1.5 w-1.5 rounded-full bg-accent/90"
                      />
                    ) : null}
                  </span>
                </TabsTrigger>

                <button
                  type="button"
                  className={[
                    "absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted/80 transition",
                    "hover:bg-white/[0.08] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25",
                    isActive || isDirty
                      ? "opacity-100"
                      : "opacity-0 group-hover/tab:opacity-100 group-focus-within/tab:opacity-100",
                  ].join(" ")}
                  aria-label={`关闭 ${document.name}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void tabAction("close", path);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                {dropIndicator?.path === path && dropIndicator.position === "after" ? (
                  <span className="pointer-events-none absolute inset-y-1 right-0 w-0.5 rounded-full bg-accent/80" />
                ) : null}
              </div>
            </ContextMenuTrigger>

            <ContextMenuContent className="w-48">
              <ContextMenuLabel>标签操作</ContextMenuLabel>
              <ContextMenuItem onSelect={() => void tabAction("close", path)}>
                关闭当前
              </ContextMenuItem>
              <ContextMenuItem
                disabled={!actionAvailability.canCloseOthers}
                onSelect={() => void tabAction("closeOthers", path)}
              >
                关闭其他
              </ContextMenuItem>
              <ContextMenuItem
                disabled={!actionAvailability.canCloseLeft}
                onSelect={() => void tabAction("closeLeft", path)}
              >
                关闭左侧
              </ContextMenuItem>
              <ContextMenuItem
                disabled={!actionAvailability.canCloseRight}
                onSelect={() => void tabAction("closeRight", path)}
              >
                关闭右侧
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                disabled={!actionAvailability.canCloseAll}
                onSelect={() => void tabAction("closeAll", path)}
              >
                关闭全部
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      }),
    [
      activeValue,
      closeAllFiles,
      closeFile,
      closeFilesToLeft,
      closeFilesToRight,
      closeOtherFiles,
      documents,
      draggingPath,
      dropIndicator,
      hasMultipleTabs,
      openFiles,
      reorderOpenFiles,
      unsavedChanges,
    ],
  );

  return (
    <Tabs
      value={activeValue}
      onValueChange={(path) => {
        void openFile(path);
        setActiveTab(path);
      }}
    >
      <TabsList className={TAB_RAIL_CLASS_NAME}>
        {renderedTabs}
      </TabsList>
    </Tabs>
  );
}

export default TabBar;

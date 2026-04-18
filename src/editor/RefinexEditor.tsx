import { useCallback, useEffect, useRef, useState } from "react";
import { EditorState, type Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";

import { refinexInputRules } from "./plugins/input-rules";
import { refinexParser, parseMarkdown } from "./parser";
import { inlineSyncPlugin } from "./plugins/inline-sync";
import { refinexKeymap } from "./plugins/keymap";
import { placeholderPlugin } from "./plugins/placeholder";
import { findReplacePlugin } from "./plugins/find-replace";
import { slashMenuPlugin } from "./plugins/slash-menu";
import { refinexSerializer, serializeMarkdown } from "./serializer";
import {
  ensureTrailingParagraph,
  stripTrailingParagraph,
  trailingNodePlugin,
} from "./plugins/trailing-node";
import { CodeBlockView } from "./node-views/CodeBlockView";
import { ImageView } from "./node-views/ImageView";
import { LinkPopover, type LinkPopoverRequest } from "./ui/LinkPopover";
import { LinkHoverTooltip } from "./ui/LinkHoverTooltip";
import { FloatingToolbar } from "./ui/FloatingToolbar";
import { SlashMenu, type SlashMenuRequest } from "./ui/SlashMenu";
import {
  findLinkMarkAtPos,
  getLinkEditorRequest,
  getLinkHoverAnchorRect,
  getSelectionAnchorRect,
  handleImageFileDrop,
  type PopoverAnchorRect,
} from "./rich-ui";
import {
  finishDocumentPerfTrace,
  logDocumentPerfStep,
} from "../utils/documentPerf";
import "./editor.css";

export interface EditorCursorPosition {
  line: number;
  col: number;
}

export interface RefinexEditorProps {
  /** 当前文档路径，用于缓存和切换判断 */
  documentPath?: string;
  /** Markdown 内容（受控） */
  value: string;
  /** 内容变更时回调，参数为序列化后的 Markdown 字符串 */
  onChange?: (markdown: string) => void;
  /** 只读模式 */
  readOnly?: boolean;
  /** 容器 className */
  className?: string;
  /** 光标变化时回调 */
  onCursorChange?: (position: EditorCursorPosition) => void;
  /** EditorView 生命周期回调 */
  onEditorView?: (view: EditorView | null) => void;
  /** 是否展示原始 Markdown 源码模式（raw textarea） */
  sourceMode?: boolean;
  /** 切换源码/富文本模式时的回调 */
  onToggleSourceMode?: () => void;
}

const MARKDOWN_FLUSH_DELAY_MS = 120;
const PARSED_DOCUMENT_CACHE_LIMIT = 8;
const EDITOR_STATE_CACHE_LIMIT = 8;
const parsedDocumentCache = new Map<string, ProseMirrorNode>();

type IdleHandle = number | ReturnType<typeof globalThis.setTimeout>;
type EditorStateResolution = {
  state: EditorState;
  editorStateCacheHit: boolean;
  parseCacheHit?: boolean;
  parseDurationMs: number;
  createStateDurationMs: number;
};

function requestIdleFlush(callback: () => void) {
  if ("requestIdleCallback" in window) {
    return {
      kind: "idle" as const,
      id: window.requestIdleCallback(callback, {
        timeout: MARKDOWN_FLUSH_DELAY_MS,
      }),
    };
  }

  return {
    kind: "timeout" as const,
    id: globalThis.setTimeout(callback, MARKDOWN_FLUSH_DELAY_MS),
  };
}

function cancelIdleFlush(
  handle: { kind: "idle" | "timeout"; id: IdleHandle } | null,
) {
  if (!handle) {
    return;
  }

  if (handle.kind === "idle" && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(handle.id as number);
    return;
  }

  globalThis.clearTimeout(handle.id);
}

export function getDocumentCacheKey(
  documentPath: string | undefined,
  value: string,
) {
  return `${documentPath ?? "__anonymous__"}\u0000${value}`;
}

function rememberParsedDocument(cacheKey: string, doc: ProseMirrorNode) {
  if (parsedDocumentCache.has(cacheKey)) {
    parsedDocumentCache.delete(cacheKey);
  }
  parsedDocumentCache.set(cacheKey, doc);

  while (parsedDocumentCache.size > PARSED_DOCUMENT_CACHE_LIMIT) {
    const oldestKey = parsedDocumentCache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    parsedDocumentCache.delete(oldestKey);
  }
}

function getParsedDocument(
  documentPath: string | undefined,
  value: string,
): {
  doc: ProseMirrorNode;
  parseCacheHit: boolean;
  parseDurationMs: number;
} {
  const cacheKey = getDocumentCacheKey(documentPath, value);
  const cached = parsedDocumentCache.get(cacheKey);
  if (cached) {
    parsedDocumentCache.delete(cacheKey);
    parsedDocumentCache.set(cacheKey, cached);
    return {
      doc: cached,
      parseCacheHit: true,
      parseDurationMs: 0,
    };
  }

  const parseStartedAt = globalThis.performance?.now() ?? Date.now();
  const doc = ensureTrailingParagraph(parseMarkdown(value));
  rememberParsedDocument(cacheKey, doc);
  return {
    doc,
    parseCacheHit: false,
    parseDurationMs: Number(
      ((globalThis.performance?.now() ?? Date.now()) - parseStartedAt).toFixed(
        2,
      ),
    ),
  };
}

function rememberEditorState(
  cache: Map<string, EditorState>,
  documentPath: string | undefined,
  value: string,
  state: EditorState,
) {
  const cacheKey = getDocumentCacheKey(documentPath, value);
  if (cache.has(cacheKey)) {
    cache.delete(cacheKey);
  }
  cache.set(cacheKey, state);

  while (cache.size > EDITOR_STATE_CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    cache.delete(oldestKey);
  }
}

function getOrCreateEditorState(
  cache: Map<string, EditorState>,
  documentPath: string | undefined,
  value: string,
  plugins: readonly Plugin[],
): EditorStateResolution {
  const cacheKey = getDocumentCacheKey(documentPath, value);
  const cached = cache.get(cacheKey);
  if (cached) {
    cache.delete(cacheKey);
    cache.set(cacheKey, cached);
    return {
      state: cached,
      editorStateCacheHit: true,
      parseDurationMs: 0,
      createStateDurationMs: 0,
    };
  }

  const { doc, parseCacheHit, parseDurationMs } = getParsedDocument(
    documentPath,
    value,
  );
  const createStateStartedAt = globalThis.performance?.now() ?? Date.now();
  const state = EditorState.create({
    doc,
    plugins: [...plugins],
  });
  rememberEditorState(cache, documentPath, value, state);
  return {
    state,
    editorStateCacheHit: false,
    parseCacheHit,
    parseDurationMs,
    createStateDurationMs: Number(
      (
        (globalThis.performance?.now() ?? Date.now()) - createStateStartedAt
      ).toFixed(2),
    ),
  };
}

export function shouldSyncExternalValue(
  previousDocumentPath: string | undefined,
  previousValue: string,
  nextDocumentPath: string | undefined,
  nextValue: string,
) {
  return (
    previousDocumentPath !== nextDocumentPath || previousValue !== nextValue
  );
}

export function shouldRefreshOverlay(
  selectionSet: boolean,
  storedMarksSet: boolean,
  hasVisibleSelection: boolean,
) {
  return selectionSet || storedMarksSet || hasVisibleSelection;
}

export function shouldFlushBeforeExternalSync(
  hasPendingMarkdown: boolean,
  previousDocumentPath: string | undefined,
  previousValue: string,
  nextDocumentPath: string | undefined,
  nextValue: string,
) {
  return (
    hasPendingMarkdown &&
    shouldSyncExternalValue(
      previousDocumentPath,
      previousValue,
      nextDocumentPath,
      nextValue,
    )
  );
}

function countTextblockLines(text: string) {
  return Math.max(1, text.split("\n").length);
}

function reportCursorPositionSafely(
  state: EditorState,
  callback: ((position: EditorCursorPosition) => void) | undefined,
) {
  if (!callback) {
    return;
  }

  try {
    callback(getCursorPosition(state));
  } catch (error) {
    console.error("计算编辑器光标位置失败", error);
    callback({ line: 1, col: 1 });
  }
}

function serializeMarkdownSafely(state: EditorState): string {
  try {
    return serializeMarkdown(stripTrailingParagraph(state.doc));
  } catch (error) {
    console.error("序列化编辑器内容失败", error);
    return "";
  }
}

export function serializeEditorState(state: EditorState): string {
  return serializeMarkdownSafely(state);
}

function getCursorPositionFallback(state: EditorState): EditorCursorPosition {
  const { $from } = state.selection;
  const blockPosition = $from.depth > 0 ? $from.before($from.depth) : 0;
  const currentBlockTextBefore = $from.parent.textBetween(
    0,
    $from.parentOffset,
    "\n",
    "\n",
  );
  const lines = currentBlockTextBefore.split("\n");
  const currentLine = lines.at(-1) ?? "";
  let line = 1;

  state.doc.descendants((node, pos) => {
    if (!node.isTextblock || pos >= blockPosition) {
      return false;
    }

    line += countTextblockLines(
      node.textBetween(0, node.content.size, "\n", "\n"),
    );
    return false;
  });

  return {
    line: line + lines.length - 1,
    col: currentLine.length + 1,
  };
}

export function getCursorPosition(state: EditorState): EditorCursorPosition {
  try {
    const textBeforeSelection = state.doc.textBetween(
      0,
      state.selection.from,
      "\n",
      "\n",
    );
    const lines = textBeforeSelection.split("\n");
    const currentLine = lines.at(-1) ?? "";

    return {
      line: lines.length,
      col: currentLine.length + 1,
    };
  } catch {
    return getCursorPositionFallback(state);
  }
}

export function RefinexEditor({
  documentPath,
  value,
  onChange,
  readOnly = false,
  className,
  onCursorChange,
  onEditorView,
  sourceMode = false,
  onToggleSourceMode,
}: RefinexEditorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const readOnlyRef = useRef(readOnly);
  const onCursorChangeRef = useRef(onCursorChange);
  const onEditorViewRef = useRef(onEditorView);
  const viewDocumentPathRef = useRef(documentPath);
  const lastAppliedValueRef = useRef(value);
  const lastAppliedDocumentPathRef = useRef(documentPath);
  const pendingMarkdownHandleRef = useRef<{
    kind: "idle" | "timeout";
    id: IdleHandle;
  } | null>(null);
  const pendingMarkdownRef = useRef(false);
  const editorPluginsRef = useRef<Plugin[]>([]);
  const editorStateCacheRef = useRef<Map<string, EditorState>>(new Map());
  const openLinkPopoverRef = useRef<(view: EditorView) => boolean>(() => false);
  const onToggleSourceModeRef = useRef(onToggleSourceMode);
  const sourceTextareaRef = useRef<HTMLTextAreaElement>(null);
  const slashMenuChangeRef = useRef((_request: SlashMenuRequest | null) => {});
  const hideHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [overlayVersion, setOverlayVersion] = useState(0);
  const [linkPopoverRequest, setLinkPopoverRequest] =
    useState<LinkPopoverRequest | null>(null);
  const [slashMenuRequest, setSlashMenuRequest] =
    useState<SlashMenuRequest | null>(null);
  const [linkHoverState, setLinkHoverState] = useState<{
    from: number;
    to: number;
    href: string;
    title: string;
    anchor: PopoverAnchorRect;
  } | null>(null);

  const cancelHoverHide = useCallback(() => {
    if (hideHoverTimerRef.current) {
      clearTimeout(hideHoverTimerRef.current);
      hideHoverTimerRef.current = null;
    }
  }, []);

  const scheduleHoverHide = useCallback(() => {
    if (hideHoverTimerRef.current) {
      clearTimeout(hideHoverTimerRef.current);
    }
    hideHoverTimerRef.current = setTimeout(() => {
      setLinkHoverState(null);
      hideHoverTimerRef.current = null;
    }, 1500);
  }, []);

  // Dismiss the hover tooltip immediately on any scroll while it's visible.
  useEffect(() => {
    if (!linkHoverState) return;
    const dismiss = () => {
      if (hideHoverTimerRef.current) {
        clearTimeout(hideHoverTimerRef.current);
        hideHoverTimerRef.current = null;
      }
      setLinkHoverState(null);
    };
    window.addEventListener("scroll", dismiss, {
      capture: true,
      passive: true,
    });
    return () =>
      window.removeEventListener("scroll", dismiss, { capture: true });
  }, [linkHoverState]);

  // Keep refs in sync with latest props without re-triggering effects
  onChangeRef.current = onChange;
  readOnlyRef.current = readOnly;
  onCursorChangeRef.current = onCursorChange;
  onEditorViewRef.current = onEditorView;
  onToggleSourceModeRef.current = onToggleSourceMode;
  openLinkPopoverRef.current = (view) => {
    const request = getLinkEditorRequest(view.state);
    if (!request) {
      return false;
    }

    setLinkPopoverRequest({
      ...request,
      anchor: getSelectionAnchorRect(view, request.from, request.to),
    });
    return true;
  };
  slashMenuChangeRef.current = (request) => {
    setSlashMenuRequest(request);
  };

  const flushPendingMarkdown = (state: EditorState) => {
    if (!pendingMarkdownRef.current || !onChangeRef.current) {
      cancelIdleFlush(pendingMarkdownHandleRef.current);
      pendingMarkdownHandleRef.current = null;
      pendingMarkdownRef.current = false;
      return;
    }

    cancelIdleFlush(pendingMarkdownHandleRef.current);
    pendingMarkdownHandleRef.current = null;
    pendingMarkdownRef.current = false;

    const flushStartedAt = globalThis.performance?.now() ?? Date.now();
    const markdown = serializeMarkdownSafely(state);
    lastAppliedValueRef.current = markdown;
    lastAppliedDocumentPathRef.current = viewDocumentPathRef.current;
    rememberEditorState(
      editorStateCacheRef.current,
      viewDocumentPathRef.current,
      markdown,
      state,
    );
    logDocumentPerfStep("editor.flush.end", {
      path: viewDocumentPathRef.current ?? "__anonymous__",
      durationMs: Number(
        (
          (globalThis.performance?.now() ?? Date.now()) - flushStartedAt
        ).toFixed(2),
      ),
      markdownLength: markdown.length,
    });
    onChangeRef.current(markdown);
  };

  const scheduleMarkdownFlush = () => {
    pendingMarkdownRef.current = true;
    cancelIdleFlush(pendingMarkdownHandleRef.current);
    pendingMarkdownHandleRef.current = requestIdleFlush(() => {
      const view = viewRef.current;
      if (!view) {
        return;
      }
      flushPendingMarkdown(view.state);
    });
  };

  // Initialize EditorView once on mount
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const mountStartedAt = globalThis.performance?.now() ?? Date.now();

    const plugins = [
      refinexKeymap({
        onOpenLinkPopover: (view) => openLinkPopoverRef.current(view),
        onToggleSourceMode: () => onToggleSourceModeRef.current?.(),
      }),
      keymap(baseKeymap),
      refinexInputRules(),
      inlineSyncPlugin(refinexParser, refinexSerializer),
      slashMenuPlugin({
        onChange: (trigger, view) => {
          slashMenuChangeRef.current(
            trigger
              ? {
                  ...trigger,
                  anchor: getSelectionAnchorRect(
                    view,
                    trigger.from,
                    trigger.to,
                  ),
                }
              : null,
          );
        },
      }),
      trailingNodePlugin(),
      placeholderPlugin(),
      findReplacePlugin(),
      history(),
      dropCursor(),
      gapCursor(),
    ];
    editorPluginsRef.current = plugins;

    const stateResolution = getOrCreateEditorState(
      editorStateCacheRef.current,
      documentPath,
      value,
      plugins,
    );
    logDocumentPerfStep("editor.mount.statePrepared", {
      path: documentPath ?? "__anonymous__",
      editorStateCacheHit: stateResolution.editorStateCacheHit,
      parseCacheHit: stateResolution.parseCacheHit,
      parseDurationMs: stateResolution.parseDurationMs,
      createStateDurationMs: stateResolution.createStateDurationMs,
      valueLength: value.length,
    });

    const view = new EditorView(mount, {
      state: stateResolution.state,
      editable: () => !readOnlyRef.current,
      handleDrop(view, event) {
        return handleImageFileDrop(view, event);
      },
      nodeViews: {
        code_block: (node, view, getPos) =>
          new CodeBlockView(node, view, getPos),
        image: (node, view, getPos) => new ImageView(node, view, getPos),
      },
      dispatchTransaction(transaction) {
        const result = view.state.applyTransaction(transaction);
        view.updateState(result.state);
        const needsOverlayRefresh = result.transactions.some(
          (nextTransaction) =>
            shouldRefreshOverlay(
              nextTransaction.selectionSet,
              nextTransaction.storedMarksSet,
              !result.state.selection.empty,
            ),
        );
        if (needsOverlayRefresh) {
          setOverlayVersion((current) => current + 1);
        }
        reportCursorPositionSafely(result.state, onCursorChangeRef.current);

        if (
          result.transactions.some(
            (nextTransaction) => nextTransaction.docChanged,
          ) &&
          onChangeRef.current
        ) {
          scheduleMarkdownFlush();
        }
      },
    });

    viewRef.current = view;
    viewDocumentPathRef.current = documentPath;
    setEditorView(view);
    onEditorViewRef.current?.(view);
    reportCursorPositionSafely(view.state, onCursorChangeRef.current);
    logDocumentPerfStep("editor.mount.end", {
      path: documentPath ?? "__anonymous__",
      durationMs: Number(
        (
          (globalThis.performance?.now() ?? Date.now()) - mountStartedAt
        ).toFixed(2),
      ),
      editorStateCacheHit: stateResolution.editorStateCacheHit,
      parseCacheHit: stateResolution.parseCacheHit,
    });

    return () => {
      flushPendingMarkdown(view.state);
      onEditorViewRef.current?.(null);
      view.destroy();
      viewRef.current = null;
      setEditorView(null);
      setLinkPopoverRequest(null);
      setSlashMenuRequest(null);
      setLinkHoverState(null);
      if (hideHoverTimerRef.current) {
        clearTimeout(hideHoverTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only — intentional: we manage value updates via the effect below

  // Sync readOnly changes without re-creating the view
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    // Re-applying state triggers an editable re-evaluation
    view.setProps({
      editable: () => !readOnly,
      handleDrop(innerView, event) {
        return handleImageFileDrop(innerView, event);
      },
      nodeViews: {
        code_block: (node, innerView, getPos) =>
          new CodeBlockView(node, innerView, getPos),
        image: (node, innerView, getPos) =>
          new ImageView(node, innerView, getPos),
      },
    });
  }, [readOnly]);

  // When switching TO source mode, flush any pending markdown so the textarea
  // immediately shows the fully up-to-date content.
  useEffect(() => {
    if (!sourceMode) return;
    const view = viewRef.current;
    if (view) {
      flushPendingMarkdown(view.state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceMode]);

  // Sync value prop into ProseMirror when it changes externally
  // Only replace the document when the incoming text differs from the
  // current serialized state (avoids an infinite update loop).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const syncStartedAt = globalThis.performance?.now() ?? Date.now();
    const needsExternalSync = shouldSyncExternalValue(
      lastAppliedDocumentPathRef.current,
      lastAppliedValueRef.current,
      documentPath,
      value,
    );
    if (!needsExternalSync) {
      return;
    }

    const shouldFlush = shouldFlushBeforeExternalSync(
      pendingMarkdownRef.current,
      lastAppliedDocumentPathRef.current,
      lastAppliedValueRef.current,
      documentPath,
      value,
    );
    const stateCacheKey = getDocumentCacheKey(documentPath, value);
    const editorStateCacheHit = editorStateCacheRef.current.has(stateCacheKey);
    logDocumentPerfStep("editor.externalSync.start", {
      path: documentPath ?? "__anonymous__",
      previousDocumentPath: lastAppliedDocumentPathRef.current,
      shouldFlush,
      pendingMarkdown: pendingMarkdownRef.current,
      editorStateCacheHit,
      valueLength: value.length,
    });

    if (shouldFlush) {
      flushPendingMarkdown(view.state);
    }

    if (
      !shouldSyncExternalValue(
        lastAppliedDocumentPathRef.current,
        lastAppliedValueRef.current,
        documentPath,
        value,
      )
    ) {
      return;
    }

    const stateResolution = getOrCreateEditorState(
      editorStateCacheRef.current,
      documentPath,
      value,
      editorPluginsRef.current.length > 0
        ? editorPluginsRef.current
        : view.state.plugins,
    );
    logDocumentPerfStep("editor.externalSync.statePrepared", {
      path: documentPath ?? "__anonymous__",
      editorStateCacheHit: stateResolution.editorStateCacheHit,
      parseCacheHit: stateResolution.parseCacheHit,
      parseDurationMs: stateResolution.parseDurationMs,
      createStateDurationMs: stateResolution.createStateDurationMs,
      valueLength: value.length,
    });
    const updateStateStartedAt = globalThis.performance?.now() ?? Date.now();
    view.updateState(stateResolution.state);
    viewDocumentPathRef.current = documentPath;
    lastAppliedValueRef.current = value;
    lastAppliedDocumentPathRef.current = documentPath;
    setOverlayVersion((current) => current + 1);
    setLinkPopoverRequest(null);
    setSlashMenuRequest(null);
    setLinkHoverState(null);
    reportCursorPositionSafely(
      stateResolution.state,
      onCursorChangeRef.current,
    );
    finishDocumentPerfTrace(
      documentPath ?? "__anonymous__",
      "editor.externalSync.end",
      {
        durationMs: Number(
          (
            (globalThis.performance?.now() ?? Date.now()) - syncStartedAt
          ).toFixed(2),
        ),
        editorStateCacheHit: stateResolution.editorStateCacheHit,
        parseCacheHit: stateResolution.parseCacheHit,
        parseDurationMs: stateResolution.parseDurationMs,
        createStateDurationMs: stateResolution.createStateDurationMs,
        updateStateDurationMs: Number(
          (
            (globalThis.performance?.now() ?? Date.now()) - updateStateStartedAt
          ).toFixed(2),
        ),
        valueLength: value.length,
      },
    );
  }, [documentPath, value]);

  const handleEditorMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const view = viewRef.current;
      if (!view) return;

      // Skip when text is selected (FloatingToolbar handles that case)
      if (!view.state.selection.empty) {
        scheduleHoverHide();
        return;
      }

      const coords = { left: event.clientX, top: event.clientY };
      const result = view.posAtCoords(coords);
      if (!result) {
        scheduleHoverHide();
        return;
      }

      const linkRange = findLinkMarkAtPos(view.state, result.pos);
      if (!linkRange) {
        scheduleHoverHide();
        return;
      }

      cancelHoverHide();

      setLinkHoverState((previous) => {
        if (
          previous?.from === linkRange.from &&
          previous?.to === linkRange.to
        ) {
          return previous; // same link — no re-render
        }
        return {
          from: linkRange.from,
          to: linkRange.to,
          href: (linkRange.mark.attrs.href as string) ?? "",
          title: (linkRange.mark.attrs.title as string) ?? "",
          anchor: getLinkHoverAnchorRect(view, linkRange.from, linkRange.to),
        };
      });
    },
    [cancelHoverHide, scheduleHoverHide],
  );

  const handleEditorMouseLeave = useCallback(() => {
    scheduleHoverHide();
  }, [scheduleHoverHide]);

  // Auto-resize the source textarea to fit its content.
  // height: 100% doesn't work in this layout (parent chain uses min-height, not height),
  // so we imperatively set height = scrollHeight instead.
  useEffect(() => {
    const el = sourceTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [sourceMode, value]);

  return (
    <div
      className={["min-w-0 relative", className].filter(Boolean).join(" ")}
      data-refinex-editor-shell
      onMouseMove={!sourceMode ? handleEditorMouseMove : undefined}
      onMouseLeave={!sourceMode ? handleEditorMouseLeave : undefined}
    >
      {/* ProseMirror mount — always in DOM to preserve EditorView + undo history */}
      <div
        ref={mountRef}
        data-refinex-editor
        className={sourceMode ? "hidden" : undefined}
      />
      {!sourceMode && (
        <>
          <FloatingToolbar
            view={editorView}
            version={overlayVersion}
            onRequestLinkEdit={(view) => openLinkPopoverRef.current(view)}
          />
          <LinkPopover
            view={editorView}
            request={linkPopoverRequest}
            onClose={() => setLinkPopoverRequest(null)}
          />
          <SlashMenu
            view={editorView}
            request={slashMenuRequest}
            onClose={() => setSlashMenuRequest(null)}
          />
          {linkHoverState && !linkPopoverRequest && (
            <LinkHoverTooltip
              href={linkHoverState.href}
              anchor={linkHoverState.anchor}
              onEdit={() => {
                setLinkPopoverRequest({
                  from: linkHoverState.from,
                  to: linkHoverState.to,
                  href: linkHoverState.href,
                  title: linkHoverState.title,
                  anchor: getSelectionAnchorRect(
                    viewRef.current!,
                    linkHoverState.from,
                    linkHoverState.to,
                  ),
                });
                setLinkHoverState(null);
              }}
              onClose={() => setLinkHoverState(null)}
              onMouseEnter={cancelHoverHide}
              onMouseLeave={scheduleHoverHide}
            />
          )}
        </>
      )}
      {sourceMode && (
        <textarea
          ref={sourceTextareaRef}
          className="refinex-source-editor"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          data-refinex-source-editor
        />
      )}
    </div>
  );
}

export default RefinexEditor;

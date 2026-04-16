import type { Node as ProseMirrorNode, ResolvedPos } from "prosemirror-model";
import { Plugin, PluginKey, type EditorState } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";

export const refinexViewportBlocksKey = new PluginKey<readonly number[]>(
  "refinexViewportBlocks",
);

const VIEWPORT_HEIGHT_CACHE_LIMIT = 1200;
const VIEWPORT_ROOT_SELECTOR = "[data-refinex-editor-scroll='true']";
const VIEWPORT_BLOCK_MARGIN_PX = 360;
const VIEWPORT_HOTZONE_RADIUS = 6;
export const VIEWPORT_SCROLL_SETTLE_DELAY_MS = 140;
const VIEWPORT_BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "bullet_list",
  "ordered_list",
  "list_item",
  "task_list_item",
  "table",
  "table_row",
  "table_header",
  "table_cell",
]);

function scheduleFrame(callback: () => void) {
  return window.requestAnimationFrame(callback);
}

function cancelFrame(frame: number) {
  window.cancelAnimationFrame(frame);
}

type ViewportScrollSettleHandle = ReturnType<typeof globalThis.setTimeout>;
const viewportMeasuredHeightCache = new Map<string, number>();

export function scheduleViewportScrollSettle(
  previousHandle: ViewportScrollSettleHandle | null,
  callback: () => void,
) {
  if (previousHandle) {
    globalThis.clearTimeout(previousHandle);
  }

  return globalThis.setTimeout(callback, VIEWPORT_SCROLL_SETTLE_DELAY_MS);
}

export function isViewportSkeletonNode(node: Pick<ProseMirrorNode, "type">) {
  return VIEWPORT_BLOCK_TYPES.has(node.type.name);
}

export function summarizeViewportText(text: string, maxLength = 120) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return "空白段落";
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}...`
    : normalized;
}

export function estimateViewportShellMetrics(
  node: Pick<ProseMirrorNode, "type" | "textContent" | "childCount">,
) {
  const textLength = node.textContent.trim().length;
  const baseCharsPerLine =
    node.type.name === "heading"
      ? 46
      : node.type.name === "table_cell" || node.type.name === "table_header"
        ? 28
        : 72;
  const estimatedLines = Math.max(1, Math.ceil(Math.max(1, textLength) / baseCharsPerLine));

  switch (node.type.name) {
    case "heading":
      return { estimatedLines, minHeightRem: Math.max(2.4, 1.45 + estimatedLines * 1.25) };
    case "blockquote":
      return { estimatedLines, minHeightRem: Math.max(2.6, 1.6 + estimatedLines * 1.05) };
    case "bullet_list":
    case "ordered_list":
      return {
        estimatedLines: Math.max(1, node.childCount),
        minHeightRem: Math.max(2.8, 1.3 + node.childCount * 1.9),
      };
    case "table":
      return {
        estimatedLines: Math.max(1, node.childCount),
        minHeightRem: Math.max(3.2, 1.2 + node.childCount * 2.15),
      };
    case "table_row":
      return {
        estimatedLines: Math.max(1, node.childCount),
        minHeightRem: Math.max(2.2, 1.2 + node.childCount * 0.45),
      };
    case "table_cell":
    case "table_header":
      return {
        estimatedLines,
        minHeightRem: Math.max(2, 1.2 + estimatedLines * 0.95),
      };
    default:
      return {
        estimatedLines,
        minHeightRem: Math.max(2.2, 1.15 + estimatedLines * 0.95),
      };
  }
}

function rememberViewportMeasuredHeightCacheEntry(cacheKey: string, heightPx: number) {
  if (viewportMeasuredHeightCache.has(cacheKey)) {
    viewportMeasuredHeightCache.delete(cacheKey);
  }
  viewportMeasuredHeightCache.set(cacheKey, heightPx);

  while (viewportMeasuredHeightCache.size > VIEWPORT_HEIGHT_CACHE_LIMIT) {
    const oldestKey = viewportMeasuredHeightCache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    viewportMeasuredHeightCache.delete(oldestKey);
  }
}

export function createViewportMeasurementCacheKey(
  documentPath: string | undefined,
  getPos: (() => number | undefined) | undefined,
  node: Pick<ProseMirrorNode, "type">,
) {
  if (!documentPath || !getPos) {
    return null;
  }

  const position = getPos();
  if (typeof position !== "number") {
    return null;
  }

  return `${documentPath}\u0000${position}\u0000${node.type.name}`;
}

export function readViewportMeasuredHeightPx(cacheKey: string | null) {
  if (!cacheKey) {
    return null;
  }

  return viewportMeasuredHeightCache.get(cacheKey) ?? null;
}

export function rememberViewportMeasuredHeightPx(
  cacheKey: string | null,
  heightPx: number,
) {
  if (!cacheKey || !Number.isFinite(heightPx) || heightPx <= 0) {
    return;
  }

  rememberViewportMeasuredHeightCacheEntry(
    cacheKey,
    Number(heightPx.toFixed(2)),
  );
}

export function resolveViewportShellMinHeightPx(
  node: Pick<ProseMirrorNode, "type" | "textContent" | "childCount">,
  cachedHeightPx: number | null,
  rootFontSizePx = 16,
) {
  const estimatedPx = estimateViewportShellMetrics(node).minHeightRem * rootFontSizePx;
  return Math.max(cachedHeightPx ?? 0, estimatedPx);
}

export function isViewportBlockVisible(decorations: readonly Decoration[]) {
  return decorations.some((decoration) => decoration.spec.viewportBlock === true);
}

function collectViewportDecoratedElements(view: EditorView) {
  return Array.from(
    view.dom.querySelectorAll<HTMLElement>("[data-refinex-viewport-block='true']"),
  );
}

export function collectViewportRootElements(view: EditorView) {
  const decorated = collectViewportDecoratedElements(view);
  return decorated.filter(
    (element) => !element.parentElement?.closest("[data-refinex-viewport-block='true']"),
  );
}

export function countViewportWords(view: EditorView) {
  return collectViewportRootElements(view).reduce((total, element) => {
    const matches = element.textContent?.trim().match(/\S+/g);
    return total + (matches?.length ?? 0);
  }, 0);
}

export function collectViewportHeadingItems(view: EditorView) {
  return collectViewportDecoratedElements(view)
    .filter((element) => /^H[1-6]$/.test(element.tagName))
    .map((element, index) => ({
      id: `viewport-heading-${index + 1}:${element.textContent?.trim() ?? ""}`,
      text: element.textContent?.trim() ?? "",
      level: Number(element.tagName.slice(1)),
      line: index + 1,
    }))
    .filter((heading) => heading.text.length > 0);
}

function findSelectionViewportAncestorPositions($head: ResolvedPos) {
  const positions: number[] = [];

  for (let depth = $head.depth; depth > 0; depth -= 1) {
    if (isViewportSkeletonNode($head.node(depth))) {
      positions.push($head.before(depth));
    }
  }

  return positions.reverse();
}

function findNearestSkeletonPos(state: EditorState) {
  const positions = findSelectionViewportAncestorPositions(state.selection.$head);
  return positions.at(-1) ?? null;
}

function collectSelectionHotzonePositions(state: EditorState) {
  return findSelectionViewportAncestorPositions(state.selection.$head);
}

function arePositionListsEqual(left: readonly number[], right: readonly number[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function collectVisibleViewportBlockPositions(
  view: EditorView,
  scrollContainer: HTMLElement | null,
) {
  const viewportTop = scrollContainer
    ? scrollContainer.getBoundingClientRect().top - VIEWPORT_BLOCK_MARGIN_PX
    : -VIEWPORT_BLOCK_MARGIN_PX;
  const viewportBottom = scrollContainer
    ? scrollContainer.getBoundingClientRect().bottom + VIEWPORT_BLOCK_MARGIN_PX
    : window.innerHeight + VIEWPORT_BLOCK_MARGIN_PX;
  const selectionPositions = collectSelectionHotzonePositions(view.state);
  const selectionPos = findNearestSkeletonPos(view.state);
  const visiblePositions = new Set<number>();
  const orderedPositions: number[] = [];

  view.state.doc.descendants((node, pos) => {
    if (!isViewportSkeletonNode(node)) {
      return true;
    }

    orderedPositions.push(pos);

    if (selectionPositions.includes(pos)) {
      visiblePositions.add(pos);
      return false;
    }

    const dom = view.nodeDOM(pos);
    if (!(dom instanceof HTMLElement)) {
      return false;
    }

    const rect = dom.getBoundingClientRect();
    const isVisible = rect.bottom >= viewportTop && rect.top <= viewportBottom;
    if (isVisible) {
      visiblePositions.add(pos);
    }

    return false;
  });

  if (selectionPos !== null) {
    const selectionIndex = orderedPositions.indexOf(selectionPos);
    if (selectionIndex !== -1) {
      const from = Math.max(0, selectionIndex - VIEWPORT_HOTZONE_RADIUS);
      const to = Math.min(
        orderedPositions.length - 1,
        selectionIndex + VIEWPORT_HOTZONE_RADIUS,
      );
      for (let index = from; index <= to; index += 1) {
        visiblePositions.add(orderedPositions[index]);
      }
    }
  }

  const positions = [...visiblePositions];
  positions.sort((left, right) => left - right);
  return positions;
}

class ViewportBlocksPluginView {
  private scrollContainer: HTMLElement | null;

  private frame = 0;

  private scrollSettleHandle: ViewportScrollSettleHandle | null = null;

  private isScrollSettling = false;

  constructor(private readonly view: EditorView) {
    this.scrollContainer = null;
    this.bindScrollContainer(this.resolveScrollContainer());
    window.addEventListener("resize", this.scheduleMeasure);
    this.scheduleMeasure();
  }

  update(view: EditorView) {
    this.bindScrollContainer(this.resolveScrollContainer());
    this.scheduleMeasure();
  }

  destroy() {
    if (this.frame !== 0) {
      cancelFrame(this.frame);
    }
    if (this.scrollSettleHandle) {
      globalThis.clearTimeout(this.scrollSettleHandle);
      this.scrollSettleHandle = null;
    }
    this.bindScrollContainer(null);
    window.removeEventListener("resize", this.scheduleMeasure);
  }

  private resolveScrollContainer() {
    return this.view.dom.closest(VIEWPORT_ROOT_SELECTOR) as HTMLElement | null;
  }

  private bindScrollContainer(nextContainer: HTMLElement | null) {
    if (this.scrollContainer === nextContainer) {
      return;
    }

    this.scrollContainer?.removeEventListener("scroll", this.handleScroll);
    this.scrollContainer = nextContainer;
    this.scrollContainer?.addEventListener("scroll", this.handleScroll, {
      passive: true,
    });
  }

  private readonly handleScroll = () => {
    this.isScrollSettling = true;

    if (this.frame !== 0) {
      cancelFrame(this.frame);
      this.frame = 0;
    }

    this.scrollSettleHandle = scheduleViewportScrollSettle(
      this.scrollSettleHandle,
      () => {
        this.scrollSettleHandle = null;
        this.isScrollSettling = false;
        this.scheduleMeasure();
      },
    );
  };

  private readonly scheduleMeasure = () => {
    if (this.isScrollSettling) {
      return;
    }

    if (this.frame !== 0) {
      return;
    }

    this.frame = scheduleFrame(() => {
      this.frame = 0;
      if (this.isScrollSettling) {
        return;
      }

      const nextPositions = collectVisibleViewportBlockPositions(
        this.view,
        this.scrollContainer,
      );
      const previousPositions = refinexViewportBlocksKey.getState(this.view.state) ?? [];
      if (arePositionListsEqual(previousPositions, nextPositions)) {
        return;
      }

      this.view.dispatch(
        this.view.state.tr.setMeta(refinexViewportBlocksKey, nextPositions),
      );
    });
  };
}

export function viewportBlocksPlugin() {
  return new Plugin<readonly number[]>({
    key: refinexViewportBlocksKey,
    state: {
      init: (_config, state) => collectSelectionHotzonePositions(state),
      apply(tr, value) {
        return (tr.getMeta(refinexViewportBlocksKey) as readonly number[] | undefined) ?? value;
      },
    },
    props: {
      decorations(state) {
        const positions = refinexViewportBlocksKey.getState(state) ?? [];
        if (positions.length === 0) {
          return null;
        }

        const decorations = positions.flatMap((pos) => {
          const node = state.doc.nodeAt(pos);
          if (!node || !isViewportSkeletonNode(node)) {
            return [];
          }

          return [
            Decoration.node(pos, pos + node.nodeSize, {
              "data-refinex-viewport-block": "true",
            }, {
              viewportBlock: true,
            }),
          ];
        });

        return DecorationSet.create(state.doc, decorations);
      },
    },
    view(view) {
      return new ViewportBlocksPluginView(view);
    },
  });
}

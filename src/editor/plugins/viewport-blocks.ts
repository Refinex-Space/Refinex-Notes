import type { Node as ProseMirrorNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";

export const refinexViewportBlocksKey = new PluginKey<readonly number[]>(
  "refinexViewportBlocks",
);

const VIEWPORT_ROOT_SELECTOR = "[data-refinex-editor-scroll='true']";
const VIEWPORT_BLOCK_MARGIN_PX = 360;
const VIEWPORT_HOTZONE_RADIUS = 6;
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
]);

function scheduleFrame(callback: () => void) {
  return window.requestAnimationFrame(callback);
}

function cancelFrame(frame: number) {
  window.cancelAnimationFrame(frame);
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

function findSelectionViewportBlockPos(view: EditorView) {
  const { $head } = view.state.selection;

  for (let depth = $head.depth; depth > 0; depth -= 1) {
    if (isViewportSkeletonNode($head.node(depth))) {
      return $head.before(depth);
    }
  }

  return null;
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
  const selectionPos = findSelectionViewportBlockPos(view);
  const visiblePositions = new Set<number>();
  const orderedPositions: number[] = [];

  view.state.doc.descendants((node, pos) => {
    if (!isViewportSkeletonNode(node)) {
      return true;
    }

    orderedPositions.push(pos);

    if (selectionPos === pos) {
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

  constructor(private readonly view: EditorView) {
    this.scrollContainer = this.resolveScrollContainer();
    this.scrollContainer?.addEventListener("scroll", this.scheduleMeasure, {
      passive: true,
    });
    window.addEventListener("resize", this.scheduleMeasure);
    this.scheduleMeasure();
  }

  update(view: EditorView) {
    this.scrollContainer = this.resolveScrollContainer();
    this.scheduleMeasure();
  }

  destroy() {
    if (this.frame !== 0) {
      cancelFrame(this.frame);
    }
    this.scrollContainer?.removeEventListener("scroll", this.scheduleMeasure);
    window.removeEventListener("resize", this.scheduleMeasure);
  }

  private resolveScrollContainer() {
    return this.view.dom.closest(VIEWPORT_ROOT_SELECTOR) as HTMLElement | null;
  }

  private readonly scheduleMeasure = () => {
    if (this.frame !== 0) {
      return;
    }

    this.frame = scheduleFrame(() => {
      this.frame = 0;
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
      init: () => [],
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

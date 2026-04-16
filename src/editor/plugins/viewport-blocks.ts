import type { Node as ProseMirrorNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";

export const refinexViewportBlocksKey = new PluginKey<readonly number[]>(
  "refinexViewportBlocks",
);

const VIEWPORT_ROOT_SELECTOR = "[data-refinex-editor-scroll='true']";
const VIEWPORT_BLOCK_MARGIN_PX = 360;
const VIEWPORT_BLOCK_TYPES = new Set(["paragraph", "heading"]);

function scheduleFrame(callback: () => void) {
  return window.requestAnimationFrame(callback);
}

function cancelFrame(frame: number) {
  window.cancelAnimationFrame(frame);
}

export function isViewportTextBlockNode(node: Pick<ProseMirrorNode, "type">) {
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

function findSelectionTextblockPos(view: EditorView) {
  const { $head } = view.state.selection;

  for (let depth = $head.depth; depth > 0; depth -= 1) {
    if ($head.node(depth).isTextblock) {
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
  const selectionPos = findSelectionTextblockPos(view);
  const positions: number[] = [];

  view.state.doc.descendants((node, pos) => {
    if (!isViewportTextBlockNode(node)) {
      return true;
    }

    if (selectionPos === pos) {
      positions.push(pos);
      return false;
    }

    const dom = view.nodeDOM(pos);
    if (!(dom instanceof HTMLElement)) {
      return false;
    }

    const rect = dom.getBoundingClientRect();
    const isVisible = rect.bottom >= viewportTop && rect.top <= viewportBottom;
    if (isVisible) {
      positions.push(pos);
    }

    return false;
  });

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
          if (!node || !isViewportTextBlockNode(node)) {
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

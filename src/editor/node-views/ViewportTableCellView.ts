import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { Decoration, NodeView } from "prosemirror-view";

import {
  estimateViewportShellMetrics,
  isViewportBlockVisible,
  summarizeViewportText,
} from "../plugins/viewport-blocks";

function getCellTag(node: ProseMirrorNode) {
  return node.type.name === "table_header" ? "th" : "td";
}

function summarizeTableCell(node: ProseMirrorNode) {
  return summarizeViewportText(node.textContent, 48);
}

export class ViewportTableCellView implements NodeView {
  readonly dom: HTMLTableCellElement;

  readonly contentDOM?: HTMLTableCellElement;

  private readonly isVisibleMode: boolean;

  private readonly tagName: "th" | "td";

  constructor(
    private node: ProseMirrorNode,
    decorations: readonly Decoration[],
  ) {
    this.isVisibleMode = isViewportBlockVisible(decorations);
    this.tagName = getCellTag(node) as "th" | "td";

    if (this.isVisibleMode) {
      const cell = document.createElement(this.tagName);
      cell.className = "refinex-viewport-table-cell-live";
      this.applyAlign(cell, node);
      this.dom = cell;
      this.contentDOM = cell;
      return;
    }

    this.dom = this.createShell(node);
  }

  update(node: ProseMirrorNode, decorations: readonly Decoration[]) {
    if (node.type !== this.node.type) {
      return false;
    }

    const nextVisibleMode = isViewportBlockVisible(decorations);
    const nextTagName = getCellTag(node);
    if (nextVisibleMode !== this.isVisibleMode || nextTagName !== this.tagName) {
      return false;
    }

    this.node = node;
    this.applyAlign(this.dom, node);
    if (!this.isVisibleMode) {
      this.dom.textContent = summarizeTableCell(node);
      this.dom.style.minHeight = `${estimateViewportShellMetrics(node).minHeightRem}rem`;
    }

    return true;
  }

  ignoreMutation() {
    return !this.contentDOM;
  }

  private createShell(node: ProseMirrorNode) {
    const cell = document.createElement(this.tagName);
    cell.className = `refinex-viewport-table-cell-shell is-${node.type.name}`;
    cell.textContent = summarizeTableCell(node);
    cell.style.minHeight = `${estimateViewportShellMetrics(node).minHeightRem}rem`;
    this.applyAlign(cell, node);
    return cell;
  }

  private applyAlign(element: HTMLElement, node: ProseMirrorNode) {
    const align = node.attrs.align as string | null;
    if (align) {
      element.style.textAlign = align;
      return;
    }

    element.style.removeProperty("text-align");
  }
}

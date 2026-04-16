import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { Decoration, NodeView } from "prosemirror-view";

import { isViewportBlockVisible, summarizeViewportText } from "../plugins/viewport-blocks";

function describeTableRowShell(node: ProseMirrorNode) {
  const columnCount = node.childCount;
  return {
    colspan: Math.max(1, columnCount),
    summary: summarizeViewportText(node.textContent, 72),
  };
}

export class ViewportTableRowView implements NodeView {
  readonly dom: HTMLTableRowElement;

  readonly contentDOM?: HTMLTableRowElement;

  private readonly isVisibleMode: boolean;

  constructor(
    private node: ProseMirrorNode,
    decorations: readonly Decoration[],
  ) {
    this.isVisibleMode = isViewportBlockVisible(decorations);

    if (this.isVisibleMode) {
      const row = document.createElement("tr");
      row.className = "refinex-viewport-table-row-live";
      this.dom = row;
      this.contentDOM = row;
      return;
    }

    this.dom = this.createShell(node);
  }

  update(node: ProseMirrorNode, decorations: readonly Decoration[]) {
    if (node.type !== this.node.type) {
      return false;
    }

    const nextVisibleMode = isViewportBlockVisible(decorations);
    if (nextVisibleMode !== this.isVisibleMode) {
      return false;
    }

    this.node = node;
    if (!this.isVisibleMode) {
      const { colspan, summary } = describeTableRowShell(node);
      const cell = this.dom.firstElementChild as HTMLTableCellElement | null;
      if (cell) {
        cell.colSpan = colspan;
        cell.textContent = summary;
      }
    }

    return true;
  }

  ignoreMutation() {
    return !this.contentDOM;
  }

  private createShell(node: ProseMirrorNode) {
    const row = document.createElement("tr");
    row.className = "refinex-viewport-table-row-shell";
    const cell = document.createElement("td");
    const { colspan, summary } = describeTableRowShell(node);
    cell.colSpan = colspan;
    cell.textContent = summary;
    row.append(cell);
    return row;
  }
}

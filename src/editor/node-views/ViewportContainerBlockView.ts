import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { Decoration, NodeView } from "prosemirror-view";

import { isViewportBlockVisible, summarizeViewportText } from "../plugins/viewport-blocks";

function getViewportContainerTag(node: ProseMirrorNode) {
  switch (node.type.name) {
    case "ordered_list":
      return "ol";
    case "bullet_list":
      return "ul";
    case "table":
      return "table";
    default:
      return "div";
  }
}

function buildContainerShellSummary(node: ProseMirrorNode) {
  if (node.type.name === "ordered_list" || node.type.name === "bullet_list") {
    const itemCount = node.childCount;
    return `${itemCount} 个列表项 · ${summarizeViewportText(node.textContent, 80)}`;
  }

  if (node.type.name === "table") {
    const rowCount = node.childCount;
    const columnCount = node.firstChild?.childCount ?? 0;
    return `${rowCount} x ${columnCount} 表格 · ${summarizeViewportText(node.textContent, 60)}`;
  }

  return summarizeViewportText(node.textContent, 80);
}

export class ViewportContainerBlockView implements NodeView {
  readonly dom: HTMLElement;

  readonly contentDOM?: HTMLElement;

  private readonly isVisibleMode: boolean;

  private readonly tagName: string;

  constructor(
    private node: ProseMirrorNode,
    decorations: readonly Decoration[],
  ) {
    this.isVisibleMode = isViewportBlockVisible(decorations);
    this.tagName = getViewportContainerTag(node);

    if (this.isVisibleMode) {
      const dom = document.createElement(this.tagName);
      dom.className = "refinex-viewport-container-live";
      if (node.type.name === "ordered_list") {
        const start = node.attrs.start as number;
        if (start && start !== 1) {
          dom.setAttribute("start", String(start));
        }
      }
      this.dom = dom;
      this.contentDOM = dom;
      return;
    }

    const shell = document.createElement("div");
    shell.className = `refinex-viewport-container-shell is-${node.type.name}`;
    shell.dataset.nodeType = node.type.name;
    shell.textContent = buildContainerShellSummary(node);
    this.dom = shell;
  }

  update(node: ProseMirrorNode, decorations: readonly Decoration[]) {
    if (node.type !== this.node.type) {
      return false;
    }

    const nextVisibleMode = isViewportBlockVisible(decorations);
    const nextTagName = getViewportContainerTag(node);
    if (nextVisibleMode !== this.isVisibleMode || nextTagName !== this.tagName) {
      return false;
    }

    this.node = node;
    if (!this.isVisibleMode) {
      this.dom.textContent = buildContainerShellSummary(node);
    }

    return true;
  }

  ignoreMutation() {
    return !this.contentDOM;
  }
}

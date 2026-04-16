import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { NodeView } from "prosemirror-view";
import type { Decoration } from "prosemirror-view";

import {
  isViewportBlockVisible,
  summarizeViewportText,
} from "../plugins/viewport-blocks";

function getViewportTextBlockTag(node: ProseMirrorNode) {
  if (node.type.name === "heading") {
    return `h${node.attrs.level as number}`;
  }

  if (node.type.name === "blockquote") {
    return "blockquote";
  }

  if (node.type.name === "list_item" || node.type.name === "task_list_item") {
    return "li";
  }

  return "p";
}

function buildShellClassName(node: ProseMirrorNode) {
  return [
    "refinex-viewport-block-shell",
    `is-${node.type.name}`,
  ].join(" ");
}

function summarizeNodeText(node: ProseMirrorNode) {
  if (node.type.name === "task_list_item") {
    const checked = node.attrs.checked as boolean;
    return `${checked ? "[x]" : "[ ]"} ${summarizeViewportText(node.textContent)}`;
  }

  if (node.type.name === "blockquote") {
    return `> ${summarizeViewportText(node.textContent)}`;
  }

  return summarizeViewportText(node.textContent);
}

export function describeViewportTextBlockShell(node: ProseMirrorNode) {
  return {
    className: buildShellClassName(node),
    nodeType: node.type.name,
    headingLevel:
      node.type.name === "heading" ? String(node.attrs.level as number) : null,
    text: summarizeNodeText(node),
  };
}

export function createViewportTextBlockShell(node: ProseMirrorNode) {
  const description = describeViewportTextBlockShell(node);
  const shell = document.createElement("div");
  shell.className = description.className;
  shell.dataset.nodeType = description.nodeType;
  if (description.headingLevel) {
    shell.dataset.headingLevel = description.headingLevel;
  }
  shell.textContent = description.text;
  return shell;
}

export class ViewportTextBlockView implements NodeView {
  readonly dom: HTMLElement;

  readonly contentDOM?: HTMLElement;

  private readonly isVisibleMode: boolean;

  private readonly tagName: string;

  constructor(
    private node: ProseMirrorNode,
    decorations: readonly Decoration[],
  ) {
    this.isVisibleMode = isViewportBlockVisible(decorations);
    this.tagName = getViewportTextBlockTag(node);

    if (this.isVisibleMode) {
      const dom = document.createElement(this.tagName);
      dom.className = "refinex-viewport-block-live";
      if (node.type.name === "task_list_item") {
        dom.setAttribute("data-task-item", "true");
        dom.setAttribute(
          "data-checked",
          (node.attrs.checked as boolean) ? "true" : "false",
        );
      }
      this.dom = dom;
      this.contentDOM = dom;
      return;
    }

    this.dom = createViewportTextBlockShell(node);
  }

  update(node: ProseMirrorNode, decorations: readonly Decoration[]) {
    if (node.type !== this.node.type) {
      return false;
    }

    const nextVisibleMode = isViewportBlockVisible(decorations);
    const nextTagName = getViewportTextBlockTag(node);
    if (nextVisibleMode !== this.isVisibleMode || nextTagName !== this.tagName) {
      return false;
    }

    this.node = node;

    if (!this.isVisibleMode) {
      this.dom.textContent = summarizeNodeText(node);
      if (node.type.name === "heading") {
        this.dom.setAttribute("data-heading-level", String(node.attrs.level as number));
      }
      if (node.type.name === "task_list_item") {
        this.dom.setAttribute(
          "data-checked",
          (node.attrs.checked as boolean) ? "true" : "false",
        );
      }
    }

    return true;
  }

  ignoreMutation() {
    return !this.contentDOM;
  }
}

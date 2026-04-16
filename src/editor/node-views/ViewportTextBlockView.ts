import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { NodeView } from "prosemirror-view";
import type { Decoration } from "prosemirror-view";

import {
  createViewportMeasurementCacheKey,
  isViewportBlockVisible,
  readViewportMeasuredHeightPx,
  rememberViewportMeasuredHeightPx,
  resolveViewportShellMinHeightPx,
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
  const tagName = getViewportTextBlockTag(node);
  const description = describeViewportTextBlockShell(node);
  const shell = document.createElement(tagName);
  shell.className = description.className;
  shell.dataset.nodeType = description.nodeType;
  if (description.headingLevel) {
    shell.dataset.headingLevel = description.headingLevel;
  }
  if (node.type.name === "task_list_item") {
    shell.setAttribute("data-task-item", "true");
    shell.setAttribute(
      "data-checked",
      (node.attrs.checked as boolean) ? "true" : "false",
    );
  }
  shell.textContent = description.text;
  return shell;
}

function getViewportRootFontSizePx() {
  if (typeof window === "undefined") {
    return 16;
  }

  const fontSize = window.getComputedStyle(document.documentElement).fontSize;
  const parsed = Number.parseFloat(fontSize);
  return Number.isFinite(parsed) ? parsed : 16;
}

export class ViewportTextBlockView implements NodeView {
  readonly dom: HTMLElement;

  readonly contentDOM?: HTMLElement;

  private readonly isVisibleMode: boolean;

  private readonly tagName: string;

  private readonly measurementCacheKey: string | null;

  private resizeObserver: ResizeObserver | null = null;

  private measurementFrame = 0;

  constructor(
    private node: ProseMirrorNode,
    decorations: readonly Decoration[],
    getPos?: () => number | undefined,
    documentPath?: string,
  ) {
    this.isVisibleMode = isViewportBlockVisible(decorations);
    this.tagName = getViewportTextBlockTag(node);
    this.measurementCacheKey = createViewportMeasurementCacheKey(
      documentPath,
      getPos,
      node,
    );

    if (this.isVisibleMode) {
      const dom = document.createElement(this.tagName);
      dom.className = "refinex-viewport-block-live";
      this.applyTaskItemAttrs(dom, node);
      this.applyMeasuredMinHeight(dom, node);
      this.dom = dom;
      this.contentDOM = dom;
      this.startHeightObservation();
      return;
    }

    this.dom = createViewportTextBlockShell(node);
    this.applyMeasuredMinHeight(this.dom, node);
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
      this.applyMeasuredMinHeight(this.dom, node);
      if (node.type.name === "heading") {
        this.dom.setAttribute("data-heading-level", String(node.attrs.level as number));
      }
      this.applyTaskItemAttrs(this.dom, node);
    }

    return true;
  }

  ignoreMutation() {
    return !this.contentDOM;
  }

  destroy() {
    if (this.measurementFrame !== 0) {
      window.cancelAnimationFrame(this.measurementFrame);
      this.measurementFrame = 0;
    }
    this.resizeObserver?.disconnect();
  }

  private applyMeasuredMinHeight(element: HTMLElement, node: ProseMirrorNode) {
    const minHeightPx = resolveViewportShellMinHeightPx(
      node,
      readViewportMeasuredHeightPx(this.measurementCacheKey),
      getViewportRootFontSizePx(),
    );
    element.style.minHeight = `${minHeightPx}px`;
  }

  private applyTaskItemAttrs(element: HTMLElement, node: ProseMirrorNode) {
    if (node.type.name !== "task_list_item") {
      element.removeAttribute("data-task-item");
      element.removeAttribute("data-checked");
      return;
    }

    element.setAttribute("data-task-item", "true");
    element.setAttribute(
      "data-checked",
      (node.attrs.checked as boolean) ? "true" : "false",
    );
  }

  private startHeightObservation() {
    const scheduleMeasurement = () => {
      if (this.measurementFrame !== 0) {
        return;
      }

      this.measurementFrame = window.requestAnimationFrame(() => {
        this.measurementFrame = 0;
        rememberViewportMeasuredHeightPx(
          this.measurementCacheKey,
          this.dom.getBoundingClientRect().height,
        );
      });
    };

    scheduleMeasurement();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      scheduleMeasurement();
    });
    this.resizeObserver.observe(this.dom);
  }
}

/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TextSelection, EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as richUi from "../rich-ui";
import { parseMarkdown } from "../parser";
import { FloatingToolbar } from "../ui/FloatingToolbar";

function flushFrame() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function createSelectionView(markdown = "hello world") {
  const doc = parseMarkdown(markdown);
  const state = EditorState.create({
    doc,
    selection: TextSelection.create(doc, 1, 6),
  });

  return {
    state,
    dispatch: vi.fn(),
    focus: vi.fn(),
    coordsAtPos: vi.fn((pos: number) => ({
      top: 24,
      bottom: 40,
      left: pos * 6,
      right: pos * 6 + 8,
    })),
  } as unknown as EditorView;
}

describe("FloatingToolbar", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    vi.stubGlobal(
      "requestAnimationFrame",
      ((callback: FrameRequestCallback) =>
        window.setTimeout(() => callback(performance.now()), 0)) as typeof requestAnimationFrame,
    );
    vi.stubGlobal(
      "cancelAnimationFrame",
      ((id: number) => window.clearTimeout(id)) as typeof cancelAnimationFrame,
    );

    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = () => {};
    }
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the toolbar buttons in Notion-like order", async () => {
    const view = createSelectionView();

    await act(async () => {
      root.render(
        <FloatingToolbar
          view={view}
          version={1}
          onRequestLinkEdit={vi.fn(() => true)}
          onRunSkill={vi.fn()}
        />,
      );
      await flushFrame();
    });

    const labels = Array.from(document.querySelectorAll("button"))
      .map((button) => button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "")
      .filter(Boolean);

    expect(labels).toEqual([
      "转换成文本",
      "文本颜色",
      "加粗",
      "斜体",
      "下划线",
      "添加链接",
      "删除线",
      "标记为代码",
      "标记为公式",
      "更多",
      "技能",
    ]);
  });

  it("opens the more menu with slash-style commands and reuses the command executor", async () => {
    const executeSlashCommand = vi
      .spyOn(richUi, "executeSlashCommand")
      .mockResolvedValue(true);
    const view = createSelectionView();

    await act(async () => {
      root.render(
        <FloatingToolbar
          view={view}
          version={1}
          onRequestLinkEdit={vi.fn(() => true)}
          onRunSkill={vi.fn()}
        />,
      );
      await flushFrame();
    });

    const moreButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "更多",
    );
    expect(moreButton).toBeTruthy();

    await act(async () => {
      moreButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushFrame();
    });

    const input = document.querySelector("[cmdk-input]") as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input?.getAttribute("placeholder")).toBe("搜索格式...");

    const firstItem = document.querySelector('[cmdk-item]') as HTMLElement | null;
    expect(firstItem?.textContent).toContain("Heading 1");

    await act(async () => {
      firstItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushFrame();
    });

    expect(executeSlashCommand).toHaveBeenCalledWith({
      view,
      commandId: "heading-1",
    });
    expect(view.focus).toHaveBeenCalledTimes(1);
  });
});

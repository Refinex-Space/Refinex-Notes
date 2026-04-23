/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FileNode } from "../../../types";
import { resetNoteStore } from "../../../stores/noteStore";
import { FileTreeNodes } from "../FileTree";

function flushFrame() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

describe("FileTree", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    resetNoteStore();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it("shows an inline draft filename input inside the target directory", async () => {
    const files = [
      {
        name: "Projects",
        path: "Projects",
        isDir: true,
        hasChildren: false,
        isLoaded: true,
        children: [],
      },
    ] satisfies FileNode[];

    await act(async () => {
      root.render(
        <FileTreeNodes
          files={files}
          currentFile={null}
          draftFile={{ directoryPath: "Projects", value: "Product Vision" }}
          onStartCreateFile={vi.fn()}
          onDraftFileChange={vi.fn()}
          onCommitDraftFile={vi.fn()}
          onCancelDraftFile={vi.fn()}
        />,
      );
      await flushFrame();
    });

    const input = container.querySelector(
      'input[placeholder="输入文件名"]',
    ) as HTMLInputElement | null;

    expect(input).toBeTruthy();
    expect(input?.value).toBe("Product Vision");
  });

  it("commits the inline draft when the user presses Enter", async () => {
    const onCommitDraftFile = vi.fn();
    const files = [
      {
        name: "Projects",
        path: "Projects",
        isDir: true,
        hasChildren: false,
        isLoaded: true,
        children: [],
      },
    ] satisfies FileNode[];

    await act(async () => {
      root.render(
        <FileTreeNodes
          files={files}
          currentFile={null}
          draftFile={{ directoryPath: "Projects", value: "Product Vision" }}
          onStartCreateFile={vi.fn()}
          onDraftFileChange={vi.fn()}
          onCommitDraftFile={onCommitDraftFile}
          onCancelDraftFile={vi.fn()}
        />,
      );
      await flushFrame();
    });

    const input = container.querySelector(
      'input[placeholder="输入文件名"]',
    ) as HTMLInputElement | null;

    expect(input).toBeTruthy();

    await act(async () => {
      input?.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
        }),
      );
      await flushFrame();
    });

    expect(onCommitDraftFile).toHaveBeenCalledTimes(1);
  });
});

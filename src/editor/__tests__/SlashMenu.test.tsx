/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { EditorView } from "prosemirror-view";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as richUi from "../rich-ui";
import { SlashMenu } from "../ui/SlashMenu";

function flushFrame() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

describe("SlashMenu", () => {
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

  it("focuses the command input and allows keyboard selection", async () => {
    const executeSlashCommand = vi
      .spyOn(richUi, "executeSlashCommand")
      .mockResolvedValue(true);
    const onClose = vi.fn();
    const view = {
      focus: vi.fn(),
    } as unknown as EditorView;

    await act(async () => {
      root.render(
        <SlashMenu
          view={view}
          request={{
            from: 1,
            to: 2,
            anchor: {
              top: 12,
              bottom: 28,
              left: 32,
              right: 32,
              width: 1,
              height: 1,
            },
          }}
          onClose={onClose}
        />,
      );
      await flushFrame();
    });

    const input = document.querySelector("[cmdk-input]") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(document.activeElement).toBe(input);

    const initialSelected = document.querySelector(
      '[cmdk-item][data-selected="true"]',
    ) as HTMLElement | null;
    expect(initialSelected).not.toBeNull();

    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
      await flushFrame();
    });

    const nextSelected = document.querySelector(
      '[cmdk-item][data-selected="true"]',
    ) as HTMLElement | null;
    expect(nextSelected).not.toBeNull();
    expect(nextSelected?.textContent).not.toBe(initialSelected?.textContent);

    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
      await flushFrame();
    });

    expect(executeSlashCommand).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(view.focus).toHaveBeenCalledTimes(1);
  });
});

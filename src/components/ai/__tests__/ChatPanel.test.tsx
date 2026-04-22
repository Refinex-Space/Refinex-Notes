/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatPanel } from "../ChatPanel";
import { resetAIStore, useAIStore } from "../../../stores/aiStore";
import { resetNoteStore, useNoteStore } from "../../../stores/noteStore";
import { resetSettingsStore, useSettingsStore } from "../../../stores/settingsStore";

function flushFrame() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

describe("ChatPanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    resetAIStore();
    resetNoteStore();
    resetSettingsStore();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    useSettingsStore.setState({
      isLoaded: true,
      settings: {
        ...useSettingsStore.getState().settings,
        ai: {
          defaultProviderId: "deepseek",
          defaultModelId: "deepseek-reasoner",
        },
      },
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it("uses an icon-only send button and keeps clear history in the top bar", async () => {
    useAIStore.setState({
      providers: [
        {
          id: "deepseek",
          name: "DeepSeek",
          providerKind: "deepseek",
          baseUrl: "https://api.deepseek.com/v1",
        },
      ],
      modelsByProvider: {
        deepseek: [
          {
            providerId: "deepseek",
            modelId: "deepseek-reasoner",
            label: "DeepSeek Reasoner",
            isDefault: true,
          },
        ],
      },
      activeProvider: "deepseek",
      activeModel: "deepseek-reasoner",
      messages: [],
      isStreaming: false,
      isLoadingProviders: false,
      errorMessage: null,
      loadProviders: vi.fn(),
      loadModels: vi.fn(),
      selectProvider: vi.fn(),
      selectModel: vi.fn(),
      sendMessage: vi.fn(),
      cancelStream: vi.fn(),
      clearHistory: vi.fn(),
    });

    await act(async () => {
      root.render(<ChatPanel />);
      await flushFrame();
    });

    const sendButton = container.querySelector('button[aria-label="发送消息"]');

    expect(container.textContent).toContain("清空历史");
    expect(container.textContent).not.toContain("当前模型");
    expect(sendButton).toBeTruthy();
    expect(sendButton?.textContent?.trim() ?? "").toBe("");
  });

  it("renders the current document chip inside the composer and allows removing it", async () => {
    useNoteStore.setState({
      currentFile: "Blog/Harness Engineering.md",
      documents: {
        "Blog/Harness Engineering.md": {
          path: "Blog/Harness Engineering.md",
          name: "Harness Engineering.md",
          content: "# Harness Engineering\n\nDraft",
          savedContent: "# Harness Engineering\n\nDraft",
          language: "Markdown",
          gitStatus: "clean",
          isMarkdown: true,
        },
      },
    });

    useAIStore.setState({
      providers: [
        {
          id: "deepseek",
          name: "DeepSeek",
          providerKind: "deepseek",
          baseUrl: "https://api.deepseek.com/v1",
        },
      ],
      modelsByProvider: {
        deepseek: [
          {
            providerId: "deepseek",
            modelId: "deepseek-reasoner",
            label: "DeepSeek Reasoner",
            isDefault: true,
          },
        ],
      },
      activeProvider: "deepseek",
      activeModel: "deepseek-reasoner",
      messages: [],
      isStreaming: false,
      isLoadingProviders: false,
      errorMessage: null,
      loadProviders: vi.fn(),
      loadModels: vi.fn(),
      selectProvider: vi.fn(),
      selectModel: vi.fn(),
      sendMessage: vi.fn(),
      cancelStream: vi.fn(),
      clearHistory: vi.fn(),
    });

    await act(async () => {
      root.render(<ChatPanel />);
      await flushFrame();
    });

    expect(container.textContent).toContain("Harness Engineering");

    const removeButton = container.querySelector(
      'button[aria-label="移除当前文档上下文"]',
    );

    await act(async () => {
      removeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushFrame();
    });

    expect(container.textContent).not.toContain("Harness Engineering");
  });

  it("keeps the current document chip truncation classes for long filenames", async () => {
    useNoteStore.setState({
      currentFile:
        "Blog/This is an extremely long technical blog title that should not stretch the composer width.md",
      documents: {
        "Blog/This is an extremely long technical blog title that should not stretch the composer width.md":
          {
            path: "Blog/This is an extremely long technical blog title that should not stretch the composer width.md",
            name: "This is an extremely long technical blog title that should not stretch the composer width.md",
            content: "# Long Title\n\nDraft",
            savedContent: "# Long Title\n\nDraft",
            language: "Markdown",
            gitStatus: "clean",
            isMarkdown: true,
          },
      },
    });

    useAIStore.setState({
      providers: [
        {
          id: "deepseek",
          name: "DeepSeek",
          providerKind: "deepseek",
          baseUrl: "https://api.deepseek.com/v1",
        },
      ],
      modelsByProvider: {
        deepseek: [
          {
            providerId: "deepseek",
            modelId: "deepseek-reasoner",
            label: "DeepSeek Reasoner",
            isDefault: true,
          },
        ],
      },
      activeProvider: "deepseek",
      activeModel: "deepseek-reasoner",
      messages: [],
      isStreaming: false,
      isLoadingProviders: false,
      errorMessage: null,
      loadProviders: vi.fn(),
      loadModels: vi.fn(),
      selectProvider: vi.fn(),
      selectModel: vi.fn(),
      sendMessage: vi.fn(),
      cancelStream: vi.fn(),
      clearHistory: vi.fn(),
    });

    await act(async () => {
      root.render(<ChatPanel />);
      await flushFrame();
    });

    const chip = container.querySelector(".group.inline-flex");
    const chipLabel = chip?.querySelector("span");

    expect(chip?.className).toContain("min-w-0");
    expect(chip?.className).toContain("max-w-[min(100%,28rem)]");
    expect(chipLabel?.className).toContain("min-w-0");
    expect(chipLabel?.className).toContain("truncate");
  });
});

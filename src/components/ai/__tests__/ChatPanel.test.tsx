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

  it("renders assistant responses as full-width content and shows a thinking indicator while streaming", async () => {
    const cancelStream = vi.fn();

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
      messages: [
        {
          id: "user-1",
          role: "user",
          content: "总结一下这篇文档",
          timestamp: Date.now(),
        },
        {
          id: "assistant-1",
          role: "assistant",
          content: "",
          timestamp: Date.now() + 1,
        },
      ],
      isStreaming: true,
      isLoadingProviders: false,
      errorMessage: null,
      loadProviders: vi.fn(),
      loadModels: vi.fn(),
      selectProvider: vi.fn(),
      selectModel: vi.fn(),
      sendMessage: vi.fn(),
      cancelStream,
      clearHistory: vi.fn(),
    });

    await act(async () => {
      root.render(<ChatPanel />);
      await flushFrame();
    });

    const assistantMessage = container.querySelector(
      '[data-testid="assistant-message"]',
    ) as HTMLDivElement | null;
    const thinkingIndicator = container.querySelector(
      '[data-testid="assistant-thinking"]',
    );
    const stopButton = container.querySelector(
      'button[aria-label="停止生成"]',
    ) as HTMLButtonElement | null;

    expect(assistantMessage?.className).toContain("w-full");
    expect(assistantMessage?.className).not.toContain("rounded-[1.2rem]");
    expect(thinkingIndicator?.textContent).toContain("探索中");
    expect(container.textContent).not.toContain("停止生成");
    expect(stopButton).toBeTruthy();
    expect(stopButton?.textContent?.trim() ?? "").toBe("");

    await act(async () => {
      stopButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushFrame();
    });

    expect(cancelStream).toHaveBeenCalledOnce();
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

  it("opens the @ mention menu, inserts the selected document into the prompt, and sends it as extra context", async () => {
    useNoteStore.setState({
      files: [
        {
          name: "Blog",
          path: "Blog",
          isDir: true,
          hasChildren: true,
          isLoaded: true,
          children: [
            {
              name: "Harness Engineering.md",
              path: "Blog/Harness Engineering.md",
              isDir: false,
              hasChildren: false,
              isLoaded: true,
            },
          ],
        },
        {
          name: "guides",
          path: "guides",
          isDir: true,
          hasChildren: true,
          isLoaded: true,
          children: [
            {
              name: "Cursor Guide.md",
              path: "guides/Cursor Guide.md",
              isDir: false,
              hasChildren: false,
              isLoaded: true,
            },
            {
              name: "Claude Guide.md",
              path: "guides/Claude Guide.md",
              isDir: false,
              hasChildren: false,
              isLoaded: true,
            },
          ],
        },
      ],
      currentFile: "Blog/Harness Engineering.md",
      openFiles: ["Blog/Harness Engineering.md"],
      recentFiles: ["guides/Cursor Guide.md"],
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

    const sendMessage = vi.fn().mockResolvedValue(undefined);

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
      sendMessage,
      cancelStream: vi.fn(),
      clearHistory: vi.fn(),
    });

    await act(async () => {
      root.render(<ChatPanel />);
      await flushFrame();
    });

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(textarea, "请参考 @Cursor");
      textarea.selectionStart = textarea.value.length;
      textarea.selectionEnd = textarea.value.length;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      textarea.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushFrame();
    });

    expect(container.textContent).toContain("当前页面");
    expect(container.textContent).toContain("链接到页面");
    expect(container.textContent).toContain("Cursor Guide");

    const attachButton = container.querySelector(
      'button[aria-label="引用文档 Cursor Guide"]',
    );

    await act(async () => {
      attachButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushFrame();
    });

    expect(textarea.value).toBe("请参考 @Cursor Guide.md ");
    const promptHighlight = container.querySelector(
      '[data-testid="prompt-highlight"]',
    );
    const mentionHighlight = container.querySelector(
      '[data-mention-highlight="@Cursor Guide.md"]',
    );

    expect(promptHighlight?.textContent).toContain("@Cursor Guide.md");
    expect(mentionHighlight?.className).toContain("bg-accent/[0.12]");

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(textarea, "请参考 @Cursor Guide.md 后总结");
      textarea.selectionStart = textarea.value.length;
      textarea.selectionEnd = textarea.value.length;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      await flushFrame();
    });

    const sendButton = container.querySelector(
      'button[aria-label="发送消息"]',
    );

    await act(async () => {
      sendButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushFrame();
    });

    expect(sendMessage).toHaveBeenCalledWith("请参考 @Cursor Guide.md 后总结", {
      includeCurrentDocument: true,
      attachedDocumentPaths: ["guides/Cursor Guide.md"],
    });
  });
});

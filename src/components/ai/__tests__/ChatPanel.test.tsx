/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatPanel } from "../ChatPanel";
import { resetAIStore, useAIStore } from "../../../stores/aiStore";
import { resetSettingsStore, useSettingsStore } from "../../../stores/settingsStore";

function flushFrame() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

describe("ChatPanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    resetAIStore();
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
});

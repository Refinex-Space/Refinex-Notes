/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProviderSelect } from "../ProviderSelect";

function flushFrame() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

describe("ProviderSelect", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
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

  it("renders a single trigger and groups models by provider in the popover", async () => {
    const onSelect = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      root.render(
        <ProviderSelect
          providers={[
            {
              id: "openai",
              name: "OpenAI",
              providerKind: "openai",
              baseUrl: "https://api.openai.com/v1",
            },
            {
              id: "deepseek",
              name: "DeepSeek",
              providerKind: "deepseek",
              baseUrl: "https://api.deepseek.com/v1",
            },
          ]}
          modelsByProvider={{
            openai: [
              {
                providerId: "openai",
                modelId: "gpt-4o",
                label: "GPT-4o",
                isDefault: true,
              },
            ],
            deepseek: [
              {
                providerId: "deepseek",
                modelId: "deepseek-reasoner",
                label: "DeepSeek Reasoner",
                isDefault: true,
              },
            ],
          }}
          activeProvider="deepseek"
          activeModel="deepseek-reasoner"
          onSelect={onSelect}
        />,
      );
      await flushFrame();
    });

    const trigger = container.querySelector('button[aria-label="选择当前 AI 模型"]');

    expect(trigger?.textContent).toContain("DeepSeek Reasoner");
    expect(trigger?.className).toContain("bg-transparent");
    expect(trigger?.className).not.toContain("border border-border/70");
    expect(container.innerHTML).not.toContain("选择 AI Provider");
    expect(container.innerHTML).not.toContain("选择 AI 模型");

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushFrame();
    });

    expect(document.body.textContent).toContain("OpenAI");
    expect(document.body.textContent).toContain("DeepSeek");
    expect(document.body.textContent).toContain("GPT-4o");
    expect(document.body.textContent).toContain("DeepSeek Reasoner");
    expect(document.body.querySelectorAll("img")).toHaveLength(3);
  });
});

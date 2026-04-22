import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ProviderSelect } from "../ProviderSelect";

describe("ProviderSelect", () => {
  it("renders the selected provider/model summary from native catalog data", () => {
    const markup = renderToStaticMarkup(
      <ProviderSelect
        providers={[
          {
            id: "deepseek",
            name: "DeepSeek",
            providerKind: "deepseek",
            baseUrl: "https://api.deepseek.com/v1",
          },
        ]}
        models={[
          {
            providerId: "deepseek",
            modelId: "deepseek-chat",
            label: "DeepSeek Chat",
            isDefault: true,
          },
        ]}
        activeProvider="deepseek"
        activeModel="deepseek-chat"
        onProviderChange={vi.fn()}
        onModelChange={vi.fn()}
      />,
    );

    expect(markup).toContain("DeepSeek / deepseek-chat");
    expect(markup).toContain("选择 AI Provider");
    expect(markup).toContain("选择 AI 模型");
  });
});

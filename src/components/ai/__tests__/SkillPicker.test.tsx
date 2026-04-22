import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SkillPicker } from "../SkillPicker";

describe("SkillPicker", () => {
  it("renders the AI trigger button and keeps it enabled when skills exist", () => {
    const markup = renderToStaticMarkup(
      <SkillPicker
        skills={[
          {
            id: "expand",
            fileName: "expand.md",
            slashCommand: "ai-expand",
            name: "expand-text",
            description: "扩展选中的文本段落，保持原有风格和语气",
            category: "writing",
            outputMode: "replace-selection",
            selectionMode: "required",
            body: "请扩写当前选中的段落。",
            raw: "",
          },
        ]}
        onSelect={vi.fn()}
      />,
    );

    expect(markup).toContain("AI");
    expect(markup).toContain("aria-haspopup=\"dialog\"");
    expect(markup).not.toContain("disabled=\"\"");
  });
});

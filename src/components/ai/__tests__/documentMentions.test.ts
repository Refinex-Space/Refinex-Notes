import { describe, expect, it } from "vitest";

import {
  buildDocumentMentionSections,
  flattenDocumentPaths,
  getDocumentMentionTrigger,
  removeDocumentMentionTrigger,
  searchLoadedDocumentPaths,
  toDocumentMentionOption,
} from "../documentMentions";

describe("documentMentions", () => {
  it("detects an active @ mention trigger near the caret", () => {
    expect(getDocumentMentionTrigger("请参考 @harne", 11)).toEqual({
      query: "harne",
      start: 4,
      end: 10,
    });
  });

  it("ignores @ symbols that are not standalone mention triggers", () => {
    expect(getDocumentMentionTrigger("邮箱是team@refinex.dev", 19)).toBeNull();
  });

  it("removes the active mention query from the draft after selection", () => {
    const trigger = getDocumentMentionTrigger("请参考 @roadmap 后继续", 12);
    expect(trigger).not.toBeNull();

    const result = removeDocumentMentionTrigger(
      "请参考 @roadmap 后继续",
      trigger!,
    );

    expect(result).toEqual({
      value: "请参考 后继续",
      caretPosition: 4,
    });
  });

  it("builds collapsed mention sections with current page first", () => {
    const sections = buildDocumentMentionSections({
      currentDocumentPath: "Blog/Harness Engineering.md",
      currentDocumentTitle: "Harness Engineering",
      candidatePaths: [
        "Blog/Harness Engineering.md",
        "guides/Cursor.md",
        "guides/Claude.md",
        "guides/GPT.md",
        "guides/Kimi.md",
        "guides/Qwen.md",
        "guides/OpenAI.md",
      ],
      attachedDocumentPaths: ["guides/Claude.md"],
      expanded: false,
    });

    expect(sections.currentPage).toEqual({
      ...toDocumentMentionOption("Blog/Harness Engineering.md", "Harness Engineering"),
      isCurrentDocument: true,
    });
    expect(sections.visibleLinkedPages.map((item) => item.path)).toEqual([
      "guides/Cursor.md",
      "guides/GPT.md",
      "guides/Kimi.md",
      "guides/Qwen.md",
      "guides/OpenAI.md",
    ]);
    expect(sections.hiddenCount).toBe(0);
  });

  it("reports hidden result count when linked pages overflow", () => {
    const sections = buildDocumentMentionSections({
      currentDocumentPath: "Blog/Harness Engineering.md",
      currentDocumentTitle: "Harness Engineering",
      candidatePaths: [
        "guides/Cursor.md",
        "guides/Claude.md",
        "guides/GPT.md",
        "guides/Kimi.md",
        "guides/Qwen.md",
        "guides/OpenAI.md",
        "guides/DeepSeek.md",
      ],
      attachedDocumentPaths: [],
      expanded: false,
    });

    expect(sections.visibleLinkedPages).toHaveLength(5);
    expect(sections.hiddenCount).toBe(2);
  });

  it("flattens file tree nodes into document paths only", () => {
    expect(
      flattenDocumentPaths([
        {
          name: "guides",
          path: "guides",
          isDir: true,
          hasChildren: true,
          isLoaded: true,
          children: [
            {
              name: "Cursor.md",
              path: "guides/Cursor.md",
              isDir: false,
              hasChildren: false,
              isLoaded: true,
            },
          ],
        },
      ]),
    ).toEqual(["guides/Cursor.md"]);
  });

  it("prefers filename matches when locally searching loaded document paths", () => {
    expect(
      searchLoadedDocumentPaths(
        [
          "guides/OpenAI.md",
          "notes/My OpenAI Notes.md",
          "archive/API.md",
        ],
        "openai",
      ),
    ).toEqual(["guides/OpenAI.md", "notes/My OpenAI Notes.md"]);
  });
});

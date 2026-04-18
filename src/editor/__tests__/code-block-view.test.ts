import { EditorState } from "prosemirror-state";
import { describe, expect, it } from "vitest";

import { parseMarkdown } from "../parser";
import {
  CODE_BLOCK_LANGUAGE_OPTIONS,
  countCodeBlockLines,
  createCodeBlockContentTransaction,
  createExitCodeBlockTransaction,
  isCodeBlockSelectionOnLastLine,
  normalizeCodeBlockLanguage,
  summarizeCodeBlock,
} from "../node-views/CodeBlockView";

describe("CodeBlockView helpers", () => {
  it("normalizes supported languages and aliases", () => {
    const values = CODE_BLOCK_LANGUAGE_OPTIONS.map((option) => option.value);
    // Core languages should always be present
    expect(values).toContain("plaintext");
    expect(values).toContain("javascript");
    expect(values).toContain("typescript");
    expect(values).toContain("python");
    expect(values).toContain("rust");
    expect(values).toContain("html");
    expect(values).toContain("css");
    expect(values).toContain("json");
    expect(values).toContain("markdown");
    expect(normalizeCodeBlockLanguage("ts")).toBe("typescript");
    expect(normalizeCodeBlockLanguage("JS")).toBe("javascript");
    expect(normalizeCodeBlockLanguage("unknown")).toBe("plaintext");
  });

  it("detects whether the cursor is already on the last line", () => {
    expect(isCodeBlockSelectionOnLastLine("line 1\nline 2", 2)).toBe(false);
    expect(
      isCodeBlockSelectionOnLastLine("line 1\nline 2", "line 1\nline 2".length),
    ).toBe(true);
  });

  it("summarizes code blocks for collapsed viewport shells", () => {
    expect(countCodeBlockLines("const a = 1;\nconst b = 2;")).toBe(2);
    expect(summarizeCodeBlock("")).toEqual({
      lineCount: 1,
      preview: "空代码块",
    });
    expect(
      summarizeCodeBlock(
        "const stream = repository.findAll().stream().map(transform).filter(Boolean);",
      ).preview,
    ).toContain("...");
  });

  it("creates a content transaction that rewrites only the code block text", () => {
    const state = EditorState.create({
      doc: parseMarkdown("```ts\nconst value = 1;\n```\n"),
    });
    const node = state.doc.firstChild;

    if (!node) {
      throw new Error("Expected a code block node");
    }

    const transaction = createCodeBlockContentTransaction(
      state,
      0,
      node,
      "const value = 2;",
    );

    expect(transaction).not.toBeNull();
    const nextState = state.applyTransaction(transaction!).state;
    expect(nextState.doc.firstChild?.type.name).toBe("code_block");
    expect(nextState.doc.firstChild?.attrs.language).toBe("ts");
    expect(nextState.doc.firstChild?.textContent).toBe("const value = 2;");
  });

  it("moves the selection into the following paragraph when exiting", () => {
    const state = EditorState.create({
      doc: parseMarkdown("```js\nconsole.log(1)\n```\n\nAfter"),
    });
    const node = state.doc.firstChild;

    if (!node) {
      throw new Error("Expected a code block node");
    }

    const nextState = state.applyTransaction(
      createExitCodeBlockTransaction(state, 0, node),
    ).state;

    expect(nextState.selection.$from.parent.type.name).toBe("paragraph");
    expect(nextState.selection.$from.parent.textContent).toBe("After");
  });

  it("inserts a trailing paragraph if there is no valid exit target", () => {
    const state = EditorState.create({
      doc: parseMarkdown("```rust\nfn main() {}\n```"),
    });
    const node = state.doc.firstChild;

    if (!node) {
      throw new Error("Expected a code block node");
    }

    const nextState = state.applyTransaction(
      createExitCodeBlockTransaction(state, 0, node),
    ).state;

    expect(nextState.doc.lastChild?.type.name).toBe("paragraph");
    expect(nextState.doc.lastChild?.content.size).toBe(0);
    expect(nextState.selection.$from.parent.type.name).toBe("paragraph");
  });
});

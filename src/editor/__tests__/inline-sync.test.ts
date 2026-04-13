import { history, undo } from "prosemirror-history";
import { EditorState } from "prosemirror-state";
import { describe, expect, it } from "vitest";

import { refinexParser, parseMarkdown } from "../parser";
import { inlineSyncPlugin } from "../plugins/inline-sync";
import { refinexSchema } from "../schema";
import { refinexSerializer } from "../serializer";

function createState(markdown = ""): EditorState {
  return EditorState.create({
    doc: parseMarkdown(markdown),
    plugins: [history(), inlineSyncPlugin(refinexParser, refinexSerializer)],
  });
}

function applyInsert(state: EditorState, input: string, from = 1, to = from) {
  return state.applyTransaction(state.tr.insertText(input, from, to));
}

function expectMarkedParagraph(
  state: EditorState,
  markName: string,
  expectedText: string,
) {
  const paragraph = state.doc.firstChild;
  expect(paragraph?.type.name).toBe("paragraph");
  expect(paragraph?.textContent).toBe(expectedText);

  const textNode = paragraph?.firstChild;
  expect(textNode?.isText).toBe(true);
  expect(textNode?.marks.some((mark) => mark.type.name === markName)).toBe(true);
}

describe("inlineSyncPlugin", () => {
  it("rewrites strong syntax when the closing marker is typed", () => {
    const result = applyInsert(createState(), "**bold**");

    expect(result.transactions).toHaveLength(2);
    expectMarkedParagraph(result.state, "strong", "bold");
    expect(result.state.selection.from).toBe(5);
  });

  it("rewrites emphasis syntax when the closing marker is typed", () => {
    const result = applyInsert(createState(), "*italic*");

    expectMarkedParagraph(result.state, "em", "italic");
    expect(result.state.selection.from).toBe(7);
  });

  it("rewrites heading syntax after the hash prefix", () => {
    const result = applyInsert(createState(), "# Heading");

    const heading = result.state.doc.firstChild;
    expect(heading?.type.name).toBe("heading");
    expect(heading?.attrs.level).toBe(1);
    expect(heading?.textContent).toBe("Heading");
    expect(result.state.selection.from).toBe(8);
  });

  it("rewrites inline code syntax when the closing backtick is typed", () => {
    const result = applyInsert(createState(), "`code`");

    expectMarkedParagraph(result.state, "code", "code");
    expect(result.state.selection.from).toBe(5);
  });

  it("rewrites closed links into link marks", () => {
    const result = applyInsert(createState(), "[link](https://example.com)");

    expectMarkedParagraph(result.state, "link", "link");

    const mark = result.state.doc.firstChild?.firstChild?.marks.find(
      (nextMark) => nextMark.type.name === "link",
    );
    expect(mark?.attrs.href).toBe("https://example.com");
    expect(result.state.selection.from).toBe(5);
  });

  it("rewrites strikethrough syntax when the closing marker is typed", () => {
    const result = applyInsert(createState(), "~~strike~~");

    expectMarkedParagraph(result.state, "strikethrough", "strike");
    expect(result.state.selection.from).toBe(7);
  });

  it("does nothing when a transaction does not change the document", () => {
    const state = createState("plain");
    const result = state.applyTransaction(state.tr.setMeta("test-meta", true));

    expect(result.transactions).toHaveLength(1);
    expect(result.state.doc.eq(state.doc)).toBe(true);
    expect(result.state.selection.from).toBe(state.selection.from);
  });

  it("skips code blocks entirely", () => {
    const doc = refinexSchema.node("doc", null, [
      refinexSchema.node(
        "code_block",
        { language: "" },
        refinexSchema.text("**bold"),
      ),
    ]);
    const state = EditorState.create({
      doc,
      plugins: [history(), inlineSyncPlugin(refinexParser, refinexSerializer)],
    });

    const result = applyInsert(
      state,
      "**",
      state.doc.firstChild!.nodeSize - 1,
      state.doc.firstChild!.nodeSize - 1,
    );

    expect(result.transactions).toHaveLength(1);
    expect(result.state.doc.firstChild?.type.name).toBe("code_block");
    expect(result.state.doc.firstChild?.textContent).toBe("**bold**");
  });

  it("skips already formatted paragraphs so follow-up typing does not reparse again", () => {
    const formatted = applyInsert(createState(), "**bold**").state;
    const result = applyInsert(
      formatted,
      "!",
      formatted.selection.from,
      formatted.selection.from,
    );

    expect(result.transactions).toHaveLength(1);
    expect(result.state.doc.firstChild?.textContent).toBe("bold!");
  });

  it("handles cross-paragraph deletion that joins markdown syntax into a valid mark", () => {
    const state = createState("**bo\n\nld**");
    const firstBlock = state.doc.firstChild!;
    const boundary = firstBlock.nodeSize;
    const result = state.applyTransaction(state.tr.delete(boundary - 1, boundary + 1));

    expect(result.transactions).toHaveLength(2);
    expectMarkedParagraph(result.state, "strong", "bold");
    expect(result.state.selection.from).toBeGreaterThanOrEqual(1);
    expect(result.state.selection.from).toBeLessThanOrEqual(5);
  });

  it("lets undo revert the inline-sync rewrite together with the typed markdown", () => {
    let state = applyInsert(createState(), "**bold**").state;

    const didUndo = undo(state, (transaction) => {
      state = state.applyTransaction(transaction).state;
    });

    expect(didUndo).toBe(true);
    expect(state.doc.firstChild?.type.name).toBe("paragraph");
    expect(state.doc.firstChild?.textContent).toBe("");
    expect(state.selection.from).toBe(1);
  });
});

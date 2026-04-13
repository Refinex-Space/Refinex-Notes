import { history } from "prosemirror-history";
import { EditorState } from "prosemirror-state";
import { describe, expect, it } from "vitest";

import { refinexParser, parseMarkdown } from "../parser";
import { inlineSyncPlugin } from "../plugins/inline-sync";
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
});

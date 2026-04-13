import { EditorState, TextSelection } from "prosemirror-state";
import type { DecorationSet } from "prosemirror-view";
import { describe, expect, it } from "vitest";

import { parseMarkdown } from "../parser";
import { placeholderPlugin } from "../plugins/placeholder";
import {
  ensureTrailingParagraph,
  stripTrailingParagraph,
  trailingNodePlugin,
} from "../plugins/trailing-node";

describe("editor shell plugins", () => {
  it("shows a placeholder decoration for an empty document", () => {
    const plugin = placeholderPlugin();
    const state = EditorState.create({
      doc: ensureTrailingParagraph(parseMarkdown("")),
      plugins: [plugin],
    });

    const decorations = plugin.props.decorations?.call(plugin, state) as
      | DecorationSet
      | null
      | undefined;
    expect(decorations?.find().length).toBe(1);
  });

  it("hides the placeholder decoration once content exists", () => {
    const plugin = placeholderPlugin();
    const state = EditorState.create({
      doc: ensureTrailingParagraph(parseMarkdown("Content")),
      plugins: [plugin],
    });

    const decorations = plugin.props.decorations?.call(plugin, state) as
      | DecorationSet
      | null
      | undefined;
    expect(decorations?.find().length ?? 0).toBe(0);
  });

  it("normalizes and strips trailing paragraphs for editor shell serialization", () => {
    const normalized = ensureTrailingParagraph(parseMarkdown("# Title"));

    expect(normalized.childCount).toBe(2);
    expect(normalized.lastChild?.type.name).toBe("paragraph");
    expect(normalized.lastChild?.content.size).toBe(0);
    expect(stripTrailingParagraph(normalized).childCount).toBe(1);
  });

  it("re-appends a trailing paragraph after the last paragraph becomes non-empty", () => {
    const plugin = trailingNodePlugin();
    const base = ensureTrailingParagraph(parseMarkdown("Hello"));
    let state = EditorState.create({
      doc: base,
      plugins: [plugin],
    });

    const cursor = state.doc.content.size - 1;
    state = state.applyTransaction(
      state.tr.setSelection(TextSelection.create(state.doc, cursor)),
    ).state;

    const result = state.applyTransaction(state.tr.insertText("world", cursor));

    expect(result.state.doc.lastChild?.type.name).toBe("paragraph");
    expect(result.state.doc.lastChild?.content.size).toBe(0);
    expect(result.state.doc.childCount).toBe(3);
  });
});

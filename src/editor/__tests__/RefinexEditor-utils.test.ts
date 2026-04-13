import { describe, expect, it } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";

import { parseMarkdown } from "../parser";
import { getCursorPosition } from "../RefinexEditor";

describe("RefinexEditor shell bridge helpers", () => {
  it("maps the current selection to line and column", () => {
    const doc = parseMarkdown(`# Title

Line two
`);
    const state = EditorState.create({ doc }).apply(
      EditorState.create({ doc }).tr.setSelection(
        TextSelection.create(doc, 12),
      ),
    );

    expect(getCursorPosition(state)).toEqual({ line: 2, col: 5 });
  });
});

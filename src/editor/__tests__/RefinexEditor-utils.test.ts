import { describe, expect, it } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";

import { parseMarkdown } from "../parser";
import {
  getDocumentCacheKey,
  getCursorPosition,
  shouldRefreshOverlay,
  shouldFlushBeforeExternalSync,
  shouldSyncExternalValue,
} from "../RefinexEditor";

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

  it("does not throw for a document that starts with inline code", () => {
    const doc = parseMarkdown("`**text**`");
    const state = EditorState.create({ doc });

    expect(getCursorPosition(state)).toEqual({ line: 1, col: 1 });
  });

  it("skips external sync only when document identity and value are unchanged", () => {
    expect(
      shouldSyncExternalValue(
        "Inbox/Welcome.md",
        "# Welcome",
        "Inbox/Welcome.md",
        "# Welcome",
      ),
    ).toBe(false);

    expect(
      shouldSyncExternalValue(
        "Inbox/Welcome.md",
        "# Welcome",
        "Inbox/Guide.md",
        "# Welcome",
      ),
    ).toBe(true);

    expect(
      shouldSyncExternalValue(
        "Inbox/Welcome.md",
        "# Welcome",
        "Inbox/Welcome.md",
        "# Updated",
      ),
    ).toBe(true);
  });

  it("flushes before external sync only when a pending markdown write exists", () => {
    expect(
      shouldFlushBeforeExternalSync(
        false,
        "Inbox/Welcome.md",
        "# Welcome",
        "Inbox/Guide.md",
        "# Guide",
      ),
    ).toBe(false);

    expect(
      shouldFlushBeforeExternalSync(
        true,
        "Inbox/Welcome.md",
        "# Welcome",
        "Inbox/Welcome.md",
        "# Welcome",
      ),
    ).toBe(false);

    expect(
      shouldFlushBeforeExternalSync(
        true,
        "Inbox/Welcome.md",
        "# Welcome",
        "Inbox/Guide.md",
        "# Guide",
      ),
    ).toBe(true);
  });

  it("builds stable cache keys for document path and value pairs", () => {
    expect(getDocumentCacheKey("Inbox/Welcome.md", "# Welcome")).toBe(
      getDocumentCacheKey("Inbox/Welcome.md", "# Welcome"),
    );
    expect(getDocumentCacheKey("Inbox/Welcome.md", "# Welcome")).not.toBe(
      getDocumentCacheKey("Inbox/Guide.md", "# Welcome"),
    );
    expect(getDocumentCacheKey("Inbox/Welcome.md", "# Welcome")).not.toBe(
      getDocumentCacheKey("Inbox/Welcome.md", "# Updated"),
    );
  });

  it("refreshes overlay only for selection-affecting visible states", () => {
    expect(shouldRefreshOverlay(false, false, false)).toBe(false);
    expect(shouldRefreshOverlay(true, false, false)).toBe(true);
    expect(shouldRefreshOverlay(false, true, false)).toBe(true);
    expect(shouldRefreshOverlay(false, false, true)).toBe(true);
  });
});

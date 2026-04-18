import { EditorState } from "prosemirror-state";
import type { DecorationSet } from "prosemirror-view";
import { describe, expect, it } from "vitest";

import { parseMarkdown } from "../parser";
import { ensureTrailingParagraph } from "../plugins/trailing-node";
import {
  computeMatches,
  findReplaceKey,
  findReplacePlugin,
} from "../plugins/find-replace";

// ── Helper: build a state with the find-replace plugin ────────────────────────

function makeStateWithPlugin(markdown: string) {
  const doc = ensureTrailingParagraph(parseMarkdown(markdown));
  const plugin = findReplacePlugin();
  const state = EditorState.create({ doc, plugins: [plugin] });
  return { state, plugin };
}

function makeState(markdown: string) {
  return makeStateWithPlugin(markdown).state;
}

function getPluginState(state: EditorState) {
  return findReplaceKey.getState(state)!;
}

function getDecorations(
  plugin: ReturnType<typeof findReplacePlugin>,
  state: EditorState,
): DecorationSet | null | undefined {
  return plugin.props.decorations?.call(plugin, state) as
    | DecorationSet
    | null
    | undefined;
}

// ── computeMatches ─────────────────────────────────────────────────────────────

describe("computeMatches", () => {
  it("returns empty array for empty query", () => {
    const state = makeState("Hello world");
    expect(computeMatches(state.doc, "", false)).toHaveLength(0);
  });

  it("finds a single occurrence", () => {
    const state = makeState("Hello world");
    const matches = computeMatches(state.doc, "world", false);
    expect(matches).toHaveLength(1);
    expect(matches[0].to - matches[0].from).toBe("world".length);
  });

  it("finds multiple occurrences in a paragraph", () => {
    const state = makeState("cat and cat and cat");
    const matches = computeMatches(state.doc, "cat", false);
    expect(matches).toHaveLength(3);
  });

  it("is case-insensitive by default", () => {
    const state = makeState("Hello HELLO hello");
    const matches = computeMatches(state.doc, "hello", false);
    expect(matches).toHaveLength(3);
  });

  it("respects case-sensitive flag", () => {
    const state = makeState("Hello HELLO hello");
    const matches = computeMatches(state.doc, "hello", true);
    expect(matches).toHaveLength(1);
  });

  it("finds occurrences across multiple paragraphs", () => {
    const state = makeState("First foo\n\nSecond foo\n\nThird foo");
    const matches = computeMatches(state.doc, "foo", false);
    expect(matches).toHaveLength(3);
  });

  it("returns empty array when query is not found", () => {
    const state = makeState("Hello world");
    expect(computeMatches(state.doc, "xyz", false)).toHaveLength(0);
  });
});

// ── Plugin initial state ────────────────────────────────────────────────────────

describe("findReplacePlugin initial state", () => {
  it("starts with an empty query and no matches", () => {
    const state = makeState("Hello world");
    const ps = getPluginState(state);
    expect(ps.query).toBe("");
    expect(ps.matches).toHaveLength(0);
    expect(ps.current).toBe(0);
  });
});

// ── Plugin state transitions via transactions ──────────────────────────────────

describe("findReplacePlugin state transitions", () => {
  it("updates matches after setQuery meta", () => {
    let state = makeState("Hello hello HELLO");
    const tr = state.tr.setMeta("findReplaceSetQuery", {
      query: "hello",
      caseSensitive: false,
    });
    state = state.apply(tr);
    const ps = getPluginState(state);
    expect(ps.query).toBe("hello");
    expect(ps.matches).toHaveLength(3);
    expect(ps.current).toBe(0);
  });

  it("clears matches when query is set to empty string", () => {
    let state = makeState("foo bar foo");
    let tr = state.tr.setMeta("findReplaceSetQuery", {
      query: "foo",
      caseSensitive: false,
    });
    state = state.apply(tr);
    expect(getPluginState(state).matches).toHaveLength(2);

    tr = state.tr.setMeta("findReplaceSetQuery", {
      query: "",
      caseSensitive: false,
    });
    state = state.apply(tr);
    expect(getPluginState(state).matches).toHaveLength(0);
  });

  it("advances current index with META_NEXT", () => {
    let state = makeState("cat and cat and cat");
    let tr = state.tr.setMeta("findReplaceSetQuery", {
      query: "cat",
      caseSensitive: false,
    });
    state = state.apply(tr);
    expect(getPluginState(state).current).toBe(0);

    tr = state.tr.setMeta("findReplaceNext", true);
    state = state.apply(tr);
    expect(getPluginState(state).current).toBe(1);

    tr = state.tr.setMeta("findReplaceNext", true);
    state = state.apply(tr);
    expect(getPluginState(state).current).toBe(2);
  });

  it("wraps around to first match on META_NEXT at last match", () => {
    let state = makeState("cat and cat");
    let tr = state.tr.setMeta("findReplaceSetQuery", {
      query: "cat",
      caseSensitive: false,
    });
    state = state.apply(tr);
    // advance to last (index 1)
    tr = state.tr.setMeta("findReplaceNext", true);
    state = state.apply(tr);
    expect(getPluginState(state).current).toBe(1);
    // wrap
    tr = state.tr.setMeta("findReplaceNext", true);
    state = state.apply(tr);
    expect(getPluginState(state).current).toBe(0);
  });

  it("decrements current index with META_PREV", () => {
    let state = makeState("cat and cat and cat");
    let tr = state.tr.setMeta("findReplaceSetQuery", {
      query: "cat",
      caseSensitive: false,
    });
    state = state.apply(tr);
    // wrap backwards from 0 → last
    tr = state.tr.setMeta("findReplacePrev", true);
    state = state.apply(tr);
    expect(getPluginState(state).current).toBe(2);
  });

  it("recomputes matches after doc change when query is set", () => {
    let state = makeState("cat and cat");
    let tr = state.tr.setMeta("findReplaceSetQuery", {
      query: "cat",
      caseSensitive: false,
    });
    state = state.apply(tr);
    expect(getPluginState(state).matches).toHaveLength(2);

    // Insert text that adds another "cat"
    const insertTr = state.tr.insertText(" cat", state.doc.content.size - 1);
    state = state.apply(insertTr);
    expect(getPluginState(state).matches).toHaveLength(3);
  });
});

// ── Decorations ────────────────────────────────────────────────────────────────

describe("findReplacePlugin decorations", () => {
  it("produces no decorations when query is empty", () => {
    const { state, plugin } = makeStateWithPlugin("Hello world");
    const decos = getDecorations(plugin, state);
    expect(decos?.find().length ?? 0).toBe(0);
  });

  it("produces one decoration per match", () => {
    const { state: initial, plugin } = makeStateWithPlugin(
      "cat and cat and cat",
    );
    const tr = initial.tr.setMeta("findReplaceSetQuery", {
      query: "cat",
      caseSensitive: false,
    });
    const state = initial.apply(tr);
    const decos = getDecorations(plugin, state);
    expect(decos?.find().length).toBe(3);
  });

  it("marks active match with active class", () => {
    const { state: initial, plugin } = makeStateWithPlugin("cat and cat");
    const tr = initial.tr.setMeta("findReplaceSetQuery", {
      query: "cat",
      caseSensitive: false,
    });
    const state = initial.apply(tr);
    const decos = getDecorations(plugin, state);
    const all = decos?.find() ?? [];
    const active = all.filter((d) =>
      (d.type as unknown as { attrs: { class: string } }).attrs.class.includes(
        "refinex-find-match-active",
      ),
    );
    expect(active).toHaveLength(1);
  });
});

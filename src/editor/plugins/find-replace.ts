import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { EditorView } from "prosemirror-view";
import type { Node as ProseMirrorNode } from "prosemirror-model";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FindReplaceMatch {
  from: number;
  to: number;
}

export interface FindReplaceState {
  query: string;
  caseSensitive: boolean;
  matches: ReadonlyArray<FindReplaceMatch>;
  current: number;
}

const EMPTY_STATE: FindReplaceState = {
  query: "",
  caseSensitive: false,
  matches: [],
  current: 0,
};

// ── Plugin key ─────────────────────────────────────────────────────────────────

export const findReplaceKey = new PluginKey<FindReplaceState>(
  "refinexFindReplace",
);

// ── Meta keys ─────────────────────────────────────────────────────────────────

const META_SET_QUERY = "findReplaceSetQuery";
const META_NEXT = "findReplaceNext";
const META_PREV = "findReplacePrev";

// ── Match computation ──────────────────────────────────────────────────────────

/**
 * Iterates all text nodes in the document and returns {from, to} positions of
 * all occurrences of `query`. Returns an empty array if query is empty.
 */
export function computeMatches(
  doc: ProseMirrorNode,
  query: string,
  caseSensitive: boolean,
): FindReplaceMatch[] {
  if (!query) {
    return [];
  }

  const needle = caseSensitive ? query : query.toLowerCase();
  const results: FindReplaceMatch[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return true;
    }

    const haystack = caseSensitive ? node.text : node.text.toLowerCase();
    let idx = haystack.indexOf(needle);
    while (idx !== -1) {
      results.push({ from: pos + idx, to: pos + idx + needle.length });
      idx = haystack.indexOf(needle, idx + 1);
    }

    return false; // text nodes have no children
  });

  return results;
}

// ── Plugin ─────────────────────────────────────────────────────────────────────

export function findReplacePlugin(): Plugin<FindReplaceState> {
  return new Plugin<FindReplaceState>({
    key: findReplaceKey,

    state: {
      init() {
        return EMPTY_STATE;
      },

      apply(tr, prev) {
        const setQueryMeta = tr.getMeta(META_SET_QUERY) as
          | { query: string; caseSensitive: boolean }
          | undefined;
        const nextMeta = tr.getMeta(META_NEXT) as boolean | undefined;
        const prevMeta = tr.getMeta(META_PREV) as boolean | undefined;

        let next: FindReplaceState;

        if (setQueryMeta !== undefined) {
          const { query, caseSensitive } = setQueryMeta;
          const matches = computeMatches(tr.doc, query, caseSensitive);
          next = { query, caseSensitive, matches, current: 0 };
        } else if (tr.docChanged && prev.query) {
          // Recompute after content change (e.g. replace operation)
          const matches = computeMatches(
            tr.doc,
            prev.query,
            prev.caseSensitive,
          );
          const current = Math.min(
            prev.current,
            Math.max(0, matches.length - 1),
          );
          next = { ...prev, matches, current };
        } else if (nextMeta) {
          const total = prev.matches.length;
          const current = total === 0 ? 0 : (prev.current + 1) % total;
          next = { ...prev, current };
        } else if (prevMeta) {
          const total = prev.matches.length;
          const current = total === 0 ? 0 : (prev.current - 1 + total) % total;
          next = { ...prev, current };
        } else {
          return prev;
        }

        return next;
      },
    },

    props: {
      decorations(state) {
        const pluginState = findReplaceKey.getState(state);
        if (!pluginState?.query || pluginState.matches.length === 0) {
          return DecorationSet.empty;
        }

        const decorations: Decoration[] = pluginState.matches.map(
          (match, i) => {
            const isActive = i === pluginState.current;
            return Decoration.inline(match.from, match.to, {
              class: isActive
                ? "refinex-find-match refinex-find-match-active"
                : "refinex-find-match",
            });
          },
        );

        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
}

// ── Dispatch helpers ───────────────────────────────────────────────────────────

/**
 * Update the search query (and optionally case-sensitivity) in the plugin.
 * Triggers full match recompute. Pass empty string to clear.
 */
export function dispatchFindQuery(
  view: EditorView,
  query: string,
  caseSensitive = false,
): void {
  const tr = view.state.tr.setMeta(META_SET_QUERY, { query, caseSensitive });
  view.dispatch(tr);
}

/**
 * Advance to the next match and scroll it into view.
 */
export function dispatchFindNext(view: EditorView): void {
  const pluginState = findReplaceKey.getState(view.state);
  if (!pluginState || pluginState.matches.length === 0) {
    return;
  }

  const tr = view.state.tr.setMeta(META_NEXT, true);
  view.dispatch(tr);

  // After dispatch, read updated state and scroll to match
  _scrollToCurrentMatch(view);
}

/**
 * Go back to the previous match and scroll it into view.
 */
export function dispatchFindPrev(view: EditorView): void {
  const pluginState = findReplaceKey.getState(view.state);
  if (!pluginState || pluginState.matches.length === 0) {
    return;
  }

  const tr = view.state.tr.setMeta(META_PREV, true);
  view.dispatch(tr);

  _scrollToCurrentMatch(view);
}

/**
 * Replace the current match with `replacement` and advance to the next match.
 */
export function dispatchReplaceOne(
  view: EditorView,
  replacement: string,
): void {
  const pluginState = findReplaceKey.getState(view.state);
  if (!pluginState || pluginState.matches.length === 0) {
    return;
  }

  const match = pluginState.matches[pluginState.current];
  if (!match) {
    return;
  }

  const schema = view.state.schema;
  const tr = view.state.tr.replaceWith(
    match.from,
    match.to,
    replacement ? schema.text(replacement) : [],
  );
  // After this dispatch, plugin's apply will recompute matches via docChanged
  view.dispatch(tr);

  // Advance to next (the replace shrinks/expands positions, recomputed by plugin)
  _scrollToCurrentMatch(view);
}

/**
 * Replace all matches with `replacement`.
 * Iterates matches in reverse order to preserve position validity.
 */
export function dispatchReplaceAll(
  view: EditorView,
  replacement: string,
): void {
  const pluginState = findReplaceKey.getState(view.state);
  if (!pluginState || pluginState.matches.length === 0) {
    return;
  }

  const schema = view.state.schema;
  let tr = view.state.tr;

  // Replace in reverse to preserve earlier positions
  const matches = [...pluginState.matches].reverse();
  for (const match of matches) {
    tr = tr.replaceWith(
      tr.mapping.map(match.from),
      tr.mapping.map(match.to),
      replacement ? schema.text(replacement) : [],
    );
  }

  view.dispatch(tr);
}

// ── Internal helper ────────────────────────────────────────────────────────────

function _scrollToCurrentMatch(view: EditorView): void {
  const pluginState = findReplaceKey.getState(view.state);
  if (!pluginState || pluginState.matches.length === 0) {
    return;
  }

  const match = pluginState.matches[pluginState.current];
  if (!match) {
    return;
  }

  const { state } = view;
  const selection = TextSelection.create(state.doc, match.from, match.to);
  const scrollTr = state.tr.setSelection(selection).scrollIntoView();
  view.dispatch(scrollTr);
}

import { Plugin, PluginKey, type Transaction } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export type AIWriteHighlightPhase = "active" | "fading";

export interface AIWriteHighlightState {
  from: number;
  to: number;
  phase: AIWriteHighlightPhase;
}

export const refinexAIWriteHighlightKey =
  new PluginKey<AIWriteHighlightState | null>("refinexAIWriteHighlight");
export const AI_WRITE_HIGHLIGHT_META_KEY = "refinexAIWriteHighlightMeta";

export function setAIWriteHighlightMeta(
  transaction: Transaction,
  highlight: AIWriteHighlightState | null,
) {
  return transaction.setMeta(AI_WRITE_HIGHLIGHT_META_KEY, highlight);
}

export function aiWriteHighlightPlugin() {
  return new Plugin<AIWriteHighlightState | null>({
    key: refinexAIWriteHighlightKey,
    state: {
      init: () => null,
      apply(transaction, value) {
        const meta = transaction.getMeta(
          AI_WRITE_HIGHLIGHT_META_KEY,
        ) as AIWriteHighlightState | null | undefined;
        if (meta !== undefined) {
          return meta;
        }

        if (!value || !transaction.docChanged) {
          return value;
        }

        const from = transaction.mapping.map(value.from, 1);
        const to = transaction.mapping.map(value.to, -1);
        return from < to ? { ...value, from, to } : null;
      },
    },
    props: {
      decorations(state) {
        const highlight = refinexAIWriteHighlightKey.getState(state);
        if (!highlight || highlight.from >= highlight.to) {
          return DecorationSet.empty;
        }

        return DecorationSet.create(state.doc, [
          Decoration.inline(highlight.from, highlight.to, {
            class:
              highlight.phase === "active"
                ? "refinex-ai-write-highlight"
                : "refinex-ai-write-highlight refinex-ai-write-highlight-fading",
          }),
        ]);
      },
    },
  });
}

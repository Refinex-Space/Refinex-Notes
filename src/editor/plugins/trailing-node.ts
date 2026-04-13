import { Fragment, type Node as ProseMirrorNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";

import { refinexSchema } from "../schema";

export const refinexTrailingNodeKey = new PluginKey("refinexTrailingNode");

export function trailingNodePlugin() {
  return new Plugin({
    key: refinexTrailingNodeKey,
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((transaction) => transaction.docChanged)) {
        return null;
      }

      if (transactions.some((transaction) => transaction.getMeta(refinexTrailingNodeKey))) {
        return null;
      }

      if (hasTrailingParagraph(newState.doc)) {
        return null;
      }

      const transaction = newState.tr.insert(
        newState.doc.content.size,
        refinexSchema.nodes.paragraph.create(),
      );
      transaction.setMeta(refinexTrailingNodeKey, true);
      return transaction;
    },
  });
}

export function ensureTrailingParagraph(doc: ProseMirrorNode): ProseMirrorNode {
  if (hasTrailingParagraph(doc)) {
    return doc;
  }

  return doc.copy(
    doc.content.append(Fragment.from(refinexSchema.nodes.paragraph.create())),
  );
}

export function stripTrailingParagraph(doc: ProseMirrorNode): ProseMirrorNode {
  if (!hasTrailingParagraph(doc) || doc.childCount <= 1) {
    return doc;
  }

  const trailingSize = doc.lastChild?.nodeSize ?? 0;
  return doc.copy(doc.content.cut(0, doc.content.size - trailingSize));
}

function hasTrailingParagraph(doc: ProseMirrorNode): boolean {
  return (
    doc.lastChild?.type === refinexSchema.nodes.paragraph &&
    doc.lastChild.content.size === 0
  );
}

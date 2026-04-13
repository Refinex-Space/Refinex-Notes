import type { Node as ProseMirrorNode } from "prosemirror-model";
import { Plugin, PluginKey, type Transaction } from "prosemirror-state";
import { Mapping } from "prosemirror-transform";

const INLINE_SYNC_META = "refinex-inline-sync";

export const refinexInlineSyncKey = new PluginKey("refinexInlineSyncKey");

export interface InlineSyncParser {
  parse(markdown: string): ProseMirrorNode;
}

export interface InlineSyncSerializer {
  serialize(node: ProseMirrorNode): string;
}

interface ChangedRange {
  from: number;
  to: number;
}

interface AffectedTextblock {
  pos: number;
  node: ProseMirrorNode;
}

function collectChangedRanges(transactions: readonly Transaction[]): ChangedRange[] {
  const stepMaps = transactions.flatMap((transaction) => transaction.mapping.maps);
  const ranges: ChangedRange[] = [];

  stepMaps.forEach((stepMap, index) => {
    const tailMapping = new Mapping();
    for (let i = index + 1; i < stepMaps.length; i++) {
      tailMapping.appendMap(stepMaps[i]);
    }

    stepMap.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
      const from = tailMapping.map(newStart, 1);
      const to = tailMapping.map(newEnd, -1);

      ranges.push({
        from: Math.min(from, to),
        to: Math.max(from, to),
      });
    });
  });

  ranges.sort((left, right) => left.from - right.from);

  const merged: ChangedRange[] = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (!previous || range.from > previous.to + 1) {
      merged.push({ ...range });
      continue;
    }

    previous.to = Math.max(previous.to, range.to);
  }

  return merged;
}

function collectAffectedTextblocks(
  doc: ProseMirrorNode,
  ranges: readonly ChangedRange[],
): AffectedTextblock[] {
  const blocks = new Map<number, ProseMirrorNode>();

  for (const range of ranges) {
    const from = Math.max(0, range.from - 1);
    const to = Math.min(doc.content.size, Math.max(range.to + 1, from + 1));

    doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isTextblock) {
        return;
      }

      if (node.type.spec.code === true) {
        return false;
      }

      blocks.set(pos, node);
      return false;
    });
  }

  return [...blocks.entries()]
    .map(([pos, node]) => ({ pos, node }))
    .sort((left, right) => right.pos - left.pos);
}

export function inlineSyncPlugin(
  _parser: InlineSyncParser,
  _serializer: InlineSyncSerializer,
) {
  return new Plugin({
    key: refinexInlineSyncKey,
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((transaction) => transaction.docChanged)) {
        return null;
      }

      if (transactions.some((transaction) => transaction.getMeta(INLINE_SYNC_META))) {
        return null;
      }

      const changedRanges = collectChangedRanges(transactions);
      if (changedRanges.length === 0) {
        return null;
      }

      const affectedBlocks = collectAffectedTextblocks(newState.doc, changedRanges);
      if (affectedBlocks.length === 0) {
        return null;
      }

      return null;
    },
  });
}

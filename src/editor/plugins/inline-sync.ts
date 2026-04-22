import { Fragment, type Node as ProseMirrorNode, Slice } from "prosemirror-model";
import {
  Plugin,
  PluginKey,
  TextSelection,
  type Transaction,
} from "prosemirror-state";
import { Mapping } from "prosemirror-transform";

export const refinexInlineSyncKey = new PluginKey("refinexInlineSyncKey");
export const refinexForceInlineSyncMetaKey = "refinexForceInlineSync";

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

interface RewriteCandidate {
  fragment: Fragment;
  selection: number | null;
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

function isEmptyTextblock(node: ProseMirrorNode): boolean {
  return node.isTextblock && node.childCount === 0 && node.textContent.length === 0;
}

function isEligibleTextblock(node: ProseMirrorNode): boolean {
  if (node.type.name !== "paragraph" || node.childCount === 0) {
    return false;
  }

  let plain = true;
  node.forEach((child) => {
    if (!child.isText || child.marks.length > 0) {
      plain = false;
    }
  });
  return plain;
}

function getSelectionOffset(node: ProseMirrorNode, pos: number, head: number): number | null {
  const start = pos + 1;
  const end = pos + node.nodeSize - 1;

  if (head < start || head > end) {
    return null;
  }

  return Math.min(Math.max(head - start, 0), node.content.size);
}

function mapSelectionFromPrefix(
  parser: InlineSyncParser,
  markdown: string,
  selectionOffset: number,
  rewrittenDoc: ProseMirrorNode,
): number | null {
  const prefix = markdown.slice(0, Math.max(0, Math.min(selectionOffset, markdown.length)));
  const targetTextOffset = parser.parse(prefix).textContent.length;

  let remaining = targetTextOffset;
  let firstTextPosition: number | null = null;
  let lastTextEnd: number | null = null;
  let emptyTextblockStart: number | null = null;
  let resolved: number | null = null;

  rewrittenDoc.descendants((child, pos) => {
    if (child.isTextblock && child.content.size === 0 && emptyTextblockStart === null) {
      emptyTextblockStart = pos + 1;
    }

    if (!child.isText) {
      return true;
    }

    firstTextPosition ??= pos;
    const text = child.text ?? "";
    if (remaining <= text.length) {
      resolved = pos + remaining;
      return false;
    }

    remaining -= text.length;
    lastTextEnd = pos + text.length;
    return true;
  });

  if (resolved !== null) {
    return resolved;
  }

  if (targetTextOffset === 0) {
    return firstTextPosition ?? emptyTextblockStart;
  }

  return lastTextEnd ?? emptyTextblockStart;
}

function buildRewriteCandidate(
  node: ProseMirrorNode,
  parser: InlineSyncParser,
  selectionOffset: number | null,
): RewriteCandidate | null {
  const markdown = node.textContent;
  const parsedDoc = parser.parse(markdown);
  const fragment = parsedDoc.content;
  if (fragment.eq(Fragment.from(node))) {
    return null;
  }

  return {
    fragment,
    selection:
      selectionOffset === null
        ? null
        : mapSelectionFromPrefix(parser, markdown, selectionOffset, parsedDoc),
  };
}

export function inlineSyncPlugin(
  parser: InlineSyncParser,
  serializer: InlineSyncSerializer,
) {
  return new Plugin({
    key: refinexInlineSyncKey,
    appendTransaction(transactions, _oldState, newState) {
      const forceInlineSync = transactions.some((transaction) =>
        transaction.getMeta(refinexForceInlineSyncMetaKey),
      );

      if (!forceInlineSync && !transactions.some((transaction) => transaction.docChanged)) {
        return null;
      }

      if (transactions.some((transaction) => transaction.getMeta(refinexInlineSyncKey))) {
        return null;
      }

      const changedRanges = forceInlineSync
        ? [{ from: 0, to: newState.doc.content.size }]
        : collectChangedRanges(transactions);
      if (changedRanges.length === 0) {
        return null;
      }

      const affectedBlocks = collectAffectedTextblocks(newState.doc, changedRanges);
      if (affectedBlocks.length === 0) {
        return null;
      }

      let transaction: Transaction | null = null;

      for (const block of affectedBlocks) {
        if (isEmptyTextblock(block.node) || !isEligibleTextblock(block.node)) {
          continue;
        }

        const selectionOffset = getSelectionOffset(
          block.node,
          block.pos,
          newState.selection.head,
        );
        const rewrite = buildRewriteCandidate(
          block.node,
          parser,
          selectionOffset,
        );

        if (!rewrite) {
          continue;
        }

        transaction ??= newState.tr;

        const from = transaction.mapping.map(block.pos, 1);
        const to = transaction.mapping.map(block.pos + block.node.nodeSize, -1);
        const $from = transaction.doc.resolve(from);
        const $to = transaction.doc.resolve(to);

        if (
          !$from.sameParent($to) ||
          !$from.parent.canReplace($from.index(), $to.index(), rewrite.fragment)
        ) {
          continue;
        }

        transaction.replaceRange(from, to, new Slice(rewrite.fragment, 0, 0));

        if (rewrite.selection !== null) {
          const selectionPosition = Math.max(
            0,
            Math.min(from + rewrite.selection, transaction.doc.content.size),
          );
          transaction.setSelection(
            TextSelection.near(transaction.doc.resolve(selectionPosition)),
          );
        }
      }

      if (!transaction || !transaction.docChanged) {
        return null;
      }

      transaction.setMeta(refinexInlineSyncKey, true);
      return transaction;
    },
  });
}

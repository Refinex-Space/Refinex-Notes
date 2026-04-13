import {
  chainCommands,
  exitCode,
  liftEmptyBlock,
  selectAll,
  setBlockType,
  splitBlockKeepMarks,
  toggleMark,
} from "prosemirror-commands";
import { redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { liftListItem, sinkListItem, splitListItem } from "prosemirror-schema-list";
import type { Command, EditorState } from "prosemirror-state";

import { refinexSchema } from "../schema";

export function refinexKeymap() {
  return keymap(createRefinexKeyBindings());
}

export function createRefinexKeyBindings(): Record<string, Command> {
  return {
    "Mod-b": toggleMark(refinexSchema.marks.strong),
    "Mod-i": toggleMark(refinexSchema.marks.em),
    "Mod-`": toggleMark(refinexSchema.marks.code),
    "Mod-k": promptForLink(),
    "Mod-Shift-x": toggleMark(refinexSchema.marks.strikethrough),
    "Mod-Shift-1": setBlockType(refinexSchema.nodes.heading, { level: 1 }),
    "Mod-Shift-2": setBlockType(refinexSchema.nodes.heading, { level: 2 }),
    "Mod-Shift-3": setBlockType(refinexSchema.nodes.heading, { level: 3 }),
    "Mod-Shift-4": setBlockType(refinexSchema.nodes.heading, { level: 4 }),
    "Mod-Shift-5": setBlockType(refinexSchema.nodes.heading, { level: 5 }),
    "Mod-Shift-6": setBlockType(refinexSchema.nodes.heading, { level: 6 }),
    "Mod-Shift-0": setBlockType(refinexSchema.nodes.paragraph),
    Tab: chainCommands(
      sinkListItem(refinexSchema.nodes.list_item),
      sinkListItem(refinexSchema.nodes.task_list_item),
    ),
    "Shift-Tab": chainCommands(
      liftListItem(refinexSchema.nodes.task_list_item),
      liftListItem(refinexSchema.nodes.list_item),
    ),
    Enter: chainCommands(
      exitCode,
      splitListItem(refinexSchema.nodes.list_item),
      splitListItem(refinexSchema.nodes.task_list_item),
      liftEmptyBlock,
      splitBlockKeepMarks,
    ),
    "Mod-Enter": exitCode,
    Backspace: chainCommands(
      liftEmptyBlock,
      liftListItem(refinexSchema.nodes.task_list_item),
      liftListItem(refinexSchema.nodes.list_item),
    ),
    "Mod-z": undo,
    "Mod-Shift-z": redo,
    "Mod-y": redo,
    "Ctrl-y": redo,
    "Mod-a": selectAll,
  };
}

function promptForLink(): Command {
  return (state, dispatch) => {
    const linkMark = refinexSchema.marks.link;
    const range = findLinkRange(state);
    if (state.selection.empty && !range) {
      return false;
    }

    const promptFn = globalThis.prompt;
    if (typeof promptFn !== "function") {
      return false;
    }

    const href = promptFn("输入链接地址", range?.mark.attrs.href ?? "");
    if (href === null) {
      return true;
    }

    const from = range?.from ?? state.selection.from;
    const to = range?.to ?? state.selection.to;
    if (from === to) {
      return false;
    }

    const tr = state.tr.removeMark(from, to, linkMark);
    if (href.trim().length > 0) {
      tr.addMark(from, to, linkMark.create({ href: href.trim(), title: null }));
    }

    if (dispatch) {
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}

function findLinkRange(state: EditorState) {
  const linkMark = refinexSchema.marks.link;
  const { selection } = state;

  if (!selection.empty) {
    let activeMark: ReturnType<typeof linkMark.create> | null = null;
    state.doc.nodesBetween(selection.from, selection.to, (node) => {
      if (!node.isText) {
        return true;
      }

      const nextMark = node.marks.find((mark) => mark.type === linkMark);
      if (nextMark) {
        activeMark = nextMark;
        return false;
      }
      return true;
    });

    return state.doc.rangeHasMark(selection.from, selection.to, linkMark)
      ? { from: selection.from, to: selection.to, mark: activeMark ?? linkMark.create({ href: "", title: null }) }
      : null;
  }

  const { $from } = selection;
  const activeMark = $from.marks().find((mark) => mark.type === linkMark);
  if (!activeMark) {
    return null;
  }

  let from = $from.pos;
  let to = $from.pos;

  while (from > 0) {
    const $pos = state.doc.resolve(from);
    const nodeBefore = $pos.nodeBefore;
    if (!nodeBefore?.isText || !linkMark.isInSet(nodeBefore.marks)) {
      break;
    }
    from -= nodeBefore.nodeSize;
  }

  while (to < state.doc.content.size) {
    const $pos = state.doc.resolve(to);
    const nodeAfter = $pos.nodeAfter;
    if (!nodeAfter?.isText || !linkMark.isInSet(nodeAfter.marks)) {
      break;
    }
    to += nodeAfter.nodeSize;
  }

  return { from, to, mark: activeMark };
}

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
import type { EditorView } from "prosemirror-view";

import { createLinkPopoverCommand } from "../rich-ui";
import { refinexSchema } from "../schema";

export type RefinexKeymapOptions = {
  onOpenLinkPopover?: (view: EditorView) => boolean;
};

export function refinexKeymap(options: RefinexKeymapOptions = {}) {
  return keymap(createRefinexKeyBindings(options));
}

export function createRefinexKeyBindings(
  options: RefinexKeymapOptions = {},
): Record<string, Command> {
  return {
    "Mod-b": toggleMark(refinexSchema.marks.strong),
    "Mod-i": toggleMark(refinexSchema.marks.em),
    "Mod-`": toggleMark(refinexSchema.marks.code),
    "Mod-k": createLinkPopoverCommand({
      onOpen: options.onOpenLinkPopover
        ? (view) => {
            options.onOpenLinkPopover?.(view);
          }
        : undefined,
    }),
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

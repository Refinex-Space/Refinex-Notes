import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

import { findSlashTrigger, type SlashTriggerMatch } from "../rich-ui";

export const refinexSlashMenuKey = new PluginKey("refinexSlashMenu");

export function slashMenuPlugin(options: {
  onChange: (trigger: SlashTriggerMatch | null, view: EditorView) => void;
}) {
  return new Plugin({
    key: refinexSlashMenuKey,
    view(editorView) {
      let previousKey = "";

      const emit = (view: EditorView) => {
        const trigger = findSlashTrigger(view.state);
        const nextKey = trigger ? `${trigger.from}:${trigger.to}` : "";
        if (nextKey === previousKey) {
          return;
        }
        previousKey = nextKey;
        options.onChange(trigger, view);
      };

      emit(editorView);

      return {
        update(view) {
          emit(view);
        },
        destroy() {
          options.onChange(null, editorView);
        },
      };
    },
  });
}

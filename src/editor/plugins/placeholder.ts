import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const DEFAULT_PLACEHOLDER = "输入 / 唤出命令，或开始写作...";

export const refinexPlaceholderKey = new PluginKey("refinexPlaceholder");

export function placeholderPlugin(placeholder = DEFAULT_PLACEHOLDER) {
  return new Plugin({
    key: refinexPlaceholderKey,
    props: {
      decorations(state) {
        if (!isPlaceholderDocument(state.doc)) {
          return null;
        }

        return DecorationSet.create(state.doc, [
          Decoration.widget(
            1,
            () => {
              const span = document.createElement("span");
              span.className = "refinex-editor-placeholder";
              span.dataset.refinexPlaceholder = placeholder;
              span.textContent = placeholder;
              return span;
            },
            {
              side: -1,
              ignoreSelection: true,
            },
          ),
        ]);
      },
    },
  });
}

function isPlaceholderDocument(doc: Parameters<NonNullable<ReturnType<typeof placeholderPlugin>["props"]["decorations"]>>[0]["doc"]) {
  return (
    doc.childCount === 1 &&
    doc.firstChild?.type.name === "paragraph" &&
    doc.firstChild.content.size === 0
  );
}

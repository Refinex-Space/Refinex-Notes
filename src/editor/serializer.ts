import type { Node as ProseMirrorNode } from "prosemirror-model";
import {
  MarkdownSerializer,
  type MarkdownSerializerState,
} from "prosemirror-markdown";
import { refinexSchema } from "./schema";

// ---------------------------------------------------------------------------
// Node serializers
// ---------------------------------------------------------------------------

const nodeSerializers: Record<
  string,
  (
    state: MarkdownSerializerState,
    node: ProseMirrorNode,
    parent: ProseMirrorNode,
    index: number,
  ) => void
> = {
  paragraph(state, node) {
    state.renderInline(node);
    state.closeBlock(node);
  },

  heading(state, node) {
    state.write(`${"#".repeat(node.attrs.level as number)} `);
    state.renderInline(node);
    state.closeBlock(node);
  },

  blockquote(state, node) {
    state.wrapBlock("> ", null, node, () => state.renderContent(node));
  },

  code_block(state, node) {
    const language = (node.attrs.language as string) || "";
    state.write(`\`\`\`${language}\n`);
    state.text(node.textContent, false);
    state.ensureNewLine();
    state.write("```");
    state.closeBlock(node);
  },

  horizontal_rule(state, node) {
    state.write("---");
    state.closeBlock(node);
  },

  bullet_list(state, node) {
    state.renderList(node, "  ", () => "- ");
  },

  ordered_list(state, node) {
    const start = (node.attrs.start as number) || 1;
    state.renderList(node, "  ", (i) => `${start + i}. `);
  },

  list_item(state, node) {
    state.renderContent(node);
  },

  task_list_item(state, node) {
    const checked = node.attrs.checked as boolean;
    const marker = checked ? "[x] " : "[ ] ";
    // Render the first child paragraph inline with the marker prefix,
    // then render remaining children normally.
    const first = node.firstChild;
    if (first && first.type.name === "paragraph") {
      state.write(marker);
      state.renderInline(first);
      state.closeBlock(first);
      for (let i = 1; i < node.childCount; i++) {
        state.render(node.child(i), node, i);
      }
    } else {
      state.write(marker);
      state.renderContent(node);
    }
  },

  image(state, node) {
    const alt = state.esc((node.attrs.alt as string) ?? "");
    const src = (node.attrs.src as string).replace(/[()]/g, "\\$&");
    const title = node.attrs.title as string | null;
    state.write(
      `![${alt}](${src}${title ? ` "${title.replace(/"/g, '\\"')}"` : ""})`,
    );
  },

  hard_break(state) {
    state.write("\\\n");
  },

  text(state, node) {
    state.text(node.text || "");
  },

  // GFM table serialization
  table(state, node) {
    // Collect column alignments from the first row (header row)
    const alignments: (string | null)[] = [];
    const firstRow = node.firstChild;
    if (firstRow) {
      firstRow.forEach((cell) => {
        alignments.push((cell.attrs.align as string | null) ?? null);
      });
    }

    // Render each row
    node.forEach((row, _offset, rowIndex) => {
      let isFirst = true;
      row.forEach((cell) => {
        if (isFirst) {
          state.write("| ");
          isFirst = false;
        } else {
          state.write(" | ");
        }
        state.renderInline(cell);
      });
      state.write(" |");
      state.ensureNewLine();

      // After header row, emit the separator line
      if (rowIndex === 0) {
        let sepFirst = true;
        for (const align of alignments) {
          if (sepFirst) {
            state.write("| ");
            sepFirst = false;
          } else {
            state.write(" | ");
          }
          if (align === "center") {
            state.write(":---:");
          } else if (align === "right") {
            state.write("---:");
          } else if (align === "left") {
            state.write(":---");
          } else {
            state.write("---");
          }
        }
        state.write(" |");
        state.ensureNewLine();
      }
    });

    // Close the table block
    state.closeBlock(node);
  },

  table_row() {
    // Handled by table serializer
  },

  table_header(state, node) {
    state.renderInline(node);
  },

  table_cell(state, node) {
    state.renderInline(node);
  },
};

// ---------------------------------------------------------------------------
// Mark serializers
// ---------------------------------------------------------------------------

const markSerializers = {
  strong: {
    open: "**",
    close: "**",
    mixable: true,
    expelEnclosingWhitespace: true,
  } as const,
  em: {
    open: "*",
    close: "*",
    mixable: true,
    expelEnclosingWhitespace: true,
  } as const,
  code: {
    open(
      _state: MarkdownSerializerState,
      _mark: unknown,
      parent: ProseMirrorNode,
      index: number,
    ) {
      return backticksFor(parent.child(index), -1);
    },
    close(
      _state: MarkdownSerializerState,
      _mark: unknown,
      parent: ProseMirrorNode,
      index: number,
    ) {
      const textIndex = Math.max(0, index - 1);
      return backticksFor(parent.child(textIndex), 1);
    },
    escape: false,
  } as const,
  link: {
    open: "[",
    close(
      _state: MarkdownSerializerState,
      mark: { attrs: Record<string, unknown> },
    ) {
      const href = mark.attrs.href as string;
      const title = mark.attrs.title as string | null | undefined;
      return `](${href}${title ? ` "${title}"` : ""})`;
    },
    mixable: false,
  } as const,
  strikethrough: {
    open: "~~",
    close: "~~",
    mixable: true,
    expelEnclosingWhitespace: true,
  } as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function backticksFor(textNode: ProseMirrorNode, side: -1 | 1): string {
  const text = textNode.isText ? textNode.text! : "";
  let ticks = /`+/g;
  let m: RegExpExecArray | null;
  let len = 0;
  if (side === -1) {
    // Opening backtick: check if text starts with a backtick
    while ((m = ticks.exec(text))) {
      len = Math.max(len, m[0].length);
    }
  } else {
    while ((m = ticks.exec(text))) {
      len = Math.max(len, m[0].length);
    }
  }
  let result = len > 0 ? "`".repeat(len + 1) : "`";
  if (text.startsWith("`")) result += " ";
  if (side === 1 && text.endsWith("`")) result = " " + result;
  return result;
}

// ---------------------------------------------------------------------------
// Serializer instance
// ---------------------------------------------------------------------------

export const refinexSerializer = new MarkdownSerializer(
  nodeSerializers,
  markSerializers,
);

// ---------------------------------------------------------------------------
// Convenience function
// ---------------------------------------------------------------------------

export function serializeMarkdown(doc: ProseMirrorNode): string {
  return refinexSerializer.serialize(doc);
}

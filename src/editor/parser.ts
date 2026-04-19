import type { Node as ProseMirrorNode } from "prosemirror-model";
import { MarkdownParser } from "prosemirror-markdown";
import markdownit from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import taskLists from "markdown-it-task-lists";
import { refinexSchema } from "./schema";

// ---------------------------------------------------------------------------
// markdown-it instance with GFM features
// ---------------------------------------------------------------------------

const md = markdownit({ html: false })
  .enable("table")
  .enable("strikethrough")
  .use(taskLists);

// ---------------------------------------------------------------------------
// Custom core rule: transform markdown-it-task-lists HTML output into clean
// tokens that MarkdownParser can map to task_list_item nodes.
//
// markdown-it-task-lists emits regular list_item tokens with a class attr and
// an inline <input> checkbox.  We rename the tokens and extract `checked`.
// ---------------------------------------------------------------------------

function extractAlign(token: Token): string | null {
  const style = token.attrGet("style") ?? "";
  const m = style.match(/text-align:\s*(left|center|right)/);
  return m ? m[1] : null;
}

md.core.ruler.push("refinex_task_items", (state) => {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (tok.type !== "list_item_open") continue;

    const cls = tok.attrGet("class") ?? "";
    if (!cls.includes("task-list-item")) continue;

    // Rename open token
    tok.type = "task_list_item_open";

    // Find checked state from the inline children
    let checked = false;
    for (let j = i + 1; j < tokens.length; j++) {
      if (tokens[j].type === "list_item_close") {
        tokens[j].type = "task_list_item_close";
        break;
      }
      if (tokens[j].type === "inline" && tokens[j].children) {
        const children = tokens[j].children!;
        for (let k = children.length - 1; k >= 0; k--) {
          const child = children[k];
          if (
            child.type === "html_inline" &&
            child.content.includes("checkbox")
          ) {
            checked = child.content.includes("checked");
            children.splice(k, 1);
            // Also trim the leading space from the next text token
            if (k < children.length && children[k].type === "text") {
              children[k].content = children[k].content.replace(/^ /, "");
            }
            break;
          }
        }
      }
    }

    // Store checked on the token so getAttrs can read it
    tok.attrSet("data-checked", checked ? "true" : "false");
  }
});

// ---------------------------------------------------------------------------
// Custom core rule: detect GFM callout syntax inside blockquotes.
//
// Supports both forms:
// 1) Marker-only first line:
//    > [!NOTE]
//    > body...
// 2) Marker + body in the same line:
//    > [!NOTE] body...
//
// Also accepts escaped brackets from markdown source mode:
//    > \[!NOTE\] body...
// ---------------------------------------------------------------------------

const CALLOUT_PREFIX_RE =
  /^\s*\\?\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\\?\](?:\s+|$)/i;

function stripCalloutPrefix(text: string): {
  calloutType: string;
  rest: string;
} | null {
  const match = CALLOUT_PREFIX_RE.exec(text);
  if (!match) {
    return null;
  }

  return {
    calloutType: match[1].toLowerCase(),
    rest: text.slice(match[0].length),
  };
}

md.core.ruler.push("refinex_callout_blocks", (state) => {
  const tokens = state.tokens;
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (
      tok.type === "blockquote_open" &&
      i + 3 < tokens.length &&
      tokens[i + 1].type === "paragraph_open" &&
      tokens[i + 1].level === tok.level + 1 &&
      tokens[i + 2].type === "inline" &&
      tokens[i + 3].type === "paragraph_close"
    ) {
      const inlineToken = tokens[i + 2];
      const parsed = stripCalloutPrefix(inlineToken.content);
      if (!parsed) {
        i++;
        continue;
      }

      tok.attrSet("data-callout", parsed.calloutType);

      // Case A: marker-only line -> remove the entire first paragraph tokens.
      if (parsed.rest.trim().length === 0) {
        tokens.splice(i + 1, 3);
        i++;
        continue;
      }

      // Case B: marker + body in same line -> strip marker prefix and keep body.
      inlineToken.content = parsed.rest;
      if (inlineToken.children && inlineToken.children.length > 0) {
        const firstChild = inlineToken.children[0];
        if (firstChild.type === "text") {
          firstChild.content = parsed.rest;
        }
      }
    }
    i++;
  }
});

// ---------------------------------------------------------------------------
// MarkdownParser token specification
// ---------------------------------------------------------------------------

export const refinexParser = new MarkdownParser(refinexSchema, md, {
  blockquote: {
    block: "blockquote",
    getAttrs: (tok) => ({
      calloutType: tok.attrGet("data-callout") ?? null,
    }),
  },
  paragraph: { block: "paragraph" },
  list_item: { block: "list_item" },
  bullet_list: { block: "bullet_list" },
  ordered_list: {
    block: "ordered_list",
    getAttrs: (tok) => ({ start: Number(tok.attrGet("start") ?? 1) }),
  },
  heading: {
    block: "heading",
    getAttrs: (tok) => ({ level: Number(tok.tag.slice(1)) }),
  },
  code_block: { block: "code_block", noCloseToken: true },
  fence: {
    block: "code_block",
    getAttrs: (tok) => ({ language: tok.info?.trim() ?? "" }),
    noCloseToken: true,
  },
  hr: { node: "horizontal_rule" },
  image: {
    node: "image",
    getAttrs: (tok) => ({
      src: tok.attrGet("src"),
      alt: tok.children?.[0]?.content ?? null,
      title: tok.attrGet("title"),
    }),
  },
  hardbreak: { node: "hard_break" },

  em: { mark: "em" },
  strong: { mark: "strong" },
  link: {
    mark: "link",
    getAttrs: (tok) => ({
      href: tok.attrGet("href"),
      title: tok.attrGet("title"),
    }),
  },
  code_inline: { mark: "code", noCloseToken: true },
  s: { mark: "strikethrough" },

  // Task list items (tokens renamed by the core rule above)
  task_list_item: {
    block: "task_list_item",
    getAttrs: (tok) => ({
      checked: tok.attrGet("data-checked") === "true",
    }),
  },

  // GFM table tokens
  table: { block: "table" },
  thead: { ignore: true },
  tbody: { ignore: true },
  tr: { block: "table_row" },
  th: {
    block: "table_header",
    getAttrs: (tok) => ({ align: extractAlign(tok) }),
  },
  td: {
    block: "table_cell",
    getAttrs: (tok) => ({ align: extractAlign(tok) }),
  },
});

// ---------------------------------------------------------------------------
// Convenience function
// ---------------------------------------------------------------------------

export function parseMarkdown(content: string): ProseMirrorNode {
  const doc = refinexParser.parse(content);
  if (!doc) {
    return refinexSchema.node("doc", null, [
      refinexSchema.node("paragraph", null),
    ]);
  }
  return doc;
}

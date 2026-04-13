import { Schema, type MarkSpec, type NodeSpec } from "prosemirror-model";
import { schema as markdownSchema } from "prosemirror-markdown";

const headingParseDOM = [1, 2, 3, 4, 5, 6].map((level) => ({
  tag: `h${level}`,
  attrs: { level },
}));

const getCodeBlockLanguage = (dom: HTMLElement) => {
  const directLanguage = dom.getAttribute("data-language");
  if (directLanguage) {
    return directLanguage;
  }

  const codeElement = dom.querySelector("code");
  const codeClassName = codeElement?.getAttribute("class") ?? "";
  const languageMatch = codeClassName.match(/language-([A-Za-z0-9_-]+)/);

  return languageMatch?.[1] ?? "";
};

const getTaskItemChecked = (dom: HTMLElement) => {
  if (dom.getAttribute("data-checked") === "true") {
    return true;
  }

  const checkbox = dom.querySelector(
    'input[type="checkbox"]',
  ) as HTMLInputElement | null;
  return checkbox?.checked ?? false;
};

const docSpec: NodeSpec = {
  content: "block+",
  parseDOM: [{ tag: "div[data-refinex-doc]" }],
  toDOM() {
    return ["div", { "data-refinex-doc": "true" }, 0];
  },
};

const paragraphSpec: NodeSpec = {
  content: "inline*",
  group: "block",
  parseDOM: [{ tag: "p" }],
  toDOM() {
    return ["p", 0];
  },
};

const headingSpec: NodeSpec = {
  attrs: { level: { default: 1 } },
  content: "inline*",
  group: "block",
  defining: true,
  parseDOM: headingParseDOM,
  toDOM(node) {
    return [`h${node.attrs.level}`, 0];
  },
};

const blockquoteSpec: NodeSpec = {
  content: "block+",
  group: "block",
  parseDOM: [{ tag: "blockquote" }],
  toDOM() {
    return ["blockquote", 0];
  },
};

const codeBlockSpec: NodeSpec = {
  attrs: { language: { default: "" } },
  content: "text*",
  group: "block",
  code: true,
  defining: true,
  marks: "",
  parseDOM: [
    {
      tag: "pre",
      preserveWhitespace: "full",
      getAttrs: (dom) => ({
        language: getCodeBlockLanguage(dom as HTMLElement),
      }),
    },
  ],
  toDOM(node) {
    const language = node.attrs.language as string;
    const codeAttributes = language ? { class: `language-${language}` } : {};
    const preAttributes = language ? { "data-language": language } : {};

    return ["pre", preAttributes, ["code", codeAttributes, 0]];
  },
};

const horizontalRuleSpec: NodeSpec = {
  group: "block",
  parseDOM: [{ tag: "hr" }],
  toDOM() {
    return ["hr"];
  },
};

const orderedListSpec: NodeSpec = {
  content: "list_item+",
  group: "block",
  attrs: { start: { default: 1 } },
  parseDOM: [
    {
      tag: "ol",
      getAttrs: (dom) => ({
        start: (dom as HTMLElement).hasAttribute("start")
          ? Number((dom as HTMLElement).getAttribute("start"))
          : 1,
      }),
    },
  ],
  toDOM(node) {
    return [
      "ol",
      {
        start: node.attrs.start === 1 ? null : node.attrs.start,
      },
      0,
    ];
  },
};

const bulletListSpec: NodeSpec = {
  content: "(list_item | task_list_item)+",
  group: "block",
  parseDOM: [{ tag: "ul" }],
  toDOM() {
    return ["ul", 0];
  },
};

const listItemSpec: NodeSpec = {
  content: "paragraph block*",
  defining: true,
  parseDOM: [{ tag: "li:not([data-task-item])" }],
  toDOM() {
    return ["li", 0];
  },
};

const taskListItemSpec: NodeSpec = {
  attrs: { checked: { default: false } },
  content: "paragraph block*",
  defining: true,
  parseDOM: [
    {
      tag: "li[data-task-item]",
      getAttrs: (dom) => ({
        checked: getTaskItemChecked(dom as HTMLElement),
      }),
    },
  ],
  toDOM(node) {
    return [
      "li",
      {
        "data-task-item": "true",
        "data-checked": node.attrs.checked ? "true" : "false",
      },
      0,
    ];
  },
};

const imageSpec: NodeSpec = {
  attrs: {
    src: {},
    alt: { default: null },
    title: { default: null },
  },
  inline: true,
  group: "inline",
  atom: true,
  draggable: true,
  parseDOM: [
    {
      tag: "img[src]",
      getAttrs: (dom) => ({
        src: (dom as HTMLElement).getAttribute("src"),
        alt: (dom as HTMLElement).getAttribute("alt"),
        title: (dom as HTMLElement).getAttribute("title"),
      }),
    },
  ],
  toDOM(node) {
    return ["img", node.attrs];
  },
};

const hardBreakSpec: NodeSpec = {
  inline: true,
  group: "inline",
  selectable: false,
  parseDOM: [{ tag: "br" }],
  toDOM() {
    return ["br"];
  },
};

const strongSpec: MarkSpec = {
  parseDOM: [
    { tag: "strong" },
    {
      tag: "b",
      getAttrs: (node) =>
        (node as HTMLElement).style.fontWeight !== "normal" ? null : false,
    },
    {
      style: "font-weight=400",
      clearMark: (mark) => mark.type.name === "strong",
    },
    {
      style: "font-weight",
      getAttrs: (value) =>
        /^(bold(er)?|[5-9]\d{2,})$/.test(String(value)) ? null : false,
    },
  ],
  toDOM() {
    return ["strong", 0];
  },
};

const emSpec: MarkSpec = {
  parseDOM: [
    { tag: "i" },
    { tag: "em" },
    { style: "font-style=italic" },
    {
      style: "font-style=normal",
      clearMark: (mark) => mark.type.name === "em",
    },
  ],
  toDOM() {
    return ["em", 0];
  },
};

const codeSpec: MarkSpec = {
  code: true,
  parseDOM: [{ tag: "code" }],
  toDOM() {
    return ["code", 0];
  },
};

const linkSpec: MarkSpec = {
  attrs: {
    href: {},
    title: { default: null },
  },
  inclusive: false,
  parseDOM: [
    {
      tag: "a[href]",
      getAttrs: (dom) => ({
        href: (dom as HTMLElement).getAttribute("href"),
        title: (dom as HTMLElement).getAttribute("title"),
      }),
    },
  ],
  toDOM(mark) {
    return ["a", mark.attrs, 0];
  },
};

const strikethroughSpec: MarkSpec = {
  parseDOM: [
    { tag: "s" },
    { tag: "del" },
    { tag: "strike" },
    { style: "text-decoration=line-through" },
  ],
  toDOM() {
    return ["s", 0];
  },
};

const tableSpec: NodeSpec = {
  content: "table_row+",
  group: "block",
  tableRole: "table",
  parseDOM: [{ tag: "table" }],
  toDOM() {
    return ["table", ["tbody", 0]];
  },
};

const tableRowSpec: NodeSpec = {
  content: "(table_cell | table_header)+",
  tableRole: "row",
  parseDOM: [{ tag: "tr" }],
  toDOM() {
    return ["tr", 0];
  },
};

const tableCellSpec: NodeSpec = {
  content: "inline*",
  attrs: { align: { default: null } },
  tableRole: "cell",
  parseDOM: [
    {
      tag: "td",
      getAttrs: (dom) => ({
        align: (dom as HTMLElement).style.textAlign || null,
      }),
    },
  ],
  toDOM(node) {
    const attrs = node.attrs.align
      ? { style: `text-align:${node.attrs.align}` }
      : {};
    return ["td", attrs, 0];
  },
};

const tableHeaderSpec: NodeSpec = {
  content: "inline*",
  attrs: { align: { default: null } },
  tableRole: "header_cell",
  parseDOM: [
    {
      tag: "th",
      getAttrs: (dom) => ({
        align: (dom as HTMLElement).style.textAlign || null,
      }),
    },
  ],
  toDOM(node) {
    const attrs = node.attrs.align
      ? { style: `text-align:${node.attrs.align}` }
      : {};
    return ["th", attrs, 0];
  },
};

const nodes = markdownSchema.spec.nodes
  .update("doc", docSpec)
  .update("paragraph", paragraphSpec)
  .update("heading", headingSpec)
  .update("blockquote", blockquoteSpec)
  .update("code_block", codeBlockSpec)
  .update("horizontal_rule", horizontalRuleSpec)
  .update("ordered_list", orderedListSpec)
  .update("bullet_list", bulletListSpec)
  .addBefore("list_item", "task_list_item", taskListItemSpec)
  .update("list_item", listItemSpec)
  .update("image", imageSpec)
  .update("hard_break", hardBreakSpec)
  .addToEnd("table", tableSpec)
  .addToEnd("table_row", tableRowSpec)
  .addToEnd("table_header", tableHeaderSpec)
  .addToEnd("table_cell", tableCellSpec);

const marks = markdownSchema.spec.marks
  .update("strong", strongSpec)
  .update("em", emSpec)
  .update("code", codeSpec)
  .update("link", linkSpec)
  .addBefore("code", "strikethrough", strikethroughSpec);

export const refinexSchema = new Schema({
  nodes,
  marks,
});

export default refinexSchema;

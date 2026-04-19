import { Fragment, Slice } from "prosemirror-model";
import { Selection, type EditorState } from "prosemirror-state";
import {
  InputRule,
  inputRules,
  textblockTypeInputRule,
  wrappingInputRule,
} from "prosemirror-inputrules";
import { refinexSchema } from "../schema";

export function refinexInputRules() {
  return inputRules({
    rules: [
      ...buildHeadingRules(),
      ...buildListAndBlockRules(),
      ...buildCalloutRules(),
      ...buildTaskListRules(),
      ...buildStructuralRules(),
    ],
  });
}

function buildHeadingRules() {
  return [1, 2, 3, 4, 5, 6].map((level) =>
    textblockTypeInputRule(
      new RegExp(`^${"#".repeat(level)}\\s$`),
      refinexSchema.nodes.heading,
      { level },
    ),
  );
}

function buildListAndBlockRules() {
  return [
    wrappingInputRule(/^>\s$/, refinexSchema.nodes.blockquote),
    wrappingInputRule(/^[-*]\s$/, refinexSchema.nodes.bullet_list),
    wrappingInputRule(
      /^(\d+)\.\s$/,
      refinexSchema.nodes.ordered_list,
      (match) => ({ start: Number(match[1]) }),
      (match, node) =>
        Number(node.attrs.start ?? 1) + node.childCount === Number(match[1]),
    ),
    textblockTypeInputRule(/^```$/, refinexSchema.nodes.code_block, {
      language: "",
    }),
    textblockTypeInputRule(
      /^```([A-Za-z0-9_-]+)\s$/,
      refinexSchema.nodes.code_block,
      (match) => ({
        language: match[1] ?? "",
      }),
    ),
  ];
}

function buildCalloutRules() {
  return [
    new InputRule(
      /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]$/i,
      (state, match, start, end) => {
        const $start = state.doc.resolve(start);
        if ($start.depth < 2) return null;

        // The immediate parent of the current text block must be a blockquote
        const blockquoteNode = $start.node($start.depth - 1);
        if (blockquoteNode.type.name !== "blockquote") return null;

        // Only upgrade when this is the FIRST paragraph in the blockquote
        if ($start.index($start.depth - 1) !== 0) return null;

        const calloutType = match[1].toLowerCase();
        const blockquotePos = $start.before($start.depth - 1);

        const tr = state.tr;
        // Set calloutType on the blockquote node
        tr.setNodeMarkup(blockquotePos, undefined, {
          ...blockquoteNode.attrs,
          calloutType,
        });
        // Delete the matched text `[!NOTE` (trigger `]` is suppressed by InputRule)
        tr.delete(tr.mapping.map(start), tr.mapping.map(end));
        return tr;
      },
    ),
  ];
}

function buildTaskListRules() {
  return [
    new InputRule(/^- \[ \]\s$/, (state, _match, start) =>
      replaceParagraphWithTaskList(state, start, false),
    ),
    new InputRule(/^- \[x\]\s$/i, (state, _match, start) =>
      replaceParagraphWithTaskList(state, start, true),
    ),
  ];
}

function buildStructuralRules() {
  return [
    new InputRule(/^---$/, (state, _match, start) =>
      replaceParagraphWithHorizontalRule(state, start),
    ),
  ];
}

function replaceParagraphWithTaskList(
  state: EditorState,
  start: number,
  checked: boolean,
) {
  const $start = state.doc.resolve(start);
  const blockStart = $start.before();
  const blockEnd = $start.after();
  const parent = $start.node(-1);
  const index = $start.index(-1);
  const paragraph = refinexSchema.nodes.paragraph.create();
  const taskItem = refinexSchema.nodes.task_list_item.create({ checked }, [
    paragraph,
  ]);
  const bulletList = refinexSchema.nodes.bullet_list.create(null, [taskItem]);
  const content = Fragment.from(bulletList);

  if (!parent.canReplace(index, index + 1, content)) {
    return null;
  }

  const tr = state.tr.replaceRange(
    blockStart,
    blockEnd,
    new Slice(content, 0, 0),
  );
  const selection = findFirstTextblockSelection(tr.doc, blockStart);
  if (selection !== null) {
    tr.setSelection(Selection.near(tr.doc.resolve(selection)));
  }
  return tr;
}

function replaceParagraphWithHorizontalRule(state: EditorState, start: number) {
  const $start = state.doc.resolve(start);
  const blockStart = $start.before();
  const blockEnd = $start.after();
  const parent = $start.node(-1);
  const index = $start.index(-1);
  const hr = refinexSchema.nodes.horizontal_rule.create();
  const paragraph = refinexSchema.nodes.paragraph.create();
  const content = Fragment.fromArray([hr, paragraph]);

  if (!parent.canReplace(index, index + 1, content)) {
    return null;
  }

  const tr = state.tr.replaceRange(
    blockStart,
    blockEnd,
    new Slice(content, 0, 0),
  );
  const selection = findFirstTextblockSelection(tr.doc, blockStart);
  if (selection !== null) {
    tr.setSelection(Selection.near(tr.doc.resolve(selection)));
  }
  return tr;
}

function findFirstTextblockSelection(doc: EditorState["doc"], from: number) {
  let found: number | null = null;
  doc.nodesBetween(from, doc.content.size, (node, pos) => {
    if (!node.isTextblock) {
      return true;
    }

    found = pos + 1;
    return false;
  });
  return found;
}

import { Fragment, Slice, type Mark, type Node as ProseMirrorNode } from "prosemirror-model";
import { setBlockType, wrapIn } from "prosemirror-commands";
import { wrapInList } from "prosemirror-schema-list";
import {
  type Command,
  Selection,
  TextSelection,
  type EditorState,
  type Transaction,
} from "prosemirror-state";
import { dropPoint } from "prosemirror-transform";
import type { EditorView } from "prosemirror-view";

import { refinexSchema } from "./schema";

export type PopoverAnchorRect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
};

export type LinkEditorRequest = {
  from: number;
  to: number;
  href: string;
  title: string;
};

export type SlashTriggerMatch = {
  from: number;
  to: number;
};

export type SlashCommandId =
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "bullet-list"
  | "ordered-list"
  | "task-list"
  | "blockquote"
  | "code-block"
  | "divider"
  | "image"
  | "table";

export type SlashCommandSpec = {
  id: SlashCommandId;
  title: string;
  description: string;
  keywords: string[];
};

export type ImageNodeAttrs = {
  src: string;
  alt: string | null;
  title: string | null;
  align?: "left" | "center" | "right";
};

export const SLASH_COMMANDS: readonly SlashCommandSpec[] = [
  {
    id: "heading-1",
    title: "Heading 1",
    description: "将当前块转换为一级标题。",
    keywords: ["h1", "title", "heading", "标题 1"],
  },
  {
    id: "heading-2",
    title: "Heading 2",
    description: "将当前块转换为二级标题。",
    keywords: ["h2", "subtitle", "heading", "标题 2"],
  },
  {
    id: "heading-3",
    title: "Heading 3",
    description: "将当前块转换为三级标题。",
    keywords: ["h3", "heading", "标题 3"],
  },
  {
    id: "bullet-list",
    title: "Bullet List",
    description: "创建无序列表。",
    keywords: ["ul", "list", "bullet", "列表"],
  },
  {
    id: "ordered-list",
    title: "Numbered List",
    description: "创建有序列表。",
    keywords: ["ol", "list", "ordered", "numbered", "编号列表"],
  },
  {
    id: "task-list",
    title: "Task List",
    description: "插入待办事项列表。",
    keywords: ["todo", "task", "checkbox", "任务列表"],
  },
  {
    id: "blockquote",
    title: "Blockquote",
    description: "插入引用块。",
    keywords: ["quote", "blockquote", "引用"],
  },
  {
    id: "code-block",
    title: "Code Block",
    description: "插入代码块。",
    keywords: ["code", "snippet", "代码块"],
  },
  {
    id: "divider",
    title: "Divider",
    description: "插入分割线。",
    keywords: ["hr", "divider", "line", "分割线"],
  },
  {
    id: "image",
    title: "Image",
    description: "从本地文件插入图片。",
    keywords: ["image", "photo", "picture", "图片"],
  },
  {
    id: "table",
    title: "Table",
    description: "插入默认 3x3 表格。",
    keywords: ["table", "grid", "表格"],
  },
] as const;

export function getSelectionAnchorRect(
  view: EditorView,
  from: number,
  to: number,
): PopoverAnchorRect {
  const start = view.coordsAtPos(from);
  const end = view.coordsAtPos(to);
  const top = Math.min(start.top, end.top);
  const bottom = Math.max(start.bottom, end.bottom);
  const leftEdge = Math.min(start.left, end.left);
  const rightEdge = Math.max(start.right, end.right);
  const center = leftEdge + (rightEdge - leftEdge) / 2;

  return {
    top,
    bottom,
    left: center,
    right: center,
    width: Math.max(1, rightEdge - leftEdge),
    height: Math.max(1, bottom - top),
  };
}

export function isMarkActive(state: EditorState, markName: "strong" | "em" | "strikethrough" | "code" | "link") {
  const markType = refinexSchema.marks[markName];
  const { selection } = state;

  if (selection.empty) {
    return selection.$from.marks().some((mark) => mark.type === markType);
  }

  return state.doc.rangeHasMark(selection.from, selection.to, markType);
}

export function getLinkEditorRequest(state: EditorState): LinkEditorRequest | null {
  const { selection } = state;
  if (!selection.empty) {
    const activeMark: Mark | null = findFirstMarkInRange(
      state,
      selection.from,
      selection.to,
    );
    const activeAttrs = activeMark
      ? ((activeMark as Mark).attrs as {
          href?: string;
          title?: string | null;
        })
      : null;
    return {
      from: selection.from,
      to: selection.to,
      href: activeAttrs?.href ?? "",
      title: activeAttrs?.title ?? "",
    };
  }

  const range = findActiveLinkRange(state);
  if (!range) {
    return null;
  }

  return {
    from: range.from,
    to: range.to,
    href: (range.mark.attrs.href as string | undefined) ?? "",
    title: (range.mark.attrs.title as string | undefined) ?? "",
  };
}

export function applyLinkMark(
  state: EditorState,
  dispatch: ((transaction: Transaction) => void) | undefined,
  request: LinkEditorRequest,
): boolean {
  if (request.from === request.to) {
    return false;
  }

  const linkMark = refinexSchema.marks.link;
  const href = request.href.trim();
  const title = request.title.trim();
  const transaction = state.tr.removeMark(request.from, request.to, linkMark);

  if (href.length > 0) {
    transaction.addMark(
      request.from,
      request.to,
      linkMark.create({
        href,
        title: title.length > 0 ? title : null,
      }),
    );
  }

  if (dispatch) {
    dispatch(transaction.scrollIntoView());
  }

  return true;
}

export function findSlashTrigger(state: EditorState): SlashTriggerMatch | null {
  const { selection } = state;
  if (!selection.empty) {
    return null;
  }

  const { $from } = selection;
  if ($from.parent.type !== refinexSchema.nodes.paragraph) {
    return null;
  }

  if ($from.parent.textContent !== "/" || $from.parentOffset !== 1) {
    return null;
  }

  return {
    from: selection.from - 1,
    to: selection.to,
  };
}

export function createImageParagraphNode(attrs: ImageNodeAttrs) {
  return refinexSchema.nodes.paragraph.create(null, [
    refinexSchema.nodes.image.create({
      src: attrs.src,
      alt: attrs.alt,
      title: attrs.title,
      align: attrs.align ?? "center",
    }),
  ]);
}

export function createTaskListNode() {
  return refinexSchema.nodes.bullet_list.create(null, [
    refinexSchema.nodes.task_list_item.create({ checked: false }, [
      refinexSchema.nodes.paragraph.create(),
    ]),
  ]);
}

export function createDefaultTableNode() {
  const headerCells = Array.from({ length: 3 }, (_, index) =>
    refinexSchema.nodes.table_header.create(null, [
      refinexSchema.text(`Column ${index + 1}`),
    ]),
  );
  const bodyRows = Array.from({ length: 2 }, () =>
    refinexSchema.nodes.table_row.create(
      null,
      Array.from({ length: 3 }, () => refinexSchema.nodes.table_cell.create()),
    ),
  );

  return refinexSchema.nodes.table.create(null, [
    refinexSchema.nodes.table_row.create(null, headerCells),
    ...bodyRows,
  ]);
}

export function createLinkPopoverCommand(options?: {
  onOpen?: (view: EditorView, request: LinkEditorRequest) => void;
}): Command {
  return (
    state: EditorState,
    dispatch,
    view?: EditorView,
  ) => {
    const request = getLinkEditorRequest(state);
    if (!request) {
      return false;
    }

    if (view && options?.onOpen) {
      options.onOpen(view, request);
      return true;
    }

    const promptFn = globalThis.prompt;
    if (typeof promptFn !== "function") {
      return false;
    }

    const href = promptFn("输入链接地址", request.href);
    if (href === null) {
      return true;
    }

    const title = promptFn("输入链接标题（可选）", request.title);
    if (title === null) {
      return true;
    }

    return applyLinkMark(state, dispatch, {
      ...request,
      href,
      title,
    });
  };
}

export async function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.position = "fixed";
    input.style.left = "-9999px";

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) {
        return;
      }
      settled = true;
      input.remove();
      window.removeEventListener("focus", handleWindowFocus, true);
      resolve(file);
    };

    const handleWindowFocus = () => {
      window.setTimeout(() => finish(input.files?.[0] ?? null), 250);
    };

    input.addEventListener(
      "change",
      () => {
        finish(input.files?.[0] ?? null);
      },
      { once: true },
    );

    window.addEventListener("focus", handleWindowFocus, true);
    document.body.append(input);
    input.click();
  });
}

export function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

export async function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("读取图片失败"));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("图片读取结果无效"));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function handleImageFileDrop(view: EditorView, event: DragEvent) {
  const files = Array.from(event.dataTransfer?.files ?? []).filter(isImageFile);
  if (files.length === 0) {
    return false;
  }

  event.preventDefault();

  const dropCoordinates = view.posAtCoords({
    left: event.clientX,
    top: event.clientY,
  });
  const basePosition = dropCoordinates?.pos ?? view.state.selection.from;

  void Promise.all(
    files.map(async (file) => ({
      src: await readImageFileAsDataUrl(file),
      alt: fileNameToAlt(file.name),
      title: null,
      align: "center" as const,
    })),
  )
    .then((attrsList) => {
      insertImageParagraphsAt(view, attrsList, basePosition);
    })
    .catch((error) => {
      console.error("插入拖拽图片失败", error);
    });

  return true;
}

export async function executeSlashCommand(options: {
  view: EditorView;
  trigger: SlashTriggerMatch;
  commandId: SlashCommandId;
}): Promise<boolean> {
  const { view, trigger, commandId } = options;

  switch (commandId) {
    case "heading-1":
      removeSlashTrigger(view, trigger);
      return runEditorCommand(
        view,
        setBlockType(refinexSchema.nodes.heading, { level: 1 }),
      );
    case "heading-2":
      removeSlashTrigger(view, trigger);
      return runEditorCommand(
        view,
        setBlockType(refinexSchema.nodes.heading, { level: 2 }),
      );
    case "heading-3":
      removeSlashTrigger(view, trigger);
      return runEditorCommand(
        view,
        setBlockType(refinexSchema.nodes.heading, { level: 3 }),
      );
    case "bullet-list":
      removeSlashTrigger(view, trigger);
      return runEditorCommand(view, wrapInList(refinexSchema.nodes.bullet_list));
    case "ordered-list":
      removeSlashTrigger(view, trigger);
      return runEditorCommand(view, wrapInList(refinexSchema.nodes.ordered_list));
    case "blockquote":
      removeSlashTrigger(view, trigger);
      return runEditorCommand(view, wrapIn(refinexSchema.nodes.blockquote));
    case "code-block":
      removeSlashTrigger(view, trigger);
      return runEditorCommand(view, setBlockType(refinexSchema.nodes.code_block));
    case "task-list":
      removeSlashTrigger(view, trigger);
      view.dispatch(
        replaceCurrentBlockWithNodes(view.state, [createTaskListNode()]),
      );
      return true;
    case "divider":
      removeSlashTrigger(view, trigger);
      view.dispatch(
        replaceCurrentBlockWithNodes(view.state, [
          refinexSchema.nodes.horizontal_rule.create(),
          refinexSchema.nodes.paragraph.create(),
        ]),
      );
      return true;
    case "table":
      removeSlashTrigger(view, trigger);
      view.dispatch(replaceCurrentBlockWithNodes(view.state, [createDefaultTableNode()]));
      return true;
    case "image": {
      const file = await pickImageFile();
      if (!file) {
        return false;
      }

      try {
        const src = await readImageFileAsDataUrl(file);
        removeSlashTrigger(view, trigger);
        view.dispatch(
          replaceCurrentBlockWithNodes(view.state, [
            createImageParagraphNode({
              src,
              alt: fileNameToAlt(file.name),
              title: null,
              align: "center",
            }),
            refinexSchema.nodes.paragraph.create(),
          ]),
        );
        return true;
      } catch (error) {
        console.error("通过 Slash 插入图片失败", error);
        return false;
      }
    }
    default:
      return false;
  }
}

function insertImageParagraphsAt(
  view: EditorView,
  attrsList: ImageNodeAttrs[],
  position: number,
) {
  const fragment = Fragment.fromArray(
    attrsList.map((attrs) => createImageParagraphNode(attrs)),
  );
  const slice = new Slice(fragment, 0, 0);
  const insertionPos = dropPoint(view.state.doc, position, slice) ?? position;
  const transaction = view.state.tr.insert(insertionPos, fragment);
  const selection =
    Selection.findFrom(
      transaction.doc.resolve(
        Math.min(insertionPos + fragment.size, transaction.doc.content.size),
      ),
      1,
      true,
    ) ?? Selection.near(transaction.doc.resolve(insertionPos), 1);

  view.dispatch(transaction.setSelection(selection).scrollIntoView());
}

function replaceCurrentBlockWithNodes(
  state: EditorState,
  nodes: ProseMirrorNode[],
) {
  const { from, to } = getCurrentBlockRange(state);
  const transaction = state.tr.replaceWith(from, to, Fragment.fromArray(nodes));
  const selection =
    Selection.findFrom(transaction.doc.resolve(from), 1, true) ??
    TextSelection.near(transaction.doc.resolve(Math.min(from, transaction.doc.content.size)), 1);

  return transaction.setSelection(selection).scrollIntoView();
}

function getCurrentBlockRange(state: EditorState) {
  const { $from } = state.selection;
  const depth = $from.depth;
  return {
    from: $from.before(depth),
    to: $from.after(depth),
  };
}

function removeSlashTrigger(view: EditorView, trigger: SlashTriggerMatch) {
  view.dispatch(view.state.tr.delete(trigger.from, trigger.to));
}

function runEditorCommand(view: EditorView, command: Command) {
  return command(
    view.state,
    (transaction: Transaction) => view.dispatch(transaction),
    view,
  );
}

function findFirstMarkInRange(state: EditorState, from: number, to: number) {
  let activeMark: Mark | null = null;
  state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText) {
      return true;
    }

    const nextMark = node.marks.find((mark) => mark.type === refinexSchema.marks.link);
    if (nextMark) {
      activeMark = nextMark;
      return false;
    }

    return true;
  });

  return activeMark;
}

function findActiveLinkRange(state: EditorState) {
  const linkMark = refinexSchema.marks.link;
  const { $from } = state.selection;
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

function fileNameToAlt(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || null;
}

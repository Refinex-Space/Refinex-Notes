import { EditorState, TextSelection, type Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { describe, expect, it, vi } from "vitest";

import { parseMarkdown } from "../parser";
import {
  applyLinkMark,
  createDefaultTableNode,
  createImageParagraphNode,
  createTaskListNode,
  executeSlashCommand,
  findSlashTrigger,
  getLinkEditorRequest,
  isImageFile,
} from "../rich-ui";
import { refinexSchema } from "../schema";

function setSelection(state: EditorState, from: number, to = from) {
  return state.applyTransaction(
    state.tr.setSelection(TextSelection.create(state.doc, from, to)),
  ).state;
}

function createMockView(state: EditorState) {
  let nextState = state;
  const view = {
    state: nextState,
    dispatch(transaction: Transaction) {
      nextState = nextState.applyTransaction(transaction).state;
      view.state = nextState;
    },
    focus: vi.fn(),
  } as unknown as EditorView;

  return view;
}

describe("rich UI helpers", () => {
  it("builds a link editor request for selections and existing links", () => {
    const selectedState = setSelection(
      EditorState.create({ doc: parseMarkdown("link") }),
      1,
      5,
    );
    expect(getLinkEditorRequest(selectedState)).toEqual({
      from: 1,
      to: 5,
      href: "",
      title: "",
    });

    const linkedState = setSelection(
      EditorState.create({ doc: parseMarkdown('[site](https://example.com "Docs")') }),
      2,
    );
    expect(getLinkEditorRequest(linkedState)).toEqual({
      from: 1,
      to: 5,
      href: "https://example.com",
      title: "Docs",
    });
  });

  it("applies and removes link marks", () => {
    const state = setSelection(
      EditorState.create({ doc: parseMarkdown("hello") }),
      1,
      6,
    );
    let nextState = state;

    const added = applyLinkMark(
      state,
      (transaction) => {
        nextState = nextState.applyTransaction(transaction).state;
      },
      {
        from: 1,
        to: 6,
        href: "https://example.com",
        title: "Docs",
      },
    );

    expect(added).toBe(true);
    const addedMark = nextState.doc.firstChild?.firstChild?.marks.find(
      (mark) => mark.type === refinexSchema.marks.link,
    );
    expect(addedMark?.attrs.href).toBe("https://example.com");
    expect(addedMark?.attrs.title).toBe("Docs");

    const removed = applyLinkMark(
      nextState,
      (transaction) => {
        nextState = nextState.applyTransaction(transaction).state;
      },
      {
        from: 1,
        to: 6,
        href: "",
        title: "",
      },
    );
    expect(removed).toBe(true);
    expect(
      nextState.doc.firstChild?.firstChild?.marks.some(
        (mark) => mark.type === refinexSchema.marks.link,
      ) ?? false,
    ).toBe(false);
  });

  it("detects slash triggers only for a bare slash paragraph", () => {
    const openState = setSelection(
      EditorState.create({ doc: parseMarkdown("/") }),
      2,
    );
    expect(findSlashTrigger(openState)).toEqual({ from: 1, to: 2 });

    const closedState = setSelection(
      EditorState.create({ doc: parseMarkdown("/todo") }),
      6,
    );
    expect(findSlashTrigger(closedState)).toBeNull();
  });

  it("creates task list, table, and image paragraph structures", () => {
    const taskList = createTaskListNode();
    expect(taskList.type.name).toBe("bullet_list");
    expect(taskList.firstChild?.type.name).toBe("task_list_item");

    const table = createDefaultTableNode();
    expect(table.type.name).toBe("table");
    expect(table.childCount).toBe(3);
    expect(table.firstChild?.firstChild?.textContent).toBe("Column 1");

    const imageParagraph = createImageParagraphNode({
      src: "data:image/png;base64,abc",
      alt: "demo",
      title: "caption",
      align: "right",
    });
    expect(imageParagraph.type.name).toBe("paragraph");
    expect(imageParagraph.firstChild?.type.name).toBe("image");
    expect(imageParagraph.firstChild?.attrs.align).toBe("right");
  });

  it("executes slash commands for headings and divider", async () => {
    const headingView = createMockView(
      setSelection(EditorState.create({ doc: parseMarkdown("/") }), 2),
    );

    const headingResult = await executeSlashCommand({
      view: headingView,
      trigger: { from: 1, to: 2 },
      commandId: "heading-2",
    });
    expect(headingResult).toBe(true);
    expect(headingView.state.doc.firstChild?.type.name).toBe("heading");
    expect(headingView.state.doc.firstChild?.attrs.level).toBe(2);

    const dividerView = createMockView(
      setSelection(EditorState.create({ doc: parseMarkdown("/") }), 2),
    );
    const dividerResult = await executeSlashCommand({
      view: dividerView,
      trigger: { from: 1, to: 2 },
      commandId: "divider",
    });
    expect(dividerResult).toBe(true);
    expect(dividerView.state.doc.firstChild?.type.name).toBe("horizontal_rule");
    expect(dividerView.state.doc.lastChild?.type.name).toBe("paragraph");
  });

  it("recognizes browser image files", () => {
    const imageFile = new File(["demo"], "demo.png", { type: "image/png" });
    const textFile = new File(["demo"], "demo.txt", { type: "text/plain" });
    expect(isImageFile(imageFile)).toBe(true);
    expect(isImageFile(textFile)).toBe(false);
  });
});

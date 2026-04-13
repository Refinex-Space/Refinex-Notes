import { history } from "prosemirror-history";
import { EditorState, TextSelection } from "prosemirror-state";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseMarkdown } from "../parser";
import { refinexInputRules } from "../plugins/input-rules";
import {
  createRefinexKeyBindings,
  refinexKeymap,
} from "../plugins/keymap";
import { refinexSchema } from "../schema";
import { serializeMarkdown } from "../serializer";

function createInputRuleState(markdown = "") {
  const plugin = refinexInputRules();
  const state = EditorState.create({
    doc: parseMarkdown(markdown),
    plugins: [plugin],
  });

  return { plugin, state };
}

function applyTextInput(markdown: string, text: string, from = 1, to = from) {
  const { plugin, state } = createInputRuleState(markdown);
  let nextState = state;

  const view = {
    state,
    composing: false,
    dispatch(transaction) {
      nextState = nextState.applyTransaction(transaction).state;
      this.state = nextState;
    },
  } as unknown as EditorView;

  const handled = plugin.props.handleTextInput?.(view, from, to, text) ?? false;
  return { handled, state: nextState };
}

function createKeymapState(markdown = "", state?: EditorState) {
  const bindings = createRefinexKeyBindings();
  return {
    bindings,
    state:
      state ??
      EditorState.create({
        doc: parseMarkdown(markdown),
        plugins: [history(), refinexKeymap()],
      }),
  };
}

function setSelection(state: EditorState, from: number, to = from) {
  return state.applyTransaction(
    state.tr.setSelection(TextSelection.create(state.doc, from, to)),
  ).state;
}

function applyBinding(
  bindings: ReturnType<typeof createRefinexKeyBindings>,
  key: string,
  state: EditorState,
) {
  let nextState = state;
  const command = bindings[key];
  if (!command) {
    throw new Error(`Missing key binding for "${key}"`);
  }

  const handled = command(state, (transaction) => {
    nextState = nextState.applyTransaction(transaction).state;
  });

  return { handled, state: nextState };
}

function findTextRange(doc: EditorState["doc"], search: string) {
  let found: { from: number; to: number } | null = null;
  doc.descendants((node, pos) => {
    if (!node.isText) {
      return true;
    }

    const index = (node.text ?? "").indexOf(search);
    if (index === -1) {
      return true;
    }

    found = { from: pos + index, to: pos + index + search.length };
    return false;
  });

  if (!found) {
    throw new Error(`Could not find text range for "${search}"`);
  }

  return found;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("refinexInputRules", () => {
  it("turns ## into an h2 heading", () => {
    const result = applyTextInput("", "## ");

    expect(result.handled).toBe(true);
    expect(result.state.doc.firstChild?.type.name).toBe("heading");
    expect(result.state.doc.firstChild?.attrs.level).toBe(2);
  });

  it("wraps > into a blockquote", () => {
    const result = applyTextInput("", "> ");

    expect(result.handled).toBe(true);
    expect(result.state.doc.firstChild?.type.name).toBe("blockquote");
    expect(result.state.doc.firstChild?.firstChild?.type.name).toBe("paragraph");
  });

  it("wraps - into a bullet list", () => {
    const result = applyTextInput("", "- ");

    expect(result.handled).toBe(true);
    expect(result.state.doc.firstChild?.type.name).toBe("bullet_list");
    expect(result.state.doc.firstChild?.firstChild?.type.name).toBe("list_item");
  });

  it("wraps numbered input into an ordered list with the correct start", () => {
    const result = applyTextInput("", "3. ");

    expect(result.handled).toBe(true);
    expect(result.state.doc.firstChild?.type.name).toBe("ordered_list");
    expect(result.state.doc.firstChild?.attrs.start).toBe(3);
  });

  it("turns bare triple backticks into a code block", () => {
    const result = applyTextInput("", "```");

    expect(result.handled).toBe(true);
    expect(result.state.doc.firstChild?.type.name).toBe("code_block");
    expect(result.state.doc.firstChild?.attrs.language).toBe("");
  });

  it("replaces --- with a horizontal rule and trailing paragraph", () => {
    const result = applyTextInput("", "---");

    expect(result.handled).toBe(true);
    expect(result.state.doc.childCount).toBe(2);
    expect(result.state.doc.firstChild?.type.name).toBe("horizontal_rule");
    expect(result.state.doc.lastChild?.type.name).toBe("paragraph");
  });

  it("creates unchecked and checked task list items", () => {
    const unchecked = applyTextInput("", "- [ ] ");
    const checked = applyTextInput("", "- [x] ");

    expect(unchecked.handled).toBe(true);
    expect(unchecked.state.doc.firstChild?.type.name).toBe("bullet_list");
    expect(unchecked.state.doc.firstChild?.firstChild?.type.name).toBe(
      "task_list_item",
    );
    expect(unchecked.state.doc.firstChild?.firstChild?.attrs.checked).toBe(false);

    expect(checked.handled).toBe(true);
    expect(checked.state.doc.firstChild?.firstChild?.attrs.checked).toBe(true);
  });
});

describe("refinexKeymap", () => {
  it("toggles strong, emphasis, code, and strikethrough marks", () => {
    const cases = [
      { key: "Mod-b", mark: "strong" },
      { key: "Mod-i", mark: "em" },
      { key: "Mod-`", mark: "code" },
      { key: "Mod-Shift-x", mark: "strikethrough" },
    ];

    for (const testCase of cases) {
      const { bindings, state } = createKeymapState("text");
      const range = findTextRange(state.doc, "text");
      const selected = setSelection(state, range.from, range.to);
      expect(bindings[testCase.key]).toBeTypeOf("function");
      const result = applyBinding(bindings, testCase.key, selected);

      expect(result.handled).toBe(true);
      const textNode = result.state.doc.firstChild?.firstChild;
      expect(textNode?.marks.some((mark) => mark.type.name === testCase.mark)).toBe(
        true,
      );
    }
  });

  it("uses Mod-k to add a link mark from prompt input", () => {
    vi.stubGlobal("prompt", vi.fn(() => "https://example.com"));

    const { bindings, state } = createKeymapState("link");
    const range = findTextRange(state.doc, "link");
    const selected = setSelection(state, range.from, range.to);
    const result = applyBinding(bindings, "Mod-k", selected);

    expect(result.handled).toBe(true);
    const linkMark = result.state.doc.firstChild?.firstChild?.marks.find(
      (mark) => mark.type.name === "link",
    );
    expect(linkMark?.attrs.href).toBe("https://example.com");
  });

  it("uses heading shortcuts to set and reset block type", () => {
    const { bindings, state } = createKeymapState("Title");
    const cursor = setSelection(state, findTextRange(state.doc, "Title").from);
    const h2 = applyBinding(bindings, "Mod-Shift-2", cursor);

    expect(h2.handled).toBe(true);
    expect(h2.state.doc.firstChild?.type.name).toBe("heading");
    expect(h2.state.doc.firstChild?.attrs.level).toBe(2);

    const paragraph = applyBinding(bindings, "Mod-Shift-0", h2.state);

    expect(paragraph.handled).toBe(true);
    expect(paragraph.state.doc.firstChild?.type.name).toBe("paragraph");
  });

  it("indents and outdents list items with Tab and Shift-Tab", () => {
    const { bindings, state } = createKeymapState("- one\n- two");
    const range = findTextRange(state.doc, "two");
    const selected = setSelection(state, range.from);
    const indented = applyBinding(bindings, "Tab", selected);

    expect(indented.handled).toBe(true);
    expect(serializeMarkdown(indented.state.doc)).toContain("  - two");

    const outdented = applyBinding(bindings, "Shift-Tab", indented.state);

    expect(outdented.handled).toBe(true);
    expect(serializeMarkdown(outdented.state.doc)).not.toContain("  - two");
  });

  it("splits a non-empty list item on Enter", () => {
    const { bindings, state } = createKeymapState("- item");
    const range = findTextRange(state.doc, "item");
    const selected = setSelection(state, range.to);
    const result = applyBinding(bindings, "Enter", selected);

    expect(result.handled).toBe(true);
    expect(result.state.doc.firstChild?.type.name).toBe("bullet_list");
    expect(result.state.doc.firstChild?.childCount).toBe(2);
  });

  it("exits an empty list item on Enter and Backspace", () => {
    const makeEmptyListState = () =>
      EditorState.create({
        doc: refinexSchema.node("doc", null, [
          refinexSchema.node("bullet_list", null, [
            refinexSchema.node("list_item", null, [
              refinexSchema.node("paragraph", null),
            ]),
          ]),
        ]),
        plugins: [history(), refinexKeymap()],
      });

    const enterSetup = createKeymapState("", makeEmptyListState());
    const enterResult = applyBinding(
      enterSetup.bindings,
      "Enter",
      setSelection(enterSetup.state, 3),
    );

    expect(enterResult.handled).toBe(true);
    expect(enterResult.state.doc.firstChild?.type.name).toBe("paragraph");

    const backspaceSetup = createKeymapState("", makeEmptyListState());
    const backspaceResult = applyBinding(
      backspaceSetup.bindings,
      "Backspace",
      setSelection(backspaceSetup.state, 3),
    );

    expect(backspaceResult.handled).toBe(true);
    expect(backspaceResult.state.doc.firstChild?.type.name).toBe("paragraph");
  });

  it("binds undo, redo, and select-all", () => {
    const { bindings, state } = createKeymapState("text");
    const range = findTextRange(state.doc, "text");
    const selected = setSelection(state, range.from, range.to);
    const bolded = applyBinding(bindings, "Mod-b", selected);

    const undone = applyBinding(bindings, "Mod-z", bolded.state);
    expect(undone.handled).toBe(true);
    expect(
      undone.state.doc.firstChild?.firstChild?.marks.some(
        (mark) => mark.type.name === "strong",
      ) ?? false,
    ).toBe(false);

    const redone = applyBinding(bindings, "Mod-y", undone.state);
    expect(redone.handled).toBe(true);
    expect(
      redone.state.doc.firstChild?.firstChild?.marks.some(
        (mark) => mark.type.name === "strong",
      ) ?? false,
    ).toBe(true);

    const selectedAll = applyBinding(bindings, "Mod-a", redone.state);
    expect(selectedAll.handled).toBe(true);
    expect(selectedAll.state.selection.from).toBe(0);
    expect(selectedAll.state.selection.to).toBe(selectedAll.state.doc.content.size);
  });
});

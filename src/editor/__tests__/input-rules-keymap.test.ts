import { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { describe, expect, it } from "vitest";

import { parseMarkdown } from "../parser";
import { refinexInputRules } from "../plugins/input-rules";

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

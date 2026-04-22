import { history, undo } from "prosemirror-history";
import { EditorState, TextSelection, type Transaction } from "prosemirror-state";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAIStreamHandler } from "../commands/ai-insert";
import { parseMarkdown, refinexParser } from "../parser";
import { aiWriteHighlightPlugin } from "../plugins/ai-write-highlight";
import { inlineSyncPlugin } from "../plugins/inline-sync";
import { refinexSerializer } from "../serializer";
import { resetNoteStore, useNoteStore } from "../../stores/noteStore";

class TestEditorView {
  state: EditorState;
  isDestroyed = false;

  constructor(state: EditorState) {
    this.state = state;
  }

  dispatch = (transaction: Transaction) => {
    this.state = this.state.applyTransaction(transaction).state;
  };

  focus() {}
}

function createState(markdown = "") {
  return EditorState.create({
    doc: parseMarkdown(markdown),
    plugins: [
      history(),
      inlineSyncPlugin(refinexParser, refinexSerializer),
      aiWriteHighlightPlugin(),
    ],
  });
}

describe("createAIStreamHandler", () => {
  afterEach(() => {
    resetNoteStore();
    vi.useRealTimers();
  });

  it("streams replacement text into the selection and keeps undo as a single group", async () => {
    const baseState = createState("Hello world");
    const state = baseState.applyTransaction(
      baseState.tr.setSelection(TextSelection.create(baseState.doc, 7, 12)),
    ).state;
    const view = new TestEditorView(state) as unknown as Parameters<
      typeof createAIStreamHandler
    >[0];
    const handler = createAIStreamHandler(view, "replace-selection", {
      requestId: "replace-request",
    });

    handler.onToken("uni");
    handler.onToken("verse");
    handler.onComplete();
    await handler.flush();

    expect(refinexSerializer.serialize(view.state.doc)).toBe("Hello universe");

    let didUndo = false;
    undo(view.state, (transaction) => {
      didUndo = true;
      view.dispatch(transaction);
    });

    expect(didUndo).toBe(true);
    expect(refinexSerializer.serialize(view.state.doc)).toBe("Hello world");
  });

  it("inserts streamed markdown at the cursor and keeps inline-sync active", async () => {
    const baseState = createState("Hello");
    const state = baseState.applyTransaction(
      baseState.tr.setSelection(TextSelection.create(baseState.doc, 6)),
    ).state;
    const view = new TestEditorView(state) as unknown as Parameters<
      typeof createAIStreamHandler
    >[0];
    const handler = createAIStreamHandler(view, "insert-at-cursor", {
      requestId: "cursor-request",
    });

    handler.onToken(" **bold**");
    handler.onComplete();
    await handler.flush();

    expect(refinexSerializer.serialize(view.state.doc)).toBe("Hello **bold**");
  });

  it("creates and streams into a new document for new-document mode", async () => {
    const view = new TestEditorView(createState()) as unknown as Parameters<
      typeof createAIStreamHandler
    >[0];
    const handler = createAIStreamHandler(view, "new-document", {
      requestId: "new-document-request",
      targetPath: "AI Draft.md",
      skillId: "generate-outline",
    });

    handler.onToken("# Outline");
    handler.onToken("\n\n- One");
    handler.onComplete();
    await handler.flush();

    expect(useNoteStore.getState().currentFile).toBe("AI Draft.md");
    expect(useNoteStore.getState().documents["AI Draft.md"]?.content).toBe(
      "# Outline\n\n- One",
    );
  });
});

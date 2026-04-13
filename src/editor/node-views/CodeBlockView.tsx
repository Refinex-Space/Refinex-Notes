import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import {
  Compartment,
  EditorState as CodeMirrorState,
  type Extension,
} from "@codemirror/state";
import {
  EditorView as CodeMirrorView,
  keymap,
  type KeyBinding,
} from "@codemirror/view";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import {
  Selection,
  TextSelection,
  type EditorState,
  type Transaction,
} from "prosemirror-state";
import type { NodeView } from "prosemirror-view";
import { EditorView } from "prosemirror-view";
import { redo, undo } from "prosemirror-history";

import { refinexSchema } from "../schema";

export const CODE_BLOCK_LANGUAGE_OPTIONS = [
  { value: "plaintext", label: "Plain Text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
] as const;

export type CodeBlockLanguage = (typeof CODE_BLOCK_LANGUAGE_OPTIONS)[number]["value"];

const LANGUAGE_ALIASES: Record<string, CodeBlockLanguage> = {
  "": "plaintext",
  plain: "plaintext",
  plaintext: "plaintext",
  text: "plaintext",
  txt: "plaintext",
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  python: "python",
  py: "python",
  rust: "rust",
  rs: "rust",
  html: "html",
  css: "css",
  json: "json",
  markdown: "markdown",
  md: "markdown",
};

const codeMirrorTheme = CodeMirrorView.theme({
  "&": {
    backgroundColor: "transparent",
    fontSize: "0.875rem",
  },
  ".cm-scroller": {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    minHeight: "3.5rem",
  },
  ".cm-content": {
    padding: "0.875rem 1rem",
    caretColor: "inherit",
  },
  ".cm-line": {
    padding: "0",
  },
  ".cm-gutters": {
    display: "none",
  },
  ".cm-focused": {
    outline: "none",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "currentColor",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "rgba(59, 130, 246, 0.18)",
  },
});

export function normalizeCodeBlockLanguage(language: string | null | undefined): CodeBlockLanguage {
  const normalized = (language ?? "").trim().toLowerCase();
  return LANGUAGE_ALIASES[normalized] ?? "plaintext";
}

export function resolveCodeBlockLanguageSupport(language: string | null | undefined): Extension {
  switch (normalizeCodeBlockLanguage(language)) {
    case "javascript":
      return javascript();
    case "typescript":
      return javascript({ typescript: true });
    case "python":
      return python();
    case "rust":
      return rust();
    case "html":
      return html();
    case "css":
      return css();
    case "json":
      return json();
    case "markdown":
      return markdown();
    case "plaintext":
    default:
      return [];
  }
}

export function isCodeBlockSelectionOnLastLine(doc: string, head: number): boolean {
  const clampedHead = Math.max(0, Math.min(head, doc.length));
  return doc.indexOf("\n", clampedHead) === -1;
}

export function createCodeBlockContentTransaction(
  state: EditorState,
  codeBlockPos: number,
  node: ProseMirrorNode,
  nextText: string,
): Transaction | null {
  if (node.type !== refinexSchema.nodes.code_block || node.textContent === nextText) {
    return null;
  }

  const from = codeBlockPos + 1;
  const to = codeBlockPos + node.nodeSize - 1;
  const transaction = state.tr;

  if (nextText.length === 0) {
    return from === to ? null : transaction.delete(from, to);
  }

  return transaction.replaceWith(from, to, state.schema.text(nextText));
}

export function createExitCodeBlockTransaction(
  state: EditorState,
  codeBlockPos: number,
  node: ProseMirrorNode,
): Transaction {
  const after = codeBlockPos + node.nodeSize;
  const paragraph = state.schema.nodes.paragraph.create();
  const transaction = state.tr;
  const selection = Selection.findFrom(transaction.doc.resolve(after), 1, true);

  if (selection) {
    return transaction.setSelection(selection).scrollIntoView();
  }

  return transaction
    .insert(after, paragraph)
    .setSelection(TextSelection.create(transaction.doc, after + 1))
    .scrollIntoView();
}

export class CodeBlockView implements NodeView {
  readonly dom: HTMLDivElement;

  readonly contentDOM = null;

  private readonly editorMount: HTMLDivElement;

  private readonly languageSelect: HTMLSelectElement;

  private readonly languageCompartment = new Compartment();

  private codeMirrorView: CodeMirrorView;

  private isSyncingFromCodeMirror = false;

  private isSyncingFromProseMirror = false;

  constructor(
    private node: ProseMirrorNode,
    private readonly pmView: EditorView,
    private readonly getPos: () => number | undefined,
  ) {
    this.dom = document.createElement("div");
    this.dom.className = "refinex-code-block-view";

    const toolbar = document.createElement("div");
    toolbar.className = "refinex-code-block-toolbar";

    this.languageSelect = document.createElement("select");
    this.languageSelect.className = "refinex-code-block-language-select";
    this.languageSelect.setAttribute("aria-label", "Code block language");
    this.languageSelect.disabled = !pmView.editable;
    for (const option of CODE_BLOCK_LANGUAGE_OPTIONS) {
      const element = document.createElement("option");
      element.value = option.value;
      element.textContent = option.label;
      this.languageSelect.append(element);
    }
    this.languageSelect.value = normalizeCodeBlockLanguage(
      this.node.attrs.language as string,
    );
    toolbar.append(this.languageSelect);

    this.editorMount = document.createElement("div");
    this.editorMount.className = "refinex-code-block-editor";

    this.dom.append(toolbar, this.editorMount);

    this.languageSelect.addEventListener("change", this.handleLanguageChange);

    this.codeMirrorView = new CodeMirrorView({
      parent: this.editorMount,
      state: CodeMirrorState.create({
        doc: this.node.textContent,
        extensions: [
          CodeMirrorState.readOnly.of(!pmView.editable),
          CodeMirrorView.editable.of(pmView.editable),
          CodeMirrorView.lineWrapping,
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          this.languageCompartment.of(
            resolveCodeBlockLanguageSupport(this.node.attrs.language as string),
          ),
          keymap.of(this.createKeyBindings()),
          CodeMirrorView.updateListener.of((update) => {
            if (!update.docChanged || this.isSyncingFromProseMirror) {
              return;
            }

            const position = this.readPosition();
            if (position == null) {
              return;
            }

            const transaction = createCodeBlockContentTransaction(
              this.pmView.state,
              position,
              this.node,
              update.state.doc.toString(),
            );

            if (!transaction) {
              return;
            }

            this.isSyncingFromCodeMirror = true;
            this.pmView.dispatch(transaction);
            this.isSyncingFromCodeMirror = false;
          }),
          codeMirrorTheme,
        ],
      }),
    });
  }

  update(node: ProseMirrorNode): boolean {
    if (node.type !== this.node.type) {
      return false;
    }

    this.node = node;

    this.languageSelect.disabled = !this.pmView.editable;
    const nextLanguage = normalizeCodeBlockLanguage(node.attrs.language as string);
    if (this.languageSelect.value !== nextLanguage) {
      this.languageSelect.value = nextLanguage;
    }

    this.codeMirrorView.dispatch({
      effects: this.languageCompartment.reconfigure(
        resolveCodeBlockLanguageSupport(node.attrs.language as string),
      ),
    });

    const currentText = this.codeMirrorView.state.doc.toString();
    if (!this.isSyncingFromCodeMirror && currentText !== node.textContent) {
      this.isSyncingFromProseMirror = true;
      this.codeMirrorView.dispatch({
        changes: { from: 0, to: currentText.length, insert: node.textContent },
      });
      this.isSyncingFromProseMirror = false;
    }

    return true;
  }

  selectNode() {
    this.dom.classList.add("ProseMirror-selectednode");
    this.codeMirrorView.focus();
  }

  deselectNode() {
    this.dom.classList.remove("ProseMirror-selectednode");
  }

  stopEvent(event: Event): boolean {
    return event.target instanceof Node && this.dom.contains(event.target);
  }

  ignoreMutation(): boolean {
    return true;
  }

  destroy() {
    this.languageSelect.removeEventListener("change", this.handleLanguageChange);
    this.codeMirrorView.destroy();
  }

  private readonly handleLanguageChange = () => {
    const position = this.readPosition();
    if (position == null) {
      return;
    }

    const nextLanguage = normalizeCodeBlockLanguage(this.languageSelect.value);
    const currentLanguage = normalizeCodeBlockLanguage(
      this.node.attrs.language as string,
    );
    if (nextLanguage === currentLanguage) {
      return;
    }

    this.pmView.dispatch(
      this.pmView.state.tr.setNodeMarkup(position, undefined, {
        ...this.node.attrs,
        language: nextLanguage === "plaintext" ? "" : nextLanguage,
      }),
    );
    this.pmView.focus();
  };

  private createKeyBindings(): KeyBinding[] {
    return [
      {
        key: "Tab",
        run: (view) => {
          view.dispatch(view.state.replaceSelection("  "));
          return true;
        },
      },
      {
        key: "Mod-Enter",
        run: () => this.exitCodeBlock(),
      },
      {
        key: "Escape",
        run: () => this.exitCodeBlock(),
      },
      {
        key: "ArrowDown",
        run: (view) => {
          if (!view.state.selection.main.empty) {
            return false;
          }

          if (
            !isCodeBlockSelectionOnLastLine(
              view.state.doc.toString(),
              view.state.selection.main.head,
            )
          ) {
            return false;
          }

          return this.exitCodeBlock();
        },
      },
      {
        key: "Mod-z",
        run: () =>
          undo(
            this.pmView.state,
            (transaction) => this.pmView.dispatch(transaction),
            this.pmView,
          ),
      },
      {
        key: "Mod-y",
        run: () =>
          redo(
            this.pmView.state,
            (transaction) => this.pmView.dispatch(transaction),
            this.pmView,
          ),
      },
      {
        key: "Mod-Shift-z",
        run: () =>
          redo(
            this.pmView.state,
            (transaction) => this.pmView.dispatch(transaction),
            this.pmView,
          ),
      },
    ];
  }

  private exitCodeBlock(): boolean {
    const position = this.readPosition();
    if (position == null) {
      return false;
    }

    this.pmView.dispatch(
      createExitCodeBlockTransaction(this.pmView.state, position, this.node),
    );
    this.pmView.focus();
    return true;
  }

  private readPosition(): number | null {
    const position = this.getPos();
    return typeof position === "number" ? position : null;
  }
}

export default CodeBlockView;

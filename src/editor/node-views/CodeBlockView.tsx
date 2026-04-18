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

export type CodeBlockLanguage =
  (typeof CODE_BLOCK_LANGUAGE_OPTIONS)[number]["value"];

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
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection":
    {
      backgroundColor: "rgba(59, 130, 246, 0.18)",
    },
});

export function normalizeCodeBlockLanguage(
  language: string | null | undefined,
): CodeBlockLanguage {
  const normalized = (language ?? "").trim().toLowerCase();
  return LANGUAGE_ALIASES[normalized] ?? "plaintext";
}

export function countCodeBlockLines(doc: string) {
  return Math.max(1, doc.split("\n").length);
}

export function summarizeCodeBlock(doc: string) {
  const normalized = doc.replace(/\s+$/g, "");
  const firstLine = normalized.split("\n")[0]?.trim() ?? "";
  const preview =
    firstLine.length === 0
      ? "空代码块"
      : firstLine.length > 72
        ? `${firstLine.slice(0, 72)}...`
        : firstLine;

  return {
    lineCount: countCodeBlockLines(doc),
    preview,
  };
}

export function resolveCodeBlockLanguageSupport(
  language: string | null | undefined,
): Extension {
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

export function isCodeBlockSelectionOnLastLine(
  doc: string,
  head: number,
): boolean {
  const clampedHead = Math.max(0, Math.min(head, doc.length));
  return doc.indexOf("\n", clampedHead) === -1;
}

export function createCodeBlockContentTransaction(
  state: EditorState,
  codeBlockPos: number,
  node: ProseMirrorNode,
  nextText: string,
): Transaction | null {
  if (
    node.type !== refinexSchema.nodes.code_block ||
    node.textContent === nextText
  ) {
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

  private readonly toolbar: HTMLDivElement;

  private readonly summaryElement: HTMLDivElement;

  private readonly editorMount: HTMLDivElement;

  private readonly previewElement: HTMLPreElement;

  private readonly languageSelect: HTMLSelectElement;

  private readonly languageCompartment = new Compartment();

  /** Compartment used to switch between read-only (preview) and editable (active) mode. */
  private readonly editableCompartment = new Compartment();

  private codeMirrorView: CodeMirrorView | null = null;

  private isSyncingFromCodeMirror = false;

  private isSyncingFromProseMirror = false;

  private isActive = false;

  private isInViewport = true;

  private viewportObserver: IntersectionObserver | null = null;

  constructor(
    private node: ProseMirrorNode,
    private readonly pmView: EditorView,
    private readonly getPos: () => number | undefined,
  ) {
    this.dom = document.createElement("div");
    this.dom.className = "refinex-code-block-view";

    this.toolbar = document.createElement("div");
    this.toolbar.className = "refinex-code-block-toolbar";

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
    this.toolbar.append(this.languageSelect);

    this.summaryElement = document.createElement("div");
    this.summaryElement.className = "refinex-code-block-summary";
    this.summaryElement.tabIndex = 0;

    this.previewElement = document.createElement("pre");
    this.previewElement.className = "refinex-code-block-preview";
    this.previewElement.tabIndex = 0;

    this.editorMount = document.createElement("div");
    this.editorMount.className = "refinex-code-block-editor";

    this.dom.append(
      this.toolbar,
      this.summaryElement,
      this.previewElement,
      this.editorMount,
    );

    this.languageSelect.addEventListener("change", this.handleLanguageChange);
    this.summaryElement.addEventListener(
      "mousedown",
      this.handleSummaryPointerDown,
    );
    this.summaryElement.addEventListener("keydown", this.handleSummaryKeyDown);
    this.previewElement.addEventListener(
      "mousedown",
      this.handlePreviewPointerDown,
    );
    this.previewElement.addEventListener("keydown", this.handlePreviewKeyDown);
    // Intercept clicks/keys on the CM preview mount so activation happens before CM
    // processes the event (capture phase = fires before CM's own handlers).
    this.editorMount.addEventListener(
      "mousedown",
      this.handleEditorMountPointerDown,
      true,
    );
    this.editorMount.addEventListener("keydown", this.handleEditorMountKeyDown);
    this.setupViewportObservation();
    this.refreshPassiveSurfaces();
    this.syncPresentation();
  }

  update(node: ProseMirrorNode): boolean {
    if (node.type !== this.node.type) {
      return false;
    }

    this.node = node;

    this.languageSelect.disabled = !this.pmView.editable;
    const nextLanguage = normalizeCodeBlockLanguage(
      node.attrs.language as string,
    );
    if (this.languageSelect.value !== nextLanguage) {
      this.languageSelect.value = nextLanguage;
    }

    this.refreshPassiveSurfaces();

    if (this.codeMirrorView) {
      this.codeMirrorView.dispatch({
        effects: this.languageCompartment.reconfigure(
          resolveCodeBlockLanguageSupport(node.attrs.language as string),
        ),
      });

      const currentText = this.codeMirrorView.state.doc.toString();
      if (!this.isSyncingFromCodeMirror && currentText !== node.textContent) {
        this.isSyncingFromProseMirror = true;
        this.codeMirrorView.dispatch({
          changes: {
            from: 0,
            to: currentText.length,
            insert: node.textContent,
          },
        });
        this.isSyncingFromProseMirror = false;
      }
    }

    return true;
  }

  selectNode() {
    this.dom.classList.add("ProseMirror-selectednode");
    this.activateCodeMirror(true);
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
    this.languageSelect.removeEventListener(
      "change",
      this.handleLanguageChange,
    );
    this.summaryElement.removeEventListener(
      "mousedown",
      this.handleSummaryPointerDown,
    );
    this.summaryElement.removeEventListener(
      "keydown",
      this.handleSummaryKeyDown,
    );
    this.previewElement.removeEventListener(
      "mousedown",
      this.handlePreviewPointerDown,
    );
    this.previewElement.removeEventListener(
      "keydown",
      this.handlePreviewKeyDown,
    );
    this.editorMount.removeEventListener(
      "mousedown",
      this.handleEditorMountPointerDown,
      true,
    );
    this.editorMount.removeEventListener(
      "keydown",
      this.handleEditorMountKeyDown,
    );
    this.viewportObserver?.disconnect();
    this.codeMirrorView?.destroy();
  }

  /**
   * Mount a read-only CodeMirror instance for syntax-highlighted preview.
   * Called when the block enters the viewport, before any user interaction.
   */
  private mountPassiveCodeMirror() {
    if (this.codeMirrorView) return;
    this.codeMirrorView = new CodeMirrorView({
      parent: this.editorMount,
      state: CodeMirrorState.create({
        doc: this.node.textContent,
        extensions: [
          this.editableCompartment.of([
            CodeMirrorState.readOnly.of(true),
            CodeMirrorView.editable.of(false),
          ]),
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

  private activateCodeMirror(shouldFocus: boolean) {
    if (!this.codeMirrorView) {
      this.mountPassiveCodeMirror();
    }

    // Switch from read-only preview to fully editable.
    this.codeMirrorView!.dispatch({
      effects: this.editableCompartment.reconfigure([
        CodeMirrorState.readOnly.of(!this.pmView.editable),
        CodeMirrorView.editable.of(this.pmView.editable),
      ]),
    });

    this.isActive = true;
    this.syncPresentation();
    if (shouldFocus) {
      this.codeMirrorView!.focus();
    }
  }

  private syncPresentation() {
    this.dom.classList.toggle("is-active", this.isActive);
    const showPreview = !this.isActive && this.isInViewport;
    const showSummary = !this.isActive && !this.isInViewport;
    // When CodeMirror is mounted in preview mode, it handles display instead of <pre>.
    const cmInPreview = showPreview && this.codeMirrorView !== null;
    this.toolbar.hidden = !showPreview && !this.isActive;
    this.summaryElement.hidden = !showSummary;
    this.previewElement.hidden = !showPreview || cmInPreview;
    this.editorMount.hidden = !this.isActive && !cmInPreview;
  }

  private refreshPassiveSurfaces() {
    const summary = summarizeCodeBlock(this.node.textContent);
    this.summaryElement.innerHTML = "";

    const badge = document.createElement("span");
    badge.className = "refinex-code-block-summary-badge";
    badge.textContent = normalizeCodeBlockLanguage(
      this.node.attrs.language as string,
    ).toUpperCase();

    const preview = document.createElement("span");
    preview.className = "refinex-code-block-summary-text";
    preview.textContent = summary.preview;

    const meta = document.createElement("span");
    meta.className = "refinex-code-block-summary-meta";
    meta.textContent = `${summary.lineCount} 行`;

    this.summaryElement.append(badge, preview, meta);
    this.previewElement.textContent = this.isInViewport
      ? this.node.textContent || " "
      : "";
  }

  private setupViewportObservation() {
    if (!("IntersectionObserver" in window)) {
      this.isInViewport = true;
      return;
    }

    this.viewportObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const nextInViewport = Boolean(entry?.isIntersecting);
        if (nextInViewport === this.isInViewport || this.isActive) {
          return;
        }

        this.isInViewport = nextInViewport;
        if (nextInViewport) {
          // Eagerly mount read-only CodeMirror for instant syntax highlighting.
          this.mountPassiveCodeMirror();
        }
        this.refreshPassiveSurfaces();
        this.syncPresentation();
      },
      {
        root: null,
        rootMargin: "480px 0px",
        threshold: 0,
      },
    );

    this.viewportObserver.observe(this.dom);
    this.isInViewport = false;
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

  private readonly handlePreviewPointerDown = (event: MouseEvent) => {
    event.preventDefault();
    this.activateCodeMirror(true);
  };

  private readonly handlePreviewKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    this.activateCodeMirror(true);
  };

  /**
   * Fired in the capture phase on editorMount — switches CM from read-only preview
   * to editable BEFORE CodeMirror's own mousedown handler runs, so the cursor
   * lands at the clicked position naturally.
   */
  private readonly handleEditorMountPointerDown = (_event: MouseEvent) => {
    if (this.isActive) return;
    this.codeMirrorView?.dispatch({
      effects: this.editableCompartment.reconfigure([
        CodeMirrorState.readOnly.of(!this.pmView.editable),
        CodeMirrorView.editable.of(this.pmView.editable),
      ]),
    });
    this.isActive = true;
    this.syncPresentation();
    // No focus() call — CM focuses itself naturally from the mousedown event.
  };

  private readonly handleEditorMountKeyDown = (event: KeyboardEvent) => {
    if (this.isActive) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    this.activateCodeMirror(true);
  };

  private readonly handleSummaryPointerDown = (event: MouseEvent) => {
    event.preventDefault();
    this.isInViewport = true;
    this.refreshPassiveSurfaces();
    this.syncPresentation();
  };

  private readonly handleSummaryKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    this.isInViewport = true;
    this.refreshPassiveSurfaces();
    this.syncPresentation();
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

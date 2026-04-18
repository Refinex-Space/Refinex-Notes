import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { cpp } from "@codemirror/lang-cpp";
import { html } from "@codemirror/lang-html";
import { java } from "@codemirror/lang-java";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { php } from "@codemirror/lang-php";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { sass } from "@codemirror/lang-sass";
import { sql } from "@codemirror/lang-sql";
import { vue } from "@codemirror/lang-vue";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import {
  defaultHighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import {
  csharp as csharpMode,
  kotlin as kotlinMode,
  scala as scalaMode,
} from "@codemirror/legacy-modes/mode/clike";
import { clojure as clojureMode } from "@codemirror/legacy-modes/mode/clojure";
import { coffeeScript as coffeeScriptMode } from "@codemirror/legacy-modes/mode/coffeescript";
import { diff as diffMode } from "@codemirror/legacy-modes/mode/diff";
import { dockerFile as dockerfileMode } from "@codemirror/legacy-modes/mode/dockerfile";
import { erlang as erlangMode } from "@codemirror/legacy-modes/mode/erlang";
import { go as goMode } from "@codemirror/legacy-modes/mode/go";
import { groovy as groovyMode } from "@codemirror/legacy-modes/mode/groovy";
import { haskell as haskellMode } from "@codemirror/legacy-modes/mode/haskell";
import { julia as juliaMode } from "@codemirror/legacy-modes/mode/julia";
import { lua as luaMode } from "@codemirror/legacy-modes/mode/lua";
import { nginx as nginxMode } from "@codemirror/legacy-modes/mode/nginx";
import { octave as octaveMode } from "@codemirror/legacy-modes/mode/octave";
import { perl as perlMode } from "@codemirror/legacy-modes/mode/perl";
import { powerShell as powerShellMode } from "@codemirror/legacy-modes/mode/powershell";
import { r as rMode } from "@codemirror/legacy-modes/mode/r";
import { ruby as rubyMode } from "@codemirror/legacy-modes/mode/ruby";
import { shell as shellMode } from "@codemirror/legacy-modes/mode/shell";
import { stex as stexMode } from "@codemirror/legacy-modes/mode/stex";
import { swift as swiftMode } from "@codemirror/legacy-modes/mode/swift";
import { toml as tomlMode } from "@codemirror/legacy-modes/mode/toml";
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
  // General
  { value: "plaintext", label: "Plain Text" },
  // Web
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "less", label: "Less" },
  { value: "javascript", label: "JavaScript" },
  { value: "jsx", label: "JSX" },
  { value: "typescript", label: "TypeScript" },
  { value: "tsx", label: "TSX" },
  { value: "json", label: "JSON" },
  { value: "xml", label: "XML" },
  { value: "vue", label: "Vue" },
  { value: "markdown", label: "Markdown" },
  { value: "yaml", label: "YAML" },
  { value: "toml", label: "TOML" },
  // Systems
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "scala", label: "Scala" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "perl", label: "Perl" },
  { value: "haskell", label: "Haskell" },
  { value: "lua", label: "Lua" },
  { value: "r", label: "R" },
  { value: "julia", label: "Julia" },
  { value: "erlang", label: "Erlang" },
  { value: "clojure", label: "Clojure" },
  { value: "groovy", label: "Groovy" },
  { value: "coffeescript", label: "CoffeeScript" },
  // Data / Query
  { value: "sql", label: "SQL" },
  // Shell / DevOps
  { value: "bash", label: "Bash" },
  { value: "powershell", label: "PowerShell" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "nginx", label: "Nginx" },
  // Scientific
  { value: "matlab", label: "MATLAB" },
  { value: "latex", label: "LaTeX" },
  // Misc
  { value: "diff", label: "Diff" },
] as const;

export type CodeBlockLanguage =
  (typeof CODE_BLOCK_LANGUAGE_OPTIONS)[number]["value"];

/** Only real aliases (abbreviations / alternate names). Identity mappings are
 *  handled by the direct-match fallback in normalizeCodeBlockLanguage. */
const LANGUAGE_ALIASES: Record<string, string> = {
  // Plaintext
  "": "plaintext",
  plain: "plaintext",
  text: "plaintext",
  txt: "plaintext",
  // JavaScript / TypeScript
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  // Python
  py: "python",
  py3: "python",
  python3: "python",
  // C family
  "c++": "cpp",
  "c#": "csharp",
  cs: "csharp",
  // Shell
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  // Ruby
  rb: "ruby",
  // YAML
  yml: "yaml",
  // Markdown
  md: "markdown",
  // SQL dialects
  mysql: "sql",
  postgresql: "sql",
  pgsql: "sql",
  sqlite: "sql",
  // Kotlin
  kt: "kotlin",
  // Haskell
  hs: "haskell",
  // Go
  golang: "go",
  // Rust
  rs: "rust",
  // Erlang
  erl: "erlang",
  // CoffeeScript
  coffee: "coffeescript",
  // LaTeX
  tex: "latex",
  // MATLAB
  octave: "matlab",
  // Dockerfile
  docker: "dockerfile",
  // Groovy / Gradle
  gradle: "groovy",
  // Julia
  jl: "julia",
  // PowerShell
  ps1: "powershell",
  // Perl
  pl: "perl",
  pm: "perl",
  // Diff
  patch: "diff",
  // TOML
  tml: "toml",
  // Scala
  sc: "scala",
  // PHP
  php5: "php",
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
  // Check alias dictionary first
  const aliased = LANGUAGE_ALIASES[normalized];
  if (aliased !== undefined) return aliased as CodeBlockLanguage;
  // Direct match against known language values
  const direct = CODE_BLOCK_LANGUAGE_OPTIONS.find(
    (o) => o.value === normalized,
  );
  if (direct) return direct.value;
  return "plaintext";
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
    // Web
    case "html":
      return html();
    case "css":
      return css();
    case "scss":
      return sass();
    case "less":
      return css();
    case "javascript":
      return javascript({ jsx: false });
    case "jsx":
      return javascript({ jsx: true });
    case "typescript":
      return javascript({ typescript: true });
    case "tsx":
      return javascript({ typescript: true, jsx: true });
    case "json":
      return json();
    case "xml":
      return xml();
    case "vue":
      return vue();
    case "markdown":
      return markdown();
    case "yaml":
      return yaml();
    case "toml":
      return StreamLanguage.define(tomlMode);
    // Systems
    case "python":
      return python();
    case "java":
      return java();
    case "c":
    case "cpp":
      return cpp();
    case "csharp":
      return StreamLanguage.define(csharpMode);
    case "go":
      return StreamLanguage.define(goMode);
    case "rust":
      return rust();
    case "swift":
      return StreamLanguage.define(swiftMode);
    case "kotlin":
      return StreamLanguage.define(kotlinMode);
    case "scala":
      return StreamLanguage.define(scalaMode);
    case "php":
      return php();
    case "ruby":
      return StreamLanguage.define(rubyMode);
    case "perl":
      return StreamLanguage.define(perlMode);
    case "haskell":
      return StreamLanguage.define(haskellMode);
    case "lua":
      return StreamLanguage.define(luaMode);
    case "r":
      return StreamLanguage.define(rMode);
    case "julia":
      return StreamLanguage.define(juliaMode);
    case "erlang":
      return StreamLanguage.define(erlangMode);
    case "clojure":
      return StreamLanguage.define(clojureMode);
    case "groovy":
      return StreamLanguage.define(groovyMode);
    case "coffeescript":
      return StreamLanguage.define(coffeeScriptMode);
    // Data / Query
    case "sql":
      return sql();
    // Shell / DevOps
    case "bash":
      return StreamLanguage.define(shellMode);
    case "powershell":
      return StreamLanguage.define(powerShellMode);
    case "dockerfile":
      return StreamLanguage.define(dockerfileMode);
    case "nginx":
      return StreamLanguage.define(nginxMode);
    // Scientific
    case "matlab":
      return StreamLanguage.define(octaveMode);
    case "latex":
      return StreamLanguage.define(stexMode);
    // Misc
    case "diff":
      return StreamLanguage.define(diffMode);
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

// ─────────────────────────────────────────────────────────────────────────────
// LanguageCombobox — custom autocomplete picker for code block language
// ─────────────────────────────────────────────────────────────────────────────

type LangOption = Readonly<{ value: string; label: string }>;

class LanguageCombobox {
  readonly container: HTMLDivElement;
  private readonly trigger: HTMLButtonElement;
  private dropdown: HTMLDivElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private listEl: HTMLUListElement | null = null;
  private isOpen = false;
  private highlightedIndex = -1;
  private filteredOptions: LangOption[] = [];
  private cleanupDocListener: (() => void) | null = null;

  constructor(
    private readonly options: readonly LangOption[],
    private currentValue: string,
    private readonly onChange: (value: string) => void,
    editable: boolean,
  ) {
    this.container = document.createElement("div");
    this.container.className = "refinex-lang-combobox";

    this.trigger = document.createElement("button");
    this.trigger.type = "button";
    this.trigger.className = "refinex-lang-combobox-trigger";
    this.trigger.disabled = !editable;
    this.trigger.setAttribute("aria-haspopup", "listbox");
    this.trigger.setAttribute("aria-expanded", "false");
    this.trigger.addEventListener("mousedown", this.handleTriggerPointerDown);
    this.updateTriggerLabel();

    this.container.append(this.trigger);
  }

  setValue(value: string) {
    this.currentValue = value;
    this.updateTriggerLabel();
  }

  setEditable(editable: boolean) {
    this.trigger.disabled = !editable;
    if (!editable && this.isOpen) this.close();
  }

  destroy() {
    this.close();
    this.trigger.removeEventListener(
      "mousedown",
      this.handleTriggerPointerDown,
    );
  }

  private updateTriggerLabel() {
    const opt = this.options.find((o) => o.value === this.currentValue);
    const label = opt?.label ?? this.currentValue;
    this.trigger.textContent = "";
    const labelSpan = document.createElement("span");
    labelSpan.textContent = label;
    // Chevron-down icon
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "10");
    svg.setAttribute("height", "10");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.5");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    const polyline = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polyline",
    );
    polyline.setAttribute("points", "6 9 12 15 18 9");
    svg.append(polyline);
    this.trigger.append(labelSpan, svg);
  }

  private readonly handleTriggerPointerDown = (event: MouseEvent) => {
    // preventDefault prevents the button from stealing focus (which would
    // cause CodeMirror's scroller to adjust, firing a captured scroll event
    // that would immediately close the dropdown before the user sees it).
    event.preventDefault();
    event.stopPropagation();
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  };

  private open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.trigger.setAttribute("aria-expanded", "true");

    // Build dropdown DOM
    this.dropdown = document.createElement("div");
    this.dropdown.className = "refinex-lang-combobox-dropdown";

    this.searchInput = document.createElement("input");
    this.searchInput.type = "text";
    this.searchInput.className = "refinex-lang-combobox-input";
    this.searchInput.placeholder = "搜索语言...";
    this.searchInput.setAttribute("autocomplete", "off");
    this.searchInput.setAttribute("autocorrect", "off");
    this.searchInput.setAttribute("autocapitalize", "none");
    this.searchInput.setAttribute("spellcheck", "false");
    this.searchInput.setAttribute("role", "combobox");
    this.searchInput.setAttribute("aria-autocomplete", "list");

    this.listEl = document.createElement("ul");
    this.listEl.className = "refinex-lang-combobox-list";
    this.listEl.setAttribute("role", "listbox");

    this.dropdown.append(this.searchInput, this.listEl);
    document.body.append(this.dropdown);

    this.positionDropdown();

    // Show all options initially, highlight currently active one
    this.filteredOptions = [...this.options];
    this.highlightedIndex = Math.max(
      0,
      this.filteredOptions.findIndex((o) => o.value === this.currentValue),
    );
    this.renderOptions();

    // Wire dropdown events
    this.searchInput.addEventListener("input", this.handleSearchInput);
    this.searchInput.addEventListener("keydown", this.handleSearchKeyDown);
    this.listEl.addEventListener("mousedown", this.handleListMouseDown);
    this.listEl.addEventListener("mousemove", this.handleListMouseMove);

    // Auto-focus + scroll highlighted item into view
    requestAnimationFrame(() => {
      this.searchInput?.focus();
      this.scrollHighlightedIntoView();
    });

    // Close on outside click
    const onDocMouseDown = (e: MouseEvent) => {
      if (
        !this.dropdown?.contains(e.target as Node) &&
        !this.container.contains(e.target as Node)
      ) {
        this.close();
      }
    };
    // Delay listener by one tick so the originating mousedown doesn't
    // immediately trigger a close (belt-and-suspenders with stopPropagation).
    setTimeout(() => {
      document.addEventListener("mousedown", onDocMouseDown, true);
      this.cleanupDocListener = () =>
        document.removeEventListener("mousedown", onDocMouseDown, true);
    }, 0);
    // Note: no scroll listener — a position:fixed dropdown should not close
    // on scroll, and a capture scroll listener would catch CodeMirror's
    // internal scroller adjustments and close the dropdown prematurely.
  }

  private close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.trigger.setAttribute("aria-expanded", "false");
    this.cleanupDocListener?.();
    this.cleanupDocListener = null;
    this.dropdown?.remove();
    this.dropdown = null;
    this.searchInput = null;
    this.listEl = null;
    this.highlightedIndex = -1;
  }

  private positionDropdown() {
    if (!this.dropdown) return;
    const rect = this.trigger.getBoundingClientRect();
    this.dropdown.style.top = `${rect.bottom + 4}px`;
    this.dropdown.style.left = `${rect.left}px`;
    this.dropdown.style.minWidth = `${Math.max(rect.width, 200)}px`;
  }

  private renderOptions() {
    if (!this.listEl) return;
    this.listEl.innerHTML = "";
    for (let i = 0; i < this.filteredOptions.length; i++) {
      const option = this.filteredOptions[i]!;
      const li = document.createElement("li");
      li.className = "refinex-lang-combobox-option";
      li.setAttribute("role", "option");
      li.setAttribute(
        "aria-selected",
        String(option.value === this.currentValue),
      );
      li.dataset["value"] = option.value;
      li.dataset["index"] = String(i);
      if (option.value === this.currentValue) li.classList.add("is-selected");
      if (i === this.highlightedIndex) li.classList.add("is-highlighted");
      li.textContent = option.label;
      this.listEl.append(li);
    }
  }

  private setHighlightedIndex(index: number) {
    const clamped = Math.max(
      0,
      Math.min(index, this.filteredOptions.length - 1),
    );
    this.highlightedIndex = clamped;
    this.renderOptions();
    this.scrollHighlightedIntoView();
  }

  private scrollHighlightedIntoView() {
    if (this.highlightedIndex < 0 || !this.listEl) return;
    this.listEl.children[this.highlightedIndex]?.scrollIntoView({
      block: "nearest",
    });
  }

  private selectOption(value: string) {
    this.currentValue = value;
    this.updateTriggerLabel();
    this.close();
    this.onChange(value);
  }

  private readonly handleSearchInput = () => {
    const query = (this.searchInput?.value ?? "").toLowerCase().trim();
    if (query === "") {
      this.filteredOptions = [...this.options];
    } else {
      this.filteredOptions = this.options.filter(
        (o) =>
          o.label.toLowerCase().includes(query) ||
          o.value.toLowerCase().includes(query),
      );
    }
    this.highlightedIndex = this.filteredOptions.length > 0 ? 0 : -1;
    this.renderOptions();
  };

  private readonly handleSearchKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.setHighlightedIndex(this.highlightedIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.setHighlightedIndex(this.highlightedIndex - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const opt = this.filteredOptions[this.highlightedIndex];
      if (opt) this.selectOption(opt.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.close();
    }
  };

  private readonly handleListMouseDown = (event: MouseEvent) => {
    // Prevent focus loss from the search input
    event.preventDefault();
    const li = (event.target as Element).closest(
      "[data-value]",
    ) as HTMLElement | null;
    if (li?.dataset["value"]) {
      this.selectOption(li.dataset["value"]);
    }
  };

  private readonly handleListMouseMove = (event: MouseEvent) => {
    const li = (event.target as Element).closest(
      "[data-index]",
    ) as HTMLElement | null;
    if (!li) return;
    const idx = parseInt(li.dataset["index"] ?? "-1", 10);
    if (idx >= 0 && idx !== this.highlightedIndex) {
      this.highlightedIndex = idx;
      this.renderOptions();
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export class CodeBlockView implements NodeView {
  readonly dom: HTMLDivElement;

  readonly contentDOM = null;

  private readonly toolbar: HTMLDivElement;

  private readonly summaryElement: HTMLDivElement;

  private readonly editorMount: HTMLDivElement;

  private readonly previewElement: HTMLPreElement;

  /** Copy-to-clipboard button (right side of toolbar). */
  private readonly copyButton: HTMLButtonElement;

  private readonly languageCompartment = new Compartment();

  /** Compartment used to switch between read-only (preview) and editable (active) mode. */
  private readonly editableCompartment = new Compartment();

  /** Custom autocomplete combobox for selecting the code block language. */
  private readonly langCombobox: LanguageCombobox;

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

    // ── Language combobox (left side) ────────────────────────────────────────
    const initialLanguage = normalizeCodeBlockLanguage(
      this.node.attrs.language as string,
    );
    this.langCombobox = new LanguageCombobox(
      CODE_BLOCK_LANGUAGE_OPTIONS,
      initialLanguage,
      (nextLanguage) => {
        this.onLanguageChange(nextLanguage);
      },
      pmView.editable,
    );

    // ── Copy button (right side) ──────────────────────────────────────────
    this.copyButton = document.createElement("button");
    this.copyButton.type = "button";
    this.copyButton.className = "refinex-code-block-copy-btn";
    this.copyButton.setAttribute("aria-label", "复制代码");
    this.copyButton.title = "复制代码";
    this.copyButton.innerHTML =
      `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
      `<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>` +
      `<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>` +
      `</svg>`;

    this.toolbar.append(this.langCombobox.container, this.copyButton);

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

    this.copyButton.addEventListener("click", this.handleCopyClick);
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

    this.langCombobox.setEditable(this.pmView.editable);
    const nextLanguage = normalizeCodeBlockLanguage(
      node.attrs.language as string,
    );
    this.langCombobox.setValue(nextLanguage);

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
    this.langCombobox.destroy();
    this.copyButton.removeEventListener("click", this.handleCopyClick);
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

  private readonly handleCopyClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    void navigator.clipboard.writeText(this.node.textContent).then(() => {
      this.copyButton.classList.add("is-copied");
      setTimeout(() => this.copyButton.classList.remove("is-copied"), 1500);
    });
  };

  private onLanguageChange(nextLanguage: string) {
    const position = this.readPosition();
    if (position == null) return;

    const currentLanguage = normalizeCodeBlockLanguage(
      this.node.attrs.language as string,
    );
    if (nextLanguage === currentLanguage) return;

    this.pmView.dispatch(
      this.pmView.state.tr.setNodeMarkup(position, undefined, {
        ...this.node.attrs,
        language: nextLanguage === "plaintext" ? "" : nextLanguage,
      }),
    );
    this.pmView.focus();
  }

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

# Execution Plan: Editor Shell Integration

Created: 2026-04-13
Status: Completed
Author: agent

## Objective

Integrate the Phase 2 editor shell plugins so `RefinexEditor` shows an empty-state placeholder, preserves a trailing editable paragraph, and mounts the Phase 1-2 plugin stack in the intended order.

## Scope

**In scope:**
- `src/editor/RefinexEditor.tsx`
- `src/editor/plugins/placeholder.ts`
- `src/editor/plugins/trailing-node.ts`
- `src/editor/editor.css`
- `src/editor/index.ts`
- `src/editor/__tests__/editor-shell-plugins.test.ts`

**Out of scope:**
- Phase 3 NodeViews and richer editor UI
- Additional inline formatting rules beyond existing inline-sync

## Constraints

- Editor-core plugin logic stays in `src/editor/`.
- The plugin stack keeps `refinexKeymap()`, `keymap(baseKeymap)`, `refinexInputRules()`, `inlineSyncPlugin(...)`, `history()`, `dropCursor()`, and `gapCursor()` in the requested order, with shell plugins inserted without breaking those behaviors.
- External Markdown serialization must not leak the synthetic trailing paragraph.

## Acceptance Criteria

- [x] AC-1: `RefinexEditor` mounts the final Phase 1-2 plugin stack in the requested order, with placeholder and trailing-node support added.
- [x] AC-2: Empty documents expose a placeholder decoration and end-of-document edits always have an empty trailing paragraph available.
- [x] AC-3: Existing inline-sync, block shortcuts, line shortcuts, and undo/redo behavior remain green after shell integration.
- [x] AC-4: Focused tests cover placeholder decorations and trailing paragraph normalization / append behavior.
- [x] AC-5: `npm test`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml` pass.

## Implementation Steps

### Step 1: Add placeholder plugin

**Files:** `src/editor/plugins/placeholder.ts`, `src/editor/editor.css`
**Verification:** Empty-document placeholder decoration is covered by focused tests

Status: ✅ Done
Evidence: Added `placeholderPlugin()` with a `Decoration.widget` empty-state message and matching CSS styling.
Deviations:

### Step 2: Add trailing-node plugin and normalization helpers

**Files:** `src/editor/plugins/trailing-node.ts`
**Verification:** Focused tests prove trailing paragraph normalization and append behavior

Status: ✅ Done
Evidence: Added `trailingNodePlugin()`, `ensureTrailingParagraph()`, and `stripTrailingParagraph()` to keep editor state editable without leaking synthetic paragraphs into serialized Markdown.
Deviations:

### Step 3: Integrate shell plugins into RefinexEditor

**Files:** `src/editor/RefinexEditor.tsx`, `src/editor/index.ts`
**Verification:** Editor state creation and external value sync both normalize trailing paragraphs and preserve existing plugin order

Status: ✅ Done
Evidence: `RefinexEditor` now mounts placeholder/trailing-node support together with the existing Phase 1-2 plugins and strips the synthetic trailing paragraph before `onChange` / prop synchronization comparisons.
Deviations:

### Step 4: Add tests and run full verification

**Files:** `src/editor/__tests__/editor-shell-plugins.test.ts`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`, `npm test`, and `npm run build`

Status: ✅ Done
Evidence: Added 4 focused shell-plugin tests; full suite passes with 49/49 frontend tests green, build green, and native tests green.
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | Placeholder decoration test passes | Added matching placeholder CSS |
| 2 | ✅ | Trailing paragraph normalization tests pass | Serialization strips synthetic trailing paragraph |
| 3 | ✅ | `RefinexEditor` mounts shell plugins and normalizes docs | Existing Phase 1-2 plugin order preserved |
| 4 | ✅ | `cargo test` pass; `npm test` 49/49 pass; `npm run build` pass | No regression in previous editor tests |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| Strip the trailing paragraph before serialization and value comparison | The editor state must keep a synthetic empty paragraph at the end, but persisted Markdown should not gain a perpetual blank block | Serialize editor state as-is; drop trailing paragraph only in UI | Centralizing the normalization in helper functions keeps `onChange` and controlled-value sync stable |
| Insert placeholder and trailing-node plugins between inline-sync and history/dropcursor/gapcursor | The requested shell plugins extend editor behavior but should not outrank custom key bindings, base keymap, or input rules | Place shell plugins at the start or end of the plugin array | This placement preserves the requested editing precedence while keeping shell behavior active during appended transactions and rendering |

## Completion Summary

Completed: 2026-04-13
Duration: 4 steps
All acceptance criteria: PASS

Summary: Added `src/editor/plugins/placeholder.ts` and `src/editor/plugins/trailing-node.ts`, integrated both into `RefinexEditor`, updated editor styling for placeholder/caret behavior, and added focused shell-plugin tests. The editor now shows an empty-state prompt, always keeps a trailing empty paragraph available for end-of-document editing, and preserves existing inline-sync / input-rules / keymap behavior with 49 passing frontend tests plus green build/native checks.

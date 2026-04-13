# Execution Plan: CodeMirror Code Block View

Created: 2026-04-13
Status: Completed
Author: agent

## Objective

Implement a CodeMirror 6-powered `code_block` NodeView and register it in `RefinexEditor` so code blocks gain interactive editing, language switching, syntax highlighting, and exit behavior without breaking existing editor plugins.

## Scope

**In scope:**
- CodeMirror 6 dependency installation
- `src/editor/node-views/CodeBlockView.tsx`
- `src/editor/RefinexEditor.tsx`
- `src/editor/index.ts`
- Focused tests for non-DOM helper logic / NodeView integration edges

**Out of scope:**
- Other Phase 3 NodeViews (image, table)
- Toolbar, SlashMenu, LinkPopover
- Full CodeMirror theming beyond a basic usable configuration

## Constraints

- Editor-core logic remains under `src/editor/`.
- Existing inline-sync, input-rules, keymap, placeholder, and trailing-node behavior must remain intact.
- CodeMirror changes must synchronize both code content and `language` attrs with ProseMirror.
- Undo/redo must keep working across code-block edits and regular editor edits.

## Acceptance Criteria

- [x] AC-1: CodeMirror 6 dependencies are installed and the repo still builds/tests cleanly.
- [x] AC-2: `src/editor/node-views/CodeBlockView.tsx` implements a working `code_block` NodeView with language selector, CodeMirror editor instance, update/select/stopEvent/destroy hooks, and bidirectional content sync.
- [x] AC-3: `RefinexEditor` registers `nodeViews.code_block` and preserves the existing plugin stack.
- [x] AC-4: Code-block helper behavior (language mapping and exit-path logic at minimum) is covered by focused tests.
- [x] AC-5: `cargo test --manifest-path src-tauri/Cargo.toml`, `npm test`, and `npm run build` pass after integration.

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| CodeMirror packages pull in browser-only behavior that complicates tests | Medium | Keep runtime integration in the NodeView class and test pure helper logic separately |
| Bidirectional sync can recurse between CodeMirror and ProseMirror | High | Guard CM→PM and PM→CM updates with explicit sync flags and compare current text before dispatch |
| Exiting the code block can land the cursor in an invalid position | Medium | Reuse existing trailing-paragraph guarantees and centralize exit-position logic in helper methods |
| Language switching might not reconfigure highlighting cleanly | Medium | Use a CodeMirror `Compartment` so language support can be swapped without recreating the editor |

## Implementation Steps

### Step 1: Install CodeMirror dependencies and scaffold the NodeView module

**Files:** `package.json`, `package-lock.json`, `src/editor/node-views/CodeBlockView.tsx`
**Verification:** Dependency install is applied and the repo still builds/tests cleanly

Status: ✅ Done
Evidence: Installed the requested `@codemirror/*` packages, added `src/editor/node-views/CodeBlockView.tsx`, and reran `npm test` plus `npm run build` successfully after the dependency change.
Deviations: The scaffold and runtime landed in one implementation slice because the NodeView file and its dependencies are tightly coupled.

### Step 2: Implement CodeMirror NodeView runtime and synchronization

**Files:** `src/editor/node-views/CodeBlockView.tsx`
**Verification:** Focused tests and build prove content sync, language switching, and exit helpers

Status: ✅ Done
Evidence: Added language normalization, CodeMirror language `Compartment` reconfiguration, CM→PM content transactions, PM→CM update handling, exit helpers, and focused helper tests in `src/editor/__tests__/code-block-view.test.ts` (5 passing tests).
Deviations: Helper-first tests were used instead of full DOM E2E because the repo's Vitest setup is Node-oriented and the main correctness risks are in state/transaction logic.

### Step 3: Register the NodeView in RefinexEditor and add focused tests

**Files:** `src/editor/RefinexEditor.tsx`, `src/editor/index.ts`, `src/editor/__tests__/code-block-view.test.ts`
**Verification:** Full `npm test`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml` pass

Status: ✅ Done
Evidence: Registered `nodeViews.code_block` in `src/editor/RefinexEditor.tsx`, exported the NodeView surface from `src/editor/index.ts`, added editor styling, and verified the full suite with `npm test` (54/54), `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml`.
Deviations: Styling for the CodeMirror container was added in the same step because registration without visible chrome would leave the NodeView hard to use.

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | `npm install @codemirror/...`; `npm test`; `npm run build` | Scaffold and runtime were merged because the new module is only useful once the CodeMirror state is configured |
| 2 | ✅ | `src/editor/__tests__/code-block-view.test.ts` (5 tests) | Helper-level coverage locked language aliases, content transactions, and exit-path behavior |
| 3 | ✅ | `npm test` (54/54), `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml` | Integrated NodeView registration and visual styling without changing existing plugin order |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| Use helper-first tests instead of DOM NodeView tests | Existing Vitest setup is fast and stable in pure Node, but not configured for heavy browser NodeView interaction tests | Add jsdom/happy-dom just for this task; skip tests entirely | The risk lies in language normalization, PM transaction generation, and exit targeting, which are all testable without a DOM harness |
| Route `Mod-z` / `Mod-y` / `Mod-Shift-z` inside CodeMirror back to ProseMirror history | Once focus is inside CodeMirror, ProseMirror keymaps no longer receive those shortcuts | Add separate CodeMirror history; rely on browser defaults | ProseMirror remains the single source of truth, so forwarding shortcuts preserves cross-editor undo/redo semantics |
| Normalize unknown code languages to `plaintext` in the selector | Existing markdown may contain aliases like `js`, `ts`, `py`, or unknown values | Preserve raw values in the selector; reject unknown values | Alias normalization keeps highlighting predictable while still preserving the original attr until the user changes the language |

## Completion Summary

Completed: 2026-04-13
Duration: 3 steps
All acceptance criteria: PASS

Summary: Added a CodeMirror 6-powered `code_block` NodeView with language switching, syntax highlighting for the requested languages, PM↔CM content synchronization, and exit behavior for `Mod-Enter`, `Escape`, and `ArrowDown` on the last line. `RefinexEditor` now registers the NodeView without disturbing the existing plugin stack, and focused helper tests plus the full repo verification suite all pass.

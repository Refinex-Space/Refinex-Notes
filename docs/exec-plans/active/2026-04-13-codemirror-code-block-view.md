# Execution Plan: CodeMirror Code Block View

Created: 2026-04-13
Status: Active
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

- [ ] AC-1: CodeMirror 6 dependencies are installed and the repo still builds/tests cleanly.
- [ ] AC-2: `src/editor/node-views/CodeBlockView.tsx` implements a working `code_block` NodeView with language selector, CodeMirror editor instance, update/select/stopEvent/destroy hooks, and bidirectional content sync.
- [ ] AC-3: `RefinexEditor` registers `nodeViews.code_block` and preserves the existing plugin stack.
- [ ] AC-4: Code-block helper behavior (language mapping and exit-path logic at minimum) is covered by focused tests.
- [ ] AC-5: `cargo test --manifest-path src-tauri/Cargo.toml`, `npm test`, and `npm run build` pass after integration.

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

Status: ⬜ Not started
Evidence:
Deviations:

### Step 2: Implement CodeMirror NodeView runtime and synchronization

**Files:** `src/editor/node-views/CodeBlockView.tsx`
**Verification:** Focused tests and build prove content sync, language switching, and exit helpers

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: Register the NodeView in RefinexEditor and add focused tests

**Files:** `src/editor/RefinexEditor.tsx`, `src/editor/index.ts`, `src/editor/__tests__/code-block-view.test.ts`
**Verification:** Full `npm test`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml` pass

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ⬜ |  |  |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |

## Completion Summary

Completed:
Duration: 3 steps
All acceptance criteria: PASS / FAIL

Summary:

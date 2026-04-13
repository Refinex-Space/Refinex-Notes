# Execution Plan: Input Rules and Keymap

Created: 2026-04-13
Status: Active
Author: agent

## Objective

Implement editor-core Markdown input rules and keyboard mappings so block shortcuts and formatting/list hotkeys work inside `RefinexEditor` alongside the existing inline-sync behavior.

## Scope

**In scope:**
- `src/editor/plugins/input-rules.ts`
- `src/editor/plugins/keymap.ts`
- `src/editor/RefinexEditor.tsx`
- `src/editor/index.ts`
- `src/editor/__tests__/input-rules-keymap.test.ts`
- `package.json` / lockfile if a missing ProseMirror list-command dependency is required

**Out of scope:**
- Placeholder / trailing-node plugins from Phase 2.3
- Radix-based link editing UI beyond a temporary `prompt()` fallback
- New inline input rules that duplicate existing inline-sync behavior

## Constraints

- Keep editor-core logic in `src/editor/`, not `src/components/editor/`.
- Reuse the existing schema, parser, serializer, and inline-sync plugin rather than creating parallel editor abstractions.
- Preserve compatibility with the current `history()` setup and `applyTransaction(...)` dispatch flow.
- Prefer test-backed behavior for rules and commands; do not rely on manual reasoning alone.

## Acceptance Criteria

- [x] AC-1: `src/editor/plugins/input-rules.ts` exports `refinexInputRules()` and implements block-level rules for headings, blockquote, bullet list, ordered list, code block, horizontal rule, and task-list entry.
- [x] AC-2: `src/editor/plugins/keymap.ts` exports `refinexKeymap()` and binds the requested mark, heading, list, code-block, undo/redo, and select-all shortcuts with `baseKeymap` reserved as fallback.
- [x] AC-3: `RefinexEditor` loads the new plugins in the intended order so `## `, `> `, `- `, Ctrl/Cmd+B/I, Tab/Shift-Tab, Enter, and Backspace are effective in the mounted editor.
- [x] AC-4: Automated tests cover representative input-rule triggers, formatting shortcuts, list indentation/splitting, and list exit behavior.
- [x] AC-5: `cargo test --manifest-path src-tauri/Cargo.toml`, `npm test`, and `npm run build` all pass after integration.

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| List key bindings require APIs not currently declared in dependencies | Medium | Add the minimal ProseMirror list package explicitly and record the change in the plan |
| Task-list input rules may conflict with the current list schema shape | Medium | Build task-list wrapping carefully against `task_list_item` / `bullet_list` and lock behavior with focused tests |
| `prompt()`-based link editing is awkward to test in Node | Medium | Stub `globalThis.prompt` in Vitest and keep the command narrowly scoped |
| Plugin priority might shadow custom commands with `baseKeymap` | Medium | Integrate plugins in the exact planned order and verify the target shortcuts via tests |

## Implementation Steps

### Step 1: Add missing editor command dependency and scaffold plugin modules

**Files:** `package.json`, `package-lock.json`, `src/editor/plugins/input-rules.ts`, `src/editor/plugins/keymap.ts`, `src/editor/index.ts`
**Verification:** Dependency install is applied and the repo still builds/tests cleanly

Status: ✅ Done
Evidence: Added `prosemirror-schema-list` to `package.json` / lockfile, scaffolded `src/editor/plugins/input-rules.ts` and `src/editor/plugins/keymap.ts`, and exported both through `src/editor/index.ts`. Full suite remains green: `cargo test --manifest-path src-tauri/Cargo.toml` passes, `npm test` passes (31/31), `npm run build` passes.
Deviations: None

### Step 2: Implement block-level input rules and cover trigger behavior

**Files:** `src/editor/plugins/input-rules.ts`, `src/editor/__tests__/input-rules-keymap.test.ts`
**Verification:** Focused Vitest cases prove heading, quote, bullet-list, and related rule triggers

Status: ✅ Done
Evidence: Implemented heading, blockquote, bullet-list, ordered-list, code-block, horizontal-rule, and task-list rules in `src/editor/plugins/input-rules.ts`. Added 7 focused input-rule tests in `src/editor/__tests__/input-rules-keymap.test.ts`, and `npm test -- src/editor/__tests__/input-rules-keymap.test.ts` passes (7/7).
Deviations: The horizontal-rule rule inserts a trailing empty paragraph after the `horizontal_rule` node so the caret remains in a valid textblock immediately after the transformation.

### Step 3: Implement custom key bindings for marks and list editing

**Files:** `src/editor/plugins/keymap.ts`, `src/editor/__tests__/input-rules-keymap.test.ts`
**Verification:** Focused Vitest cases prove formatting shortcuts, list indent/outdent, split, and exit behavior

Status: ✅ Done
Evidence: Implemented `src/editor/plugins/keymap.ts` with mark toggles, link prompt command, heading shortcuts, list indentation/splitting/exit commands, and undo/redo/select-all bindings. Expanded `src/editor/__tests__/input-rules-keymap.test.ts` to 14 cases, and `npm test -- src/editor/__tests__/input-rules-keymap.test.ts` passes (14/14).
Deviations: Exported `createRefinexKeyBindings()` alongside `refinexKeymap()` so tests can exercise the exact binding map deterministically without depending on fragile mocked `KeyboardEvent` behavior.

### Step 4: Integrate the plugins into RefinexEditor and run full verification

**Files:** `src/editor/RefinexEditor.tsx`, `src/editor/index.ts`
**Verification:** Full `cargo test --manifest-path src-tauri/Cargo.toml`, `npm test`, and `npm run build` pass

Status: ✅ Done
Evidence: Updated `src/editor/RefinexEditor.tsx` to load `refinexKeymap()`, `keymap(baseKeymap)`, `refinexInputRules()`, `inlineSyncPlugin(...)`, `history()`, `dropCursor()`, and `gapCursor()` in the planned order. Full verification passes: `cargo test --manifest-path src-tauri/Cargo.toml` (0 tests, pass), `npm test` (45/45 pass), `npm run build` (pass).
Deviations: None

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | `cargo test` pass; `npm test` 31/31 pass; `npm run build` pass | Added `prosemirror-schema-list` for list commands before implementing key bindings |
| 2 | ✅ | `npm test -- src/editor/__tests__/input-rules-keymap.test.ts` → 7/7 pass | Added custom transaction rules for task list and horizontal rule |
| 3 | ✅ | `npm test -- src/editor/__tests__/input-rules-keymap.test.ts` → 14/14 pass | Added direct binding-map coverage for mark, list, and history shortcuts |
| 4 | ✅ | `cargo test` pass; `npm test` 45/45 pass; `npm run build` pass | `RefinexEditor` now mounts custom keymap + input rules ahead of inline-sync/history |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| Add `prosemirror-schema-list` explicitly | List indentation/splitting commands are required for the requested keymap, but the package was not declared directly in the repo | Reimplement list commands manually; depend on a transitive package | The official package provides the requested commands with less risk and clearer ownership in `package.json` |
| Insert a trailing paragraph after the horizontal-rule input rule | Replacing an empty paragraph with only `horizontal_rule` leaves no obvious text cursor landing point for continued editing | Replace with only `horizontal_rule`; defer cursor recovery to a future trailing-node plugin | Keeping an empty paragraph after the rule preserves immediate typing flow without waiting for Phase 2.3 |
| Export `createRefinexKeyBindings()` in addition to `refinexKeymap()` | Keymap behavior needed stable command-level tests that still assert the intended key strings | Test only through mocked `handleKeyDown`; avoid any extra export | A thin exported binding map keeps runtime behavior unchanged while making the shortcut contract explicit and testable |
| Keep inline input rules omitted in this phase | Inline formatting is already handled by the existing paragraph-scoped inline-sync plugin, and duplicate input rules would compete for the same syntax closures | Add inline emphasis/code/link input rules as fallback now | Deferring inline rules avoids double transforms and keeps Phase 2.2 focused on block shortcuts and key bindings |

## Completion Summary

Completed: 2026-04-13
Duration: 4 steps
All acceptance criteria: PASS

Summary: Implemented `src/editor/plugins/input-rules.ts` with block-level Markdown triggers for headings, blockquote, bullet/ordered lists, code blocks, horizontal rules, and task-list entry; implemented `src/editor/plugins/keymap.ts` with formatting, heading, list, code-block, history, and select-all bindings; and integrated both into `RefinexEditor` in front of inline-sync/history according to the planned plugin order. Added `src/editor/__tests__/input-rules-keymap.test.ts` with 14 focused cases, bringing the editor test suite to 45 passing tests across round-trip, inline-sync, input-rule, and keymap behavior.

# Execution Plan: Editor Rich UI Surfaces

Created: 2026-04-13
Status: Active
Author: agent

## Objective

Implement the Phase 3 rich editor surfaces so RefinexEditor supports an image NodeView, floating formatting toolbar, slash command menu, and structured link popover instead of prompt-based link editing.

## Scope

**In scope:**
- `src/editor/node-views/ImageView.tsx`
- `src/editor/ui/FloatingToolbar.tsx`
- `src/editor/ui/SlashMenu.tsx`
- `src/editor/ui/LinkPopover.tsx`
- `src/editor/RefinexEditor.tsx`
- Supporting editor plugins/helpers/tests/styles/exports and any schema/parser/serializer adjustments required to make images behave as block-level figures

**Out of scope:**
- Native image upload/storage infrastructure
- Advanced image resize/crop workflows
- Full table editing UX beyond default slash insertion
- Broader application-shell/layout work outside the editor

## Constraints

- Keep editor-core document semantics, plugins, commands, and NodeViews under `src/editor/`; do not move editor behavior into unrelated React shells.
- Reuse the existing Radix/cmdk wrappers under `src/components/ui/` instead of introducing parallel primitive wrappers.
- Preserve the existing inline-sync, input-rules, keymap, placeholder, trailing-node, and CodeMirror code-block behavior unless this task explicitly replaces it (for example `Mod-k`).
- Frontend-only image insert/replace behavior must stay on the browser side and must not invent new Tauri/native seams.

## Acceptance Criteria

- [ ] AC-1: Images render through a custom NodeView with selectable chrome, alignment actions, replace/delete controls, and editor drop support for image files.
- [ ] AC-2: A floating toolbar appears for non-empty text selections, reflects active marks, and toggles strong/em/strikethrough/code/link formatting.
- [ ] AC-3: Pressing `Mod-k` (`Ctrl+K` on Windows/Linux, `Command+K` on macOS) opens a link popover with URL/title fields and applies or updates the link mark on confirmation.
- [ ] AC-4: Typing `/` in an empty paragraph opens a slash menu with the requested command set, filtering, keyboard navigation, and executable block transformations.
- [ ] AC-5: Focused tests cover the core helper/command logic for the new UI surfaces, and `npm test`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml` pass after integration.

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Image requirements imply block-style `<figure>` rendering while the current schema models images as inline atoms | High | Update schema/parser/serializer as part of the task and keep the new block behavior explicit in tests and plan notes |
| React overlays can drift out of sync with ProseMirror selection state | High | Keep `RefinexEditor` as the single owner of `EditorView`, derive overlay state from editor updates, and test the core selection/command helpers separately |
| Slash menu behavior can conflict with existing input rules and keymaps | Medium | Detect slash-open state in a dedicated plugin keyed off empty-paragraph `/` input, then delete the trigger token before running a block command |
| Link popover and toolbar both touching link commands can diverge | Medium | Centralize link mark range/apply helpers and reuse them from both `Mod-k` and toolbar actions |

## Implementation Steps

### Step 1: Rework image semantics and NodeView plumbing

**Files:** `src/editor/schema.ts`, `src/editor/parser.ts`, `src/editor/serializer.ts`, `src/editor/node-views/ImageView.tsx`, `src/editor/RefinexEditor.tsx`
**Verification:** Focused tests prove image block structure/helpers, and the editor build still passes with the new node shape

Status: ⬜ Not started
Evidence:
Deviations:

### Step 2: Add selection-driven formatting UI and link editing

**Files:** `src/editor/ui/FloatingToolbar.tsx`, `src/editor/ui/LinkPopover.tsx`, `src/editor/plugins/keymap.ts`, supporting helpers/tests
**Verification:** Focused tests prove mark state/apply logic and `Mod-k` no longer depends on `prompt()`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: Add slash command state, menu UI, and command execution

**Files:** `src/editor/ui/SlashMenu.tsx`, slash plugin/helper files, `src/editor/RefinexEditor.tsx`, supporting tests
**Verification:** Focused tests prove slash detection/filtering/command execution and the new UI compiles

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: Integrate overlays, styles, exports, and full verification

**Files:** `src/editor/RefinexEditor.tsx`, `src/editor/editor.css`, `src/editor/index.ts`, tests, harness docs if needed
**Verification:** `npm test`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml` all pass

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ⬜ |  |  |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |
| 4 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |

## Completion Summary

Completed:
Duration: 4 steps
All acceptance criteria: PASS / FAIL

Summary:

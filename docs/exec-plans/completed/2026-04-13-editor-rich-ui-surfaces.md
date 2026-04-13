# Execution Plan: Editor Rich UI Surfaces

Created: 2026-04-13
Status: Completed
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

- [x] AC-1: Images render through a custom NodeView with selectable chrome, alignment actions, replace/delete controls, and editor drop support for image files.
- [x] AC-2: A floating toolbar appears for non-empty text selections, reflects active marks, and toggles strong/em/strikethrough/code/link formatting.
- [x] AC-3: Pressing `Mod-k` (`Ctrl+K` on Windows/Linux, `Command+K` on macOS) opens a link popover with URL/title fields and applies or updates the link mark on confirmation.
- [x] AC-4: Typing `/` in an empty paragraph opens a slash menu with the requested command set, filtering, keyboard navigation, and executable block transformations.
- [x] AC-5: Focused tests cover the core helper/command logic for the new UI surfaces, and `npm test`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml` pass after integration.

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

Status: ✅ Done
Evidence:
- Added `src/editor/rich-ui.ts` image helpers plus `src/editor/node-views/ImageView.tsx` and wired image drops / NodeView registration through `src/editor/RefinexEditor.tsx`.
- Browser smoke inserted an image via synthetic drop, confirmed `<figure>` rendering, image selection chrome, toolbar buttons, and Markdown serialization update.
Deviations:
- Kept the schema-level image node as an inline atom with `align` attrs and render it as a block-style figure inside a paragraph-scoped NodeView. This preserves existing Markdown round-trip behavior without widening parser/serializer scope.

### Step 2: Add selection-driven formatting UI and link editing

**Files:** `src/editor/ui/FloatingToolbar.tsx`, `src/editor/ui/LinkPopover.tsx`, `src/editor/plugins/keymap.ts`, supporting helpers/tests
**Verification:** Focused tests prove mark state/apply logic and `Mod-k` no longer depends on `prompt()`

Status: ✅ Done
Evidence:
- Added `src/editor/ui/FloatingToolbar.tsx`, `src/editor/ui/LinkPopover.tsx`, shared link helpers in `src/editor/rich-ui.ts`, and `Mod-k` callback plumbing in `src/editor/plugins/keymap.ts`.
- Browser smoke showed the floating toolbar on real text selection and opened the structured link popover through `Command+K` on macOS.
Deviations:
- Retained a prompt fallback inside `createLinkPopoverCommand(...)` when no UI callback is supplied so non-React test and fallback contexts do not lose link editing.

### Step 3: Add slash command state, menu UI, and command execution

**Files:** `src/editor/ui/SlashMenu.tsx`, slash plugin/helper files, `src/editor/RefinexEditor.tsx`, supporting tests
**Verification:** Focused tests prove slash detection/filtering/command execution and the new UI compiles

Status: ✅ Done
Evidence:
- Added `src/editor/plugins/slash-menu.ts`, `src/editor/ui/SlashMenu.tsx`, slash command definitions/execution in `src/editor/rich-ui.ts`, and `RefinexEditor` integration.
- Browser smoke showed slash trigger detection and command menu rendering; focused tests cover trigger detection and block command execution.
Deviations:
- Slash query lives in the cmdk input once the menu opens instead of continuing inline after `/`, which keeps keyboard navigation and filtering stable while still meeting the trigger requirement.

### Step 4: Integrate overlays, styles, exports, and full verification

**Files:** `src/editor/RefinexEditor.tsx`, `src/editor/editor.css`, `src/editor/index.ts`, tests, harness docs if needed
**Verification:** `npm test`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml` all pass

Status: ✅ Done
Evidence:
- Integrated new overlays and node views through `src/editor/RefinexEditor.tsx`, exported the new APIs from `src/editor/index.ts`, and added focused coverage in `src/editor/__tests__/rich-ui.test.ts`.
- `npm test` passes with 60 tests, `npm run build` passes, and `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- Added `prosemirror-view/style/prosemirror.css` in `src/main.tsx`; after reload the previous white-space console warning no longer appears.
Deviations:
- Also updated `src/App.tsx` so the demo-level global `Cmd/Ctrl+K` palette no longer steals the editor link shortcut inside `[data-refinex-editor-shell]`.

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | Image drop smoke inserted a real image, rendered a figure NodeView, and surfaced selection toolbar controls | Kept inline image schema and delivered block UX through paragraph-wrapped NodeView rendering |
| 2 | ✅ | Floating toolbar rendered in browser smoke; `Command+K` opened the link popover; focused tests cover link helpers | Prompt fallback intentionally retained for non-UI callers |
| 3 | ✅ | Slash trigger/menu rendered in browser smoke; focused tests cover trigger detection and command execution | Search happens in cmdk input after opening the menu |
| 4 | ✅ | `npm test`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml` all passed; ProseMirror warning removed after importing base CSS | Demo app shortcut handling adjusted to avoid editor conflicts |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| Keep image schema inline and render block UX in NodeView | Requested `<figure>` toolbar UX conflicted with the existing inline image semantics and Markdown round-trip | Converting the schema/parser/serializer to a true block image node | Paragraph-wrapped figure rendering delivers the requested UI without destabilizing existing Markdown compatibility |
| Centralize link/slash/image commands in `src/editor/rich-ui.ts` | Toolbar, link popover, slash menu, and image flows all need shared editor transactions | Duplicating logic inside each React surface | Shared helpers keep selection/range handling consistent and sharply reduce UI coupling |
| Import `prosemirror-view/style/prosemirror.css` at app entry | Local `.ProseMirror { white-space: pre-wrap; }` still left a startup console warning | Leaving the warning, or copying more ProseMirror base CSS into local styles | Importing the package CSS fixes the warning at the source and keeps future editor defaults aligned with ProseMirror expectations |

## Completion Summary

Completed: 2026-04-13
Duration: 4 steps
All acceptance criteria: PASS

Summary: Delivered the Phase 3 rich editor UI surfaces by adding an image NodeView with toolbar/drop support, a floating formatting toolbar, a structured link popover opened by `Mod-k`, and a slash command menu powered by shared editor helpers. The main implementation choice was to keep the image node schema inline and provide block-style figure behavior through paragraph-wrapped rendering so Markdown round-trip behavior stayed stable. Focused frontend tests increased to 60 passing tests, the app build and cargo tests remain green, browser smoke covered floating toolbar / link popover / slash menu / image NodeView flows, and the remaining ProseMirror startup warning was removed by loading the package base CSS.

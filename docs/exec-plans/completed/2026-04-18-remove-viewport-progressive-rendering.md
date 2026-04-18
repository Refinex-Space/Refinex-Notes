# Execution Plan: Remove Viewport Progressive Rendering

Created: 2026-04-18
Status: Active
Author: agent

## Objective

Eliminate the editor's scroll-driven progressive block hydration so the document is fully rendered the moment the loading overlay closes, removing the jitter and layout-shift caused by shell↔live node-view swaps, while keeping (or improving) document open/switch latency.

## Scope

**In scope:**

- `src/editor/RefinexEditor.tsx` — remove `viewportBlocksPlugin()` from plugin list and remove all `Viewport*` entries from `nodeViews` (mount + readOnly `setProps`)
- `src/editor/plugins/viewport-blocks.ts` — delete
- `src/editor/node-views/ViewportTextBlockView.ts` — delete
- `src/editor/node-views/ViewportContainerBlockView.ts` — delete
- `src/editor/node-views/ViewportTableRowView.ts` — delete
- `src/editor/node-views/ViewportTableCellView.ts` — delete
- `src/editor/index.ts` — drop viewport-* re-exports
- `src/editor/editor.css` — remove all `.refinex-viewport-*` rules
- `src/editor/__tests__/viewport-blocks.test.ts` — delete
- `src/AGENTS.md`, `docs/ARCHITECTURE.md` — only if they reference viewport progressive rendering

**Out of scope:**

- `CodeBlockView` and `ImageView` (kept; legitimate custom node views)
- Loading overlay UI (`LoadingEditorState` in `src/App.tsx`) — already correct
- Editor state / parsed-doc caches in `RefinexEditor.tsx` — kept; they help switch latency
- The pre-existing PLANS.md drift (two completed plans listed under "Active Plans")

## Constraints

From root + module AGENTS.md:

- Editor model/schema lives in `src/editor/`; React shells in `src/components/editor/` consume that core. (No change to schema or shells in this plan.)
- Native concerns stay in `src-tauri/`; this is a frontend-only refactor.
- Reuse existing folders; do not introduce new abstractions.

The schema (`src/editor/schema.ts`) already provides `toDOM` for paragraph, heading, blockquote, ordered_list, bullet_list, list_item, task_list_item, table, table_row, table_cell. Removing the viewport node views lets ProseMirror render natively via these existing specs.

## Acceptance Criteria

- [x] AC-1: `viewportBlocksPlugin`, `refinexViewportBlocksKey`, and all `Viewport*` node-view files are deleted from `src/editor/`.
- [x] AC-2: After mount, the editor DOM contains no `[data-refinex-viewport-block]`, `.refinex-viewport-block-shell`, `.refinex-viewport-container-shell`, `.refinex-viewport-table-row-shell`, or `.refinex-viewport-table-cell-shell` elements (verified by grep over editor source — no remaining selector references).
- [x] AC-3: `editor/index.ts` no longer re-exports any viewport-* symbol; build succeeds.
- [x] AC-4: `npm test -- --run` passes (baseline 149 → 142 after removing the 7 viewport-block tests).
- [x] AC-5: `cargo test --manifest-path src-tauri/Cargo.toml` stays green at 36.
- [x] AC-6: `npm run build` succeeds.

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Schema `toDOM` missing for some block we used to override → broken render | Low | Audited `schema.ts`: all relevant block specs have `toDOM`. ProseMirror falls back to schema rendering when no nodeView is registered. |
| Large-doc initial render becomes slower (no shells) | Med | This is the intent; rely on existing parsed-doc + EditorState caches. Verify perf logs after change. |
| Removed exports break a hidden consumer | Low | Grep confirms only `editor/index.ts` and the deleted test consume the viewport surface. |
| Outline / word-count regress | Low | App uses `countWords(content)` (string-based) and outline derived elsewhere; `countViewportWords`/`collectViewportHeadingItems` were exported but unused. |

## Implementation Steps

### Step 1: Drop viewport plugin + node views from `RefinexEditor.tsx`

**Files:** `src/editor/RefinexEditor.tsx`
**Verification:** TypeScript compile (later step) succeeds; no runtime imports left to deleted files after Step 2.

Status: ⬜ Not started

### Step 2: Delete viewport plugin + node-view files; clean re-exports

**Files:** `src/editor/plugins/viewport-blocks.ts` (delete), `src/editor/node-views/ViewportTextBlockView.ts` (delete), `src/editor/node-views/ViewportContainerBlockView.ts` (delete), `src/editor/node-views/ViewportTableRowView.ts` (delete), `src/editor/node-views/ViewportTableCellView.ts` (delete), `src/editor/index.ts` (remove re-exports)
**Verification:** `npm run build` (later) compiles without missing-module errors.

Status: ⬜ Not started

### Step 3: Remove viewport CSS rules

**Files:** `src/editor/editor.css`
**Verification:** No remaining `.refinex-viewport-*` selector in the file.

Status: ⬜ Not started

### Step 4: Delete the viewport-blocks test file

**Files:** `src/editor/__tests__/viewport-blocks.test.ts`
**Verification:** `npm test -- --run` passes with 23 test files instead of 24.

Status: ⬜ Not started

### Step 5: Full verification

**Files:** none
**Verification:** Run `npm test -- --run`, `cargo test --manifest-path src-tauri/Cargo.toml`, `npm run build` — all green.

Status: ⬜ Not started

### Step 6: Control plane sweep

**Files:** `src/AGENTS.md`, `docs/ARCHITECTURE.md` (read-only check; edit only if they reference viewport progressive rendering)
**Verification:** No surviving prose claiming progressive viewport hydration.

Status: ⬜ Not started

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1    | ✅     | RefinexEditor.tsx no longer imports viewport plugin or `Viewport*` views; nodeViews map keeps only `code_block` and `image`. | mount + readOnly setProps both updated |
| 2    | ✅     | 5 source files removed via `git rm`; `editor/index.ts` no longer re-exports viewport symbols. |  |
| 3    | ✅     | `grep -r refinex-viewport src/` returns 0 matches in CSS. |  |
| 4    | ✅     | `src/editor/__tests__/viewport-blocks.test.ts` removed via `git rm`. |  |
| 5    | ✅     | `npm test -- --run`: 142 pass / 0 fail / 23 files. `cargo test`: 36 pass. `npm run build`: success (2172 modules transformed in 3.11s). |  |
| 6    | ✅     | No surviving viewport-progressive-rendering claims in root AGENTS.md, src/AGENTS.md, docs/ARCHITECTURE.md, or harness-manifest.md. |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| Full removal vs. configurable disable flag | Viewport progressive rendering causes the reported jitter and is not consumed by other code paths | Keep behind a feature flag for opt-in | User explicitly authorized destructive refactor; no current product surface depends on the progressive code path. Dead optionality has a maintenance cost. |
| Rely on schema `toDOM` | All relevant block types have `toDOM` already | Ship a minimal pass-through node view per type | ProseMirror's default rendering from `toDOM` is the simpler, more correct path. |
| Inline-fix pre-existing TS error in `find-replace.test.ts:226` | `npm run build` (a verify-gate command per OBSERVABILITY.md) was already broken on HEAD due to a stale cast on `Decoration.type`. Discovered during Step 5 verification because the original Step 1 baseline only ran `npm test`. | Skip build verification and log only as tech debt | The harness-feat skill mandates `npm run build` as part of post-implementation verification. Without the fix, AC-6 could not be evaluated. The fix is a single-line cast adjustment, fully isolated from the viewport refactor, and has been registered as TD-003 so the broader pattern is tracked. |

## Deviations

- **Step 5 surfaced a pre-existing build break** in `src/editor/__tests__/find-replace.test.ts:226` (`Decoration.type` accessed via stale cast). Repaired in-scope as a one-line cast adjustment so AC-6 could be verified; the broader pattern is logged as TD-003 in `docs/exec-plans/tech-debt-tracker.md`.

## Completion Summary

Completed: 2026-04-18
Duration: 6 steps
All acceptance criteria: PASS

Summary: Deleted the entire scroll-driven viewport progressive-rendering subsystem from the editor (`viewportBlocksPlugin`, `ViewportTextBlockView`, `ViewportContainerBlockView`, `ViewportTableRowView`, `ViewportTableCellView`, all `.refinex-viewport-*` CSS, the dedicated test, and all re-exports). The editor now relies on ProseMirror's native rendering via `schema.toDOM` for all block types, keeping only the genuine `CodeBlockView` and `ImageView` custom node views. The result: when the loading overlay closes, the document is fully rendered with no shell→live swaps and no scroll-driven layout shifts. As a one-step in-scope deviation, fixed a pre-existing TS error in `find-replace.test.ts:226` that was blocking `npm run build`; logged the broader pattern as TD-003. Final verification: 142/142 frontend tests, 36/36 native tests, build clean.

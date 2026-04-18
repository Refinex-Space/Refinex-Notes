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

- [ ] AC-1: `viewportBlocksPlugin`, `refinexViewportBlocksKey`, and all `Viewport*` node-view files are deleted from `src/editor/`.
- [ ] AC-2: After mount, the editor DOM contains no `[data-refinex-viewport-block]`, `.refinex-viewport-block-shell`, `.refinex-viewport-container-shell`, `.refinex-viewport-table-row-shell`, or `.refinex-viewport-table-cell-shell` elements (verified by grep over editor source — no remaining selector references).
- [ ] AC-3: `editor/index.ts` no longer re-exports any viewport-* symbol; build succeeds.
- [ ] AC-4: `npm test -- --run` passes (baseline 149 → expected ≥143 after removing ~6 viewport-block tests).
- [ ] AC-5: `cargo test --manifest-path src-tauri/Cargo.toml` stays green at 36.
- [ ] AC-6: `npm run build` succeeds.

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
| 1    | ⬜     |          |       |
| 2    | ⬜     |          |       |
| 3    | ⬜     |          |       |
| 4    | ⬜     |          |       |
| 5    | ⬜     |          |       |
| 6    | ⬜     |          |       |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| Full removal vs. configurable disable flag | Viewport progressive rendering causes the reported jitter and is not consumed by other code paths | Keep behind a feature flag for opt-in | User explicitly authorized destructive refactor; no current product surface depends on the progressive code path. Dead optionality has a maintenance cost. |
| Rely on schema `toDOM` | All relevant block types have `toDOM` already | Ship a minimal pass-through node view per type | ProseMirror's default rendering from `toDOM` is the simpler, more correct path. |

## Completion Summary

<!-- Filled during archival -->

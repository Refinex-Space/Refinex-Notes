# Execution Plan: App Shell File Tree Tabs

Created: 2026-04-13
Status: Active
Author: agent

## Objective

Replace the temporary Phase 0.2 demo surface with the first real Refinex-Notes workspace shell: three-column layout, file tree, tab bar, outline, status bar, and global command palette wired around the existing editor with mock workspace state.

## Scope

**In scope:**
- `src/App.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/components/layout/StatusBar.tsx`
- `src/components/sidebar/FileTree.tsx`
- `src/components/sidebar/OutlinePanel.tsx`
- `src/components/editor/TabBar.tsx`
- `src/components/CommandPalette.tsx`
- Supporting store/type/mock-data/editor-bridge updates required to make file opening, tab switching, outline extraction, cursor status, and command palette actions work end to end
- Shared Radix wrapper work in `src/components/ui/` when required because the current `tabs` / `collapsible` / `context-menu` shims are placeholders

**Out of scope:**
- Rust/Tauri file I/O or watcher integration
- Real Git state, real search indexing, or AI/Git side-panel business logic
- Persistent file system mutations beyond mock frontend state
- Drag-reorder for tabs and advanced resize persistence

## Constraints

- Keep editor-core semantics in `src/editor/`; the new shell in `src/components/` must consume `RefinexEditor` rather than re-implement editor behavior.
- Reuse and complete `src/components/ui/` wrappers instead of importing raw Radix primitives directly into every domain component.
- Keep native/runtime behavior out of the React shell; this phase may use mock workspace data and frontend-only actions.
- Update Harness docs if the runtime shape changes enough that `docs/ARCHITECTURE.md` or module guidance would otherwise become stale.

## Acceptance Criteria

- [ ] AC-1: `AppLayout` renders a three-column shell with draggable/collapsible side panels, a draggable title region, a central editor area, and a persistent status bar.
- [ ] AC-2: `FileTree` renders collapsible mock folders/files with context menu actions, current-file highlighting, git-status color markers, and clicking a Markdown file opens it through `noteStore.openFile()`.
- [ ] AC-3: `TabBar` reflects `noteStore.openFiles`, supports switching/closing tabs, shows unsaved markers, and keeps the editor content in sync with the active file.
- [ ] AC-4: `OutlinePanel` derives heading structure from the active document, shows correct depth indentation, and triggers editor navigation when a heading is clicked.
- [ ] AC-5: `StatusBar` and `CommandPalette` show working shell state: sync status text/icon, cursor line/column, word count, language, and Cmd/Ctrl+K file/command search over mock workspace entries.
- [ ] AC-6: `npm test`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml` pass after integration, and the Harness docs reflect the new runtime shell.

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Existing UI wrappers are placeholders, so shell work can sprawl into primitive plumbing | High | Contain wrapper completion to only the primitives this shell actually uses and document the decision in the plan |
| The editor currently exposes markdown value changes but not all shell telemetry needed for outline/cursor syncing | High | Add a thin editor bridge prop surface rather than moving editor-core logic into `src/components/` |
| Replacing `App.tsx` can accidentally regress the earlier demo-only command palette and theme affordances | Medium | Fold the useful theme/command affordances into the new shell instead of deleting them blindly |
| Mock workspace state can diverge from future Tauri-backed file behavior | Medium | Keep all mock data and actions explicitly local to stores/types so later IPC wiring can replace them cleanly |

## Implementation Steps

### Step 1: Establish workspace state and shell models

**Files:** `src/stores/noteStore.ts`, `src/stores/editorStore.ts`, `src/types/notes.ts`, `src/types/editor.ts`, `src/types/app-shell.ts`
**Verification:** Focused tests prove file open/close, active tab, dirty state, and derived shell metadata behave correctly with mock workspace data

Status: ✅ Done
Evidence:
- Implemented mock workspace documents/folders plus working `noteStore` actions for open/close/create/createFolder/delete/rename/refresh/update-content flows.
- Replaced the placeholder `editorStore` actions with working active-tab, dirty-state, and cursor-position state updates.
- Added focused store tests in `src/stores/__tests__/workspace-state.test.ts`; `npm test` now passes with 65 tests.
Deviations:
- `src/types/index.ts` was updated in this step as a supporting export surface so the new shell/store models can be consumed cleanly by later components and tests.

### Step 2: Complete shared shell primitives and frame layout

**Files:** `src/components/ui/tabs.tsx`, `src/components/ui/collapsible.tsx`, `src/components/ui/context-menu.tsx`, `src/components/ui/accordion.tsx`, `src/components/layout/AppLayout.tsx`, `src/components/layout/StatusBar.tsx`
**Verification:** The app builds with real Radix wrappers and renders the three-column shell frame with collapsible panels

Status: ✅ Done
Evidence:
- Replaced the placeholder `tabs`, `collapsible`, and `context-menu` wrappers with real Radix-based primitives, and added a new shared `accordion` wrapper in `src/components/ui/accordion.tsx`.
- Added `src/components/layout/AppLayout.tsx` with draggable side-panel resizing, collapsible left/right panels, a draggable title region, and a center workspace column.
- Added `src/components/layout/StatusBar.tsx`; `npm test` and `npm run build` both pass after these shell-frame additions.
Deviations:
- Step 2 introduced a new shared wrapper file `src/components/ui/accordion.tsx` because the repo had no existing accordion abstraction to satisfy the file-tree requirement while still following the “reuse `src/components/ui/` wrappers” constraint.

### Step 3: Implement file navigation surfaces

**Files:** `src/components/sidebar/FileTree.tsx`, `src/components/sidebar/OutlinePanel.tsx`, supporting shell helpers/tests
**Verification:** Focused tests cover file tree rendering/actions and outline extraction/indentation against representative markdown documents

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: Integrate tabbed editor workspace and command palette

**Files:** `src/components/editor/TabBar.tsx`, `src/components/CommandPalette.tsx`, `src/App.tsx`, `src/editor/RefinexEditor.tsx`, supporting tests
**Verification:** Browser-visible shell wiring compiles and focused tests cover tab switching, command palette filtering, and editor-driven status updates

Status: ⬜ Not started
Evidence:
Deviations:

### Step 5: Verify runtime shell and update control plane

**Files:** `docs/ARCHITECTURE.md`, `src/AGENTS.md`, `docs/PLANS.md`, `docs/exec-plans/active/2026-04-13-app-shell-file-tree-tabs.md`
**Verification:** `npm test`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml` all pass, and control-plane docs no longer describe `src/App.tsx` as only a Phase 0.2 verification page

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | `npm test` passes with 65 tests including new workspace store coverage | `editorStore` moved off immer so `Set`-based dirty tracking does not require global `enableMapSet()` |
| 2 | ✅ | `npm test` passes with 65 tests and `npm run build` passes after real Radix shell wrappers/layout landed | Added a new shared accordion wrapper because no repo-local abstraction existed yet |
| 3 | ⬜ |  |  |
| 4 | ⬜ |  |  |
| 5 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| Keep mock workspace state inside stores rather than a separate service seam for this step | Phase 4.1 needs a complete frontend-only loop before Rust file APIs exist | Adding a temporary mock service layer under `src/services/` | The stores are the current source of truth for shell state, and keeping the mock data there keeps the future replacement boundary obvious |
| Move `editorStore` off `zustand/immer` | Dirty-state tracking uses `Set`, and immer requires global `enableMapSet()` to proxy it safely | Enabling MapSet globally, or changing dirty tracking to arrays | Plain Zustand updates avoid a global side effect and keep `Set` semantics intact for the shell |
| Add a repo-local accordion wrapper before implementing FileTree | The shell constraint requires domain components to reuse `src/components/ui/` primitives, but only a placeholder-free accordion dependency existed | Importing raw `@radix-ui/react-accordion` only inside `FileTree` | Creating the shared wrapper once keeps sidebar components consistent with the existing dialog/popover/command wrapper pattern |

## Completion Summary

Completed:
Duration: 5 steps
All acceptance criteria: PASS / FAIL

Summary:

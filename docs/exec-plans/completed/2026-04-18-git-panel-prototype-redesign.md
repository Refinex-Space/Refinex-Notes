# Git Panel Prototype Redesign

## Header

**Objective:** Redesign the right-panel Git UI to match the `refinex-notes-prototype.html` design 1:1 — two-tab layout ("变更 N" / "历史"), staged/unstaged file groups, commit textarea + commit + push buttons, commit history list — with real Git capabilities wired throughout.

**Scope:**
- `src-tauri/src/git/mod.rs` — add public `get_branch` function
- `src-tauri/src/commands/git.rs` — add `git_get_branch` Tauri command
- `src-tauri/src/lib.rs` — register `git_get_branch`
- `src/services/gitService.ts` — add `getBranch` method
- `src/stores/gitStore.ts` — add `currentBranch` state + `fetchBranch` action
- `src/components/git/GitPanel.tsx` — NEW: unified panel component
- `src/App.tsx` — update `RightPanelContent` to use `GitPanel`

**Non-scope:**
- Individual file stage/unstage UI (prototype shows file list display only; commit uses stage_all)
- AI panel or other right-panel modes
- Settings dialog redesign
- Existing GitOverviewPanel / HistoryPanel / SetupPanel components (kept as-is, tests must stay green)

**Constraints from AGENTS.md:**
- Native Git capability belongs in `src-tauri/src/commands/` and `src-tauri/src/git/`
- Frontend reads Git state through `gitService.ts` → `gitStore.ts`
- Components consume stores/services, not raw Tauri invoke calls
- Reuse existing domain files; no new top-level structure

---

## Acceptance Criteria

1. **Branch display**: Git panel header shows current branch name badge fetched from native backend; falls back to "—" when repo not initialized or branch unavailable.
2. **Changes tab**: Staged file group and unstaged file group each show file path + status badge (color-coded). Empty state shown when no changes.
3. **Commit workflow**: Commit textarea + "提交" button; disabled when message is empty or no changed files; calls `gitStore.commit()` on submit.
4. **Push button**: Sync icon button next to commit triggers `gitStore.push()`.
5. **History tab**: Flat list of repo commits showing short hash (monospace), message, relative time. Fetches on tab activation.
6. **Tab counts**: "变更 (N)" badge reflects live `changedFiles.length`.
7. **Setup state preserved**: When `syncStatus === "not-initialized"`, SetupPanel is still shown instead of GitPanel.
8. **Tests**: All 148 baseline tests continue to pass after changes.
9. **Build**: `npm run build` exits 0.

---

## Implementation Steps

### Step 1: Add `get_branch` to Rust backend

Files: `src-tauri/src/git/mod.rs`, `src-tauri/src/commands/git.rs`, `src-tauri/src/lib.rs`

- `git/mod.rs`: add `pub fn get_branch(path: &str) -> GitResult<String>` that opens repo and calls private `current_branch_name`
- `commands/git.rs`: add `#[tauri::command] pub fn git_get_branch(path: String) -> Result<String, String>`
- `lib.rs`: add `commands::git::git_get_branch` to invoke_handler list

Verification: `cargo test --manifest-path src-tauri/Cargo.toml` exits 0.

### Step 2: Add `getBranch` to gitService and gitStore

Files: `src/services/gitService.ts`, `src/stores/gitStore.ts`

- `gitService.ts`: add `getBranch(path: string): Promise<string>` calling `invoke("git_get_branch", { path })`
- `gitStore.ts`: add `currentBranch: string | null` to `GitStoreState` and `GitStoreActions`; add `fetchBranch()` action that calls `gitService.getBranch(workspacePath)` and sets `state.currentBranch`; call `fetchBranch()` at end of `refreshStatus` (only when status succeeds)

Verification: `npm test -- --run` exits 0 (148 tests still pass).

### Step 3: Create `GitPanel.tsx`

File: `src/components/git/GitPanel.tsx` (NEW)

Design spec (matching prototype GP component):
- Container: `flex flex-col h-full min-h-0`
- Section 1 — tabs row: two tab buttons "变更 (N)" and "历史", underline-active style matching prototype
- Section 2 — scrollable tab content (flex-1 overflow-auto)
  - **Changes tab:**
    - Staged section header "已暂存 (N)" if staged count > 0
    - File list: file icon, filename (truncated), status badge (green=added, amber=modified, rose=deleted)
    - Unstaged section header "未暂存 (N)" if unstaged count > 0
    - File list same style
    - Empty state: "当前工作区没有待处理变更" centered text
  - **History tab:**
    - On activate: call `getRepoHistory()`
    - List of commits: message (font-medium text-fg), hash (monospace text-muted/60 text-xs) + relative time on same row

- Section 3 — commit area (Changes tab only, sticks to bottom):
  - Textarea for commit message (placeholder "提交信息...")
  - Two buttons row: "提交" button (flex-1, accent bg) + sync icon button
  - Disabled state when message empty or no changed files or isRunningAction
  - Commit calls `gitStore.commit(message)` then clears textarea
  - Sync calls `gitStore.push()`

- Branch badge in panel: show `currentBranch` as a small badge next to tab section header area or in a sub-header

Verification: `npm test -- --run` exits 0.

### Step 4: Update `RightPanelContent` in App.tsx

File: `src/App.tsx`

- Import `GitPanel` from `./components/git/GitPanel`
- In `RightPanelContent`, replace the 4-way condition:
  - Keep: when `!workspacePath` → `<GitEmptyState />`
  - Keep: when `showSetup` → `<SetupPanel />`
  - Replace: when `currentFile || !currentFile` → `<GitPanel />`
- Remove now-unused `GitOverviewPanel` and `HistoryPanel` imports from `App.tsx` (they stay in their files for tests)
- Remove `currentFile` prop from `RightPanelContent` if no longer needed

Verification: App renders without errors, `npm test -- --run` exits 0.

---

## Risk Notes

- Rust compilation: adding `git_get_branch` is a new function; if `cargo test` fails due to compilation error, the Rust syntax must be checked
- `fetchBranch` call from `refreshStatus`: only call when workspace path is available and no error; guard against calling when `detectRepoMissing` would be true
- GitOverviewPanel and HistoryPanel tests must remain passing — we only change App.tsx import usage, not the component files themselves

---

## Completion Summary

*(to be filled in after completion)*

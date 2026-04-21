# Auto-Restore Last Workspace on Startup

## Header

- **Objective**: On app startup, automatically open the most recently used workspace directory after auth resolves, instead of presenting an empty workspace that requires manual selection.
- **Scope**: `src/App.tsx` — `WorkspaceShell` component, `hydrateRecentWorkspaces` useEffect
- **Non-scope**: Auto-opening the last file within the workspace; Rust/native-side changes; workspace switcher UI changes
- **Constraints**:
  - React components must not embed native file/IPC logic directly — use existing store actions
  - No new top-level structure; extend existing patterns
- **Assumptions**:
  - `recentWorkspaces` from the store is sorted by `last_opened DESC`; index `[0]` is the most recent
  - If the most recent workspace directory no longer exists, `openWorkspace` will throw; handle like `handleSelectWorkspace` does (remove from recents, do not cascade to next)

---

## Acceptance Criteria

1. After auth resolves and `WorkspaceShell` mounts, if `workspacePath` is null and `recentWorkspaces` is non-empty, `openWorkspace(recentWorkspaces[0].path)` is called automatically — **without** user interaction.
2. If auto-open fails (directory gone), the workspace is removed from recents; the app stays on the empty workspace state without crashing.
3. Auto-open does NOT fire a second time on subsequent re-renders (guarded by a `useRef` flag).
4. If `workspacePath` is already set when the effect runs (e.g., future session-restore path), auto-open is skipped — no double-open.
5. Existing 145 frontend tests and Rust tests continue to pass.

---

## Implementation Steps

### Step 1 — Modify `WorkspaceShell` `hydrateRecentWorkspaces` useEffect in `src/App.tsx`

**Files touched**: `src/App.tsx`

**Change**:
1. Add `const didAutoOpenRef = useRef(false);` near the other refs in `WorkspaceShell`.
2. Replace the existing one-liner `hydrateRecentWorkspaces` effect:

   ```tsx
   useEffect(() => {
     void hydrateRecentWorkspaces();
   }, [hydrateRecentWorkspaces]);
   ```

   with:

   ```tsx
   useEffect(() => {
     void hydrateRecentWorkspaces().then(() => {
       if (didAutoOpenRef.current) return;
       didAutoOpenRef.current = true;
       const { workspacePath: current, recentWorkspaces: recents } =
         useNoteStore.getState();
       if (!current && recents.length > 0) {
         void openWorkspace(recents[0].path).catch(async () => {
           await removeRecentWorkspace(recents[0].path);
         });
       }
     });
   }, [hydrateRecentWorkspaces, openWorkspace, removeRecentWorkspace]);
   ```

**Verification**: `npm test -- --run` still passes 145 assertions; manual smoke under `npm run tauri dev` — last workspace opens automatically.

---

## Risk Notes

- If the most recent workspace was on a removable drive or network share that's now unavailable, `openWorkspace` throws; the `.catch` handler removes it cleanly — no UX regression.
- The `didAutoOpenRef` guard prevents duplicate auto-opens if React StrictMode double-invokes effects in development.

---

## Completion Summary

Completed: 2026-04-22
Duration: 1 step completed
All acceptance criteria: PASS

Summary: Modified `WorkspaceShell` in `src/App.tsx` to auto-open the most recently used workspace on startup. The existing `hydrateRecentWorkspaces` useEffect was extended to call `openWorkspace(recents[0].path)` after the recent-workspace list loads, guarded by a `didAutoOpenRef` to prevent duplicate invocations. If the workspace directory no longer exists, `removeRecentWorkspace` is called in the catch handler, consistent with the existing `handleSelectWorkspace` pattern. No new files created; no Rust changes required. 145 frontend tests remain green.

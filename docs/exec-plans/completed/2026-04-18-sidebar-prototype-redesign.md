# Sidebar Prototype Redesign

**Objective**: Align the sidebar UI to match the reference prototype, replacing the WorkspaceSwitcher-at-top layout with a "文件" header + action icons, colored git status letter badges, a hover-reveal workspace switcher at the bottom, a git branch/counts status strip, and proper context menu hover effects.

**Started**: 2026-04-18

---

## Scope

- `src/components/ui/context-menu.tsx` — ContextMenuItem and ContextMenuSubTrigger hover states
- `src/components/sidebar/FileTree.tsx` — git status indicator (Circle → letter badge)
- `src/App.tsx` — SidebarContent restructure (header, bottom area)

## Non-Scope

- StatusBar component at the app footer — not touched
- AppLayout sidebar container — `sidebarTitle=""` already passes empty; no change needed
- WorkspaceSwitcher component internals — only composition changes

## Constraints

- All Zustand store access goes through existing `useGitStore` / `useNoteStore` hooks
- No new files — extend existing modules
- Tailwind CSS only; no inline style blocks
- 148 tests (24 files) must remain green after each step

---

## Acceptance Criteria

1. Context menu items show a background highlight on mouse hover and keyboard navigation
2. Files with git status show colored letter badge (`A` emerald, `M` amber, `D` rose) instead of a filled circle dot
3. Sidebar top section shows "文件" label on the left, search icon + "+" icon on the right; no WorkspaceSwitcher in the top section
4. WorkspaceSwitcher appears at the bottom of the sidebar only when the user hovers over the sidebar; it stays visible while its popover is open
5. Git branch + change counts strip is always visible at the very bottom of the sidebar
6. All 148 tests continue to pass

---

## Implementation Steps

### Step 1 — Fix context menu hover effects (context-menu.tsx) ✅

**Files**: `src/components/ui/context-menu.tsx`

Changed `focus:bg-accent/12 focus:text-fg` → `data-[highlighted]:bg-accent/12 data-[highlighted]:text-fg` in `ContextMenuSubTrigger`, `ContextMenuItem`, and `ContextMenuCheckboxItem`.

---

### Step 2 — Replace Circle dot with letter badge in FileTree.tsx ✅

**Files**: `src/components/sidebar/FileTree.tsx`

Removed `Circle` import. Added `gitStatusLabel()` function. Replaced Circle badge with `<span>` showing letter (A/M/D/R/T/C) in the same color as before.

---

### Step 3 — Redesign SidebarContent in App.tsx ✅

**Files**: `src/App.tsx`

- Added `GitBranch, Plus` to lucide-react imports
- Added `group/sidebar` to outer container
- Replaced top section with "文件" header + search + "+" button
- Added hover-reveal WorkspaceSwitcher at bottom (CSS group-hover + has-[[data-state=open]])
- Added git branch + counts strip at bottom

---

## Completion Summary

Completed: 2026-04-18
Steps completed: 3
All acceptance criteria: PASS

Summary: Aligned the sidebar UI to the prototype design. Context menu items now highlight on hover via Radix `data-[highlighted]` attribute. File git status indicators show colored letter badges (A/M/D) instead of dot circles. The sidebar header now shows "文件" with search + open-directory icons. WorkspaceSwitcher moved to the sidebar bottom and reveals on hover (stays open while popover is active via `has-[[data-state=open]]` CSS). A compact git branch/counts strip is always visible at the sidebar bottom. All 148 tests remain green.

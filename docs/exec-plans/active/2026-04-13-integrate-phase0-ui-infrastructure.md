# Execution Plan: Integrate phase0 UI infrastructure

Created: 2026-04-13
Status: Active
Author: agent

## Objective

Integrate the Phase 0.2 frontend UI infrastructure so the existing React/Tauri shell has a working Tailwind-based theme foundation, real Radix/cmdk wrappers, and an interactive demo page that proves the primitives work together.

## Scope

**In scope:**
- `package.json` and lockfile dependency alignment for missing UI packages
- `tailwind.config.js`, `postcss.config.js`, `src/styles.css`
- `src/components/ui/{dialog,popover,tooltip,toast,command}.tsx`
- `src/App.tsx` and any small frontend-only helper needed to support the demo page

**Out of scope:**
- Phase 0.3 store schema expansion beyond installing the requested state dependencies
- `src-tauri/` feature work or native command implementation
- Shadcn CLI adoption, design-system extraction, or broader app shell refactors outside the demo page

## Constraints

- Keep all browser UI work inside `src/`; do not couple this task to `src-tauri/`.
- Preserve the existing `components / stores / services / hooks` layering instead of creating alternate frontend structures.
- Radix primitives must stay headless and be styled manually with Tailwind classes; do not use shadcn/ui generators.
- The repository already uses Tailwind CSS `3.4.19`; use the stable in-place upgrade path for Phase 0.2 rather than expanding scope to a Tailwind v4 migration.

## Acceptance Criteria

- [ ] AC-1: Tailwind configuration supports class-based dark mode, CSS variable theme tokens (`--color-bg`, `--color-fg`, `--color-muted`, `--color-accent`, `--color-border`), and `tailwindcss-animate`.
- [ ] AC-2: `src/components/ui/` exports working Tailwind-styled wrappers for Dialog, Popover, Tooltip, Toast, and Command that use Radix/cmdk primitives and `data-[state=*]` driven animation classes.
- [ ] AC-3: `src/App.tsx` renders a demo page where Dialog, Tooltip, Toast, and Command Palette can be opened interactively, and dark mode can be toggled via the root `.dark` class.
- [ ] AC-4: `npm run build` completes with zero TypeScript errors after the integration.

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Tailwind v3/v4 guidance conflicts with the current repo state | Medium | Keep v3 stable and implement only the requested class-based dark mode, theme tokens, and animation plugin |
| Placeholder UI wrappers may already be imported elsewhere | Low | Preserve exported names and broaden props support instead of changing public filenames |
| No frontend test harness exists | Medium | Use `npm run build` plus live browser interaction checks as explicit verification evidence |

## Implementation Steps

### Step 1: Align frontend styling dependencies and Tailwind foundation

**Files:** `package.json`, `package-lock.json`, `tailwind.config.js`, `src/styles.css`
**Verification:** Missing packages are installed and `npm run build` stays green

Status: 🔄 In progress
Evidence: Current repo already has Tailwind v3.4.19, several Radix primitives, cmdk, and Zustand; missing packages and config gaps have been identified during planning.
Deviations:

### Step 2: Replace placeholder UI wrappers with real Radix/cmdk components

**Files:** `src/components/ui/dialog.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/tooltip.tsx`, `src/components/ui/toast.tsx`, `src/components/ui/command.tsx`
**Verification:** Build passes and the wrappers expose working content/trigger/provider composition for the demo page

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: Build the Phase 0.2 interactive demo page

**Files:** `src/App.tsx`
**Verification:** Browser interaction confirms Dialog, Tooltip, Toast, and Cmd+K command palette all open and render with Tailwind styling

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: Verify, sync control plane, and archive

**Files:** `docs/PLANS.md`, `docs/exec-plans/active/2026-04-13-integrate-phase0-ui-infrastructure.md`, any harness docs changed by the implementation
**Verification:** Acceptance criteria are marked PASS/FAIL, `npm run build` passes, and the plan is archived to `completed/`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | 🔄 | Preflight green; current dependency/config gaps mapped | Tailwind v3 retained intentionally |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |
| 4 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| Keep Tailwind on v3.4.19 for this task | The repo already uses Tailwind v3 and the request allows "v4 or v3 稳定版" | Migrate to Tailwind v4 during this task | Minimizes scope and risk while fully satisfying the requested Phase 0.2 capabilities |
| Exclude full Phase 0.3 store work | The request only asks to install Zustand and Jotai, not to implement the full store contracts | Expand the task into store design and behavior work | Prevents scope drift and keeps the feature focused on UI infrastructure |

## Completion Summary

<!-- Fill in when archiving the plan -->

Completed:
Duration: 4 steps
All acceptance criteria: PASS / FAIL

Summary:

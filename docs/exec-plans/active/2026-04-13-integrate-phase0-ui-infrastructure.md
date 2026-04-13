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

Status: ✅ Done
Evidence: Installed `tailwindcss-animate`, `lucide-react`, `jotai`, `@radix-ui/react-toggle-group`, and `@radix-ui/react-accordion`; updated `tailwind.config.js` with `darkMode: "class"`, CSS-variable-backed theme colors, and the animate plugin; updated `src/styles.css` with light/dark token definitions and base application; `npm run build` passed after the changes.
Deviations: Kept Tailwind on v3.4.19 as planned instead of migrating to v4.

### Step 2: Replace placeholder UI wrappers with real Radix/cmdk components

**Files:** `src/components/ui/dialog.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/tooltip.tsx`, `src/components/ui/toast.tsx`, `src/components/ui/command.tsx`
**Verification:** Build passes and the wrappers expose working content/trigger/provider composition for the demo page

Status: ✅ Done
Evidence: Replaced placeholder files in `src/components/ui/` with real Radix/cmdk wrappers for Dialog, Popover, Tooltip, Toast, and Command, including Tailwind styling, portal usage, provider exports, and `data-[state=*]` / `data-[side=*]` animation classes; `npm run build` passed after the wrapper swap.
Deviations: None.

### Step 3: Build the Phase 0.2 interactive demo page

**Files:** `src/App.tsx`, `vite.config.ts`
**Verification:** Browser interaction confirms Dialog, Tooltip, Toast, and Cmd+K command palette all open and render with Tailwind styling

Status: ✅ Done
Evidence: Rebuilt `src/App.tsx` into an interactive Phase 0.2 verification page; `npm run build` passed after integrating the demo and raising the non-Windows Vite target to `safari15`; browser verification on `http://localhost:1420/` confirmed `.dark` class toggling, Tooltip hover text, Dialog opening, Popover expansion, Toast notification rendering, and `Control+K` opening the command palette; browser console remained free of app errors.
Deviations: `vite.config.ts` and the tracked `vite.config.js` were updated to change the non-Windows build target from `safari13` to `safari15`, because the inherited target failed to transpile the modern Radix/Lucide runtime imports under Vite 7.

### Step 4: Verify, sync control plane, and archive

**Files:** `docs/PLANS.md`, `docs/exec-plans/active/2026-04-13-integrate-phase0-ui-infrastructure.md`, any harness docs changed by the implementation
**Verification:** Acceptance criteria are marked PASS/FAIL, `npm run build` passes, and the plan is archived to `completed/`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | Missing packages installed; Tailwind class dark mode, CSS tokens, and animate plugin configured; `npm run build` passed | Tailwind v3 retained intentionally |
| 2 | ✅ | Real Radix/cmdk wrappers replaced placeholders and compiled cleanly | Public file paths were preserved |
| 3 | ✅ | Demo page compiled and browser interactions proved Dialog / Tooltip / Popover / Toast / Cmd+K / dark mode | Vite target raised to `safari15` for compatibility |
| 4 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| Keep Tailwind on v3.4.19 for this task | The repo already uses Tailwind v3 and the request allows "v4 or v3 稳定版" | Migrate to Tailwind v4 during this task | Minimizes scope and risk while fully satisfying the requested Phase 0.2 capabilities |
| Exclude full Phase 0.3 store work | The request only asks to install Zustand and Jotai, not to implement the full store contracts | Expand the task into store design and behavior work | Prevents scope drift and keeps the feature focused on UI infrastructure |
| Raise the non-Windows Vite build target if needed for modern UI dependencies | Bringing Radix/Lucide into the runtime surfaced Vite/esbuild failures against the inherited `safari13` target | Revert the new UI stack; keep debugging around the old target | Adjusting the build target is the smallest repo-level change that preserves the requested UI stack and restores a green build |

## Completion Summary

<!-- Fill in when archiving the plan -->

Completed:
Duration: 4 steps
All acceptance criteria: PASS / FAIL

Summary:

# Execution Plan: Create Zustand store scaffolds

Created: 2026-04-13
Status: Active
Author: agent

## Objective

Replace the placeholder Zustand stores with Phase 0.3-ready scaffolds that expose the requested state shape, typed action signatures, and shared type definitions without implementing real business logic yet.

## Scope

**In scope:**
- `package.json` / lockfile updates needed for Zustand immer middleware support
- `src/types/` shared type files and export index
- `src/stores/authStore.ts`, `noteStore.ts`, `editorStore.ts`, `gitStore.ts`, `aiStore.ts`, `settingsStore.ts`

**Out of scope:**
- Wiring store actions to `src/services/` or `src-tauri/`
- Implementing real authentication, file, git, AI, or settings behavior
- Replacing the Phase 0.2 UI verification page with production app flows

## Constraints

- Keep store work inside `src/`; do not add native/runtime behavior.
- Use Zustand `create` plus the `immer` middleware exactly as requested.
- Put the requested shared type definitions in independent files under `src/types/`.
- Preserve existing store file paths and `use[Name]Store` hook exports so future phases can build on them.

## Acceptance Criteria

- [ ] AC-1: `src/types/` contains independent type files for the requested shared models, and the type export surface remains importable.
- [ ] AC-2: All six store files export `use[Name]Store` hooks built with Zustand `create` + `immer`, with the requested state shape and placeholder action signatures.
- [ ] AC-3: `npm run build` completes with zero TypeScript errors after the store scaffolds are in place.

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Placeholder action signatures may accidentally imply implemented behavior | Medium | Keep action bodies explicit no-ops or resolved placeholders and document that they are scaffolds |
| Existing hooks/imports may rely on the current minimal store shapes | Low | Preserve store hook names and keep public type names coherent through `src/types/index.ts` |

## Implementation Steps

### Step 1: Add shared type files and middleware dependency

**Files:** `package.json`, `package-lock.json`, `src/types/*.ts`
**Verification:** `immer` is installed and the requested shared types are exported from independent files

Status: ✅ Done
Evidence: Installed `immer`; added independent type files under `src/types/` for auth, notes, editor, git, AI, settings, and app-shell models; converted `src/types/index.ts` into a pure export barrel; `npm run build` passed after the type-layer refactor.
Deviations: None.

### Step 2: Replace placeholder stores with requested scaffolds

**Files:** `src/stores/authStore.ts`, `noteStore.ts`, `editorStore.ts`, `gitStore.ts`, `aiStore.ts`, `settingsStore.ts`
**Verification:** Each store exposes the requested initial state and typed placeholder action signatures through `create + immer`

Status: ✅ Done
Evidence: Replaced all six store files with Zustand `create + immer` scaffolds that import their shared types from `src/types/`; each store now exposes the requested state shape and placeholder action signatures; `npm run build` passed after the store replacement.
Deviations: None.

### Step 3: Verify, sync control plane if needed, and archive

**Files:** `docs/PLANS.md`, `docs/exec-plans/active/2026-04-13-create-zustand-store-scaffolds.md`, any harness docs changed by the implementation
**Verification:** `npm run build` passes, acceptance criteria are marked PASS/FAIL, and the plan is archived to `completed/`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | `immer` installed; shared type files created; build stayed green | No conflicting active plans |
| 2 | ✅ | All six stores now expose requested state and action signatures via `create + immer` | Business logic intentionally left unimplemented |
| 3 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| Keep action bodies as placeholders | The user asked for initial scaffolds with empty action signatures | Implement partial local state behavior now | Prevents accidental scope drift into business logic before later phases |

## Completion Summary

<!-- Fill in when archiving the plan -->

Completed:
Duration: 3 steps
All acceptance criteria: PASS / FAIL

Summary:

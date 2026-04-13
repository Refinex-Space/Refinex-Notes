# Execution Plan: Define ProseMirror schema

Created: 2026-04-13
Status: Active
Author: agent

## Objective

Introduce a canonical `src/editor/schema.ts` that defines the Refinex ProseMirror schema for Markdown documents, while preserving compatibility with the existing `src/components/editor/` placeholder layout.

## Scope

**In scope:**
- `package.json` / lockfile updates for required ProseMirror and markdown dependencies
- `src/editor/schema.ts` as the new canonical schema module
- `src/components/editor/schema.ts` as a compatibility re-export
- Control plane updates if the new `src/editor/` module changes repo structure documentation

**Out of scope:**
- Implementing parser, serializer, plugins, or editor UI behavior beyond the schema definition
- Wiring the schema into a live editor instance
- Native/runtime changes under `src-tauri/`

## Constraints

- Keep implementation in `src/`; do not cross into `src-tauri/`.
- Use `prosemirror-markdown`'s schema as the starting reference rather than designing the document model from scratch.
- Satisfy the requested node and mark coverage, including GFM task list items and strikethrough.
- Avoid leaving two divergent schema sources; `src/editor/schema.ts` must be the single real implementation and the old component-level path must delegate to it.

## Acceptance Criteria

- [ ] AC-1: The required ProseMirror and markdown dependencies are installed and the frontend build remains green.
- [ ] AC-2: `src/editor/schema.ts` exports a `refinexSchema` whose required nodes and marks are accessible via `schema.nodes.*` / `schema.marks.*`.
- [ ] AC-3: `src/components/editor/schema.ts` points at the canonical implementation without duplicating the schema definition.
- [ ] AC-4: `npm run build` completes with zero TypeScript errors after the schema module is introduced.

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| The existing `src/components/editor/` placeholder path could drift from the new canonical location | Medium | Keep only one implementation and make the old file re-export from the new module |
| ProseMirror type definitions may be terse around `parseDOM` / `toDOM` | Medium | Use official schema API docs as the reference surface and keep node specs explicit |

## Implementation Steps

### Step 1: Install schema dependencies and establish editor module path

**Files:** `package.json`, `package-lock.json`, `src/editor/`, `src/components/editor/schema.ts`
**Verification:** Required dependencies are installed and the project compiles with the new module path present

Status: ✅ Done
Evidence: Installed the requested `prosemirror-*` packages, `markdown-it`, and `@types/markdown-it`; created `src/editor/schema.ts` as the canonical module path; converted `src/components/editor/schema.ts` into a compatibility re-export; `npm run build` passed after the dependency and path setup.
Deviations: The canonical file is still a minimal placeholder at this step so that the implementation work can stay isolated to Step 2.

### Step 2: Implement the canonical `refinexSchema`

**Files:** `src/editor/schema.ts`
**Verification:** The schema module exports the required nodes and marks and passes TypeScript compilation

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: Verify, sync control plane if needed, and archive

**Files:** `docs/PLANS.md`, `docs/exec-plans/active/2026-04-13-define-prosemirror-schema.md`, any harness docs changed by the implementation
**Verification:** `npm run build` passes, acceptance criteria are marked PASS/FAIL, and the plan is archived to `completed/`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | ProseMirror/markdown dependencies installed, canonical path created, and build stayed green | No conflicting active plans |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| Use `src/editor/schema.ts` as the canonical implementation | The request explicitly targets `src/editor/schema.ts`, but an empty `src/components/editor/schema.ts` already exists | Keep using `src/components/editor/schema.ts` only | This preserves the requested path and prevents future duplication by keeping the component path as a compatibility export |

## Completion Summary

<!-- Fill in when archiving the plan -->

Completed:
Duration: 3 steps
All acceptance criteria: PASS / FAIL

Summary:

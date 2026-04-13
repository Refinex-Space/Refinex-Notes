# Execution Plan: Inline Sync Plugin

Created: 2026-04-13
Status: Active
Author: agent

## Objective

Implement the editor-core inline-sync plugin so Markdown syntax typed inside affected textblocks is reparsed into ProseMirror structure immediately while preserving stable selection and undo behavior.

## Scope

**In scope:**
- `src/editor/plugins/inline-sync.ts`
- `src/editor/RefinexEditor.tsx`
- `src/editor/__tests__/inline-sync.test.ts`
- `src/editor/index.ts`

**Out of scope:**
- Raw Markdown reveal when the cursor enters already formatted content
- Phase 2.2 input rules / keymap additions beyond the existing editor wiring
- Rust-side editor integration or unrelated UI refactors

## Constraints

- Editor-core semantics and plugin logic must stay in `src/editor/`.
- Reuse `refinexParser`, `refinexSerializer`, and `refinexSchema` instead of introducing parallel editor abstractions.
- Inline sync must not run inside `code: true` blocks and must avoid infinite append-transaction loops.
- Undo behavior must remain compatible with the existing `history()` plugin integration.

## Acceptance Criteria

- [ ] AC-1: `src/editor/plugins/inline-sync.ts` exports `refinexInlineSyncKey` and `inlineSyncPlugin(parser, serializer)`.
- [ ] AC-2: The plugin inspects doc-changing transactions, derives affected ranges from transaction mappings, and reparses only non-empty non-code textblocks.
- [ ] AC-3: Closing Markdown syntax for heading, strong, emphasis, inline code, link, and strikethrough produces updated ProseMirror structure with stable caret placement.
- [ ] AC-4: No-op conditions (no doc change, empty paragraph, code block) and multi-block deletion do not produce incorrect rewrites or cursor jumps.
- [ ] AC-5: Undo remains functional for inline-sync-driven rewrites, and `npm test`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml` pass.

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Selection remapping lands in the wrong offset after reparse | High | Use a placeholder-based round trip and cover start/end/mid-line caret positions in tests |
| Appended transactions recurse indefinitely | Medium | Tag inline-sync transactions with plugin meta and short-circuit on self-generated runs |
| Parser drops or relocates the placeholder in edge cases | Medium | Sanitize parsed fragments explicitly and assert placeholder recovery in tests |
| Replacing multiple changed blocks shifts later positions incorrectly | Medium | Process tracked blocks in descending order and map positions through the active transaction |

## Implementation Steps

### Step 1: Create inline-sync plugin scaffold and range tracking helpers

**Files:** `src/editor/plugins/inline-sync.ts`
**Verification:** Vitest compiles the new module and build remains green

Status: ⬜ Not started
Evidence:
Deviations:

### Step 2: Implement placeholder-based reparse and selection preservation

**Files:** `src/editor/plugins/inline-sync.ts`
**Verification:** Inline-sync tests prove rewritten blocks and caret placement for syntax closure cases

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: Add automated coverage for no-op, deletion, and undo behavior

**Files:** `src/editor/__tests__/inline-sync.test.ts`
**Verification:** Targeted inline-sync Vitest cases pass

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: Integrate the plugin into the editor and run full verification

**Files:** `src/editor/RefinexEditor.tsx`, `src/editor/index.ts`
**Verification:** Full `npm test`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml` pass

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ⬜ |  |  |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |
| 4 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |

## Completion Summary

Completed:
Duration: 4 steps
All acceptance criteria: PASS / FAIL

Summary:

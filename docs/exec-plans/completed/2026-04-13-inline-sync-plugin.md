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

- [x] AC-1: `src/editor/plugins/inline-sync.ts` exports `refinexInlineSyncKey` and `inlineSyncPlugin(parser, serializer)`.
- [x] AC-2: The plugin inspects doc-changing transactions, derives affected ranges from transaction mappings, and reparses only non-empty non-code textblocks.
- [x] AC-3: Closing Markdown syntax for heading, strong, emphasis, inline code, link, and strikethrough produces updated ProseMirror structure with stable caret placement.
- [x] AC-4: No-op conditions (no doc change, empty paragraph, code block) and multi-block deletion do not produce incorrect rewrites or cursor jumps.
- [x] AC-5: Undo remains functional for inline-sync-driven rewrites, and `npm test`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml` pass.

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

Status: ✅ Done
Evidence: Added `src/editor/plugins/inline-sync.ts` with `refinexInlineSyncKey`, parser/serializer interfaces, append-transaction loop guard, transaction mapping range collection, and affected textblock discovery. `npm test` passes (20/20). `npm run build` passes.
Deviations:

### Step 2: Implement placeholder-based reparse and selection preservation

**Files:** `src/editor/plugins/inline-sync.ts`, `src/editor/__tests__/inline-sync.test.ts`
**Verification:** Targeted inline-sync tests prove rewritten blocks and caret placement for syntax closure cases

Status: ✅ Done
Evidence: Added paragraph-scoped inline reparse logic in `src/editor/plugins/inline-sync.ts` and 6 focused syntax-closure tests in `src/editor/__tests__/inline-sync.test.ts`. `npm test -- src/editor/__tests__/inline-sync.test.ts` passes (6/6).
Deviations: Replaced the original zero-width-placeholder reparse path with prefix reparse + text-content offset mapping for caret restoration, because `markdown-it` treats `\u200B` after emphasis delimiters as meaningful content and prevents `**bold**` / `*italic*` / `~~strike~~` from closing correctly. Also use raw paragraph `textContent` as the markdown source for eligible blocks because `MarkdownSerializer` escapes literal Markdown delimiters in plain text.

### Step 3: Add automated coverage for no-op, deletion, and undo behavior

**Files:** `src/editor/__tests__/inline-sync.test.ts`
**Verification:** Targeted inline-sync Vitest cases pass

Status: ✅ Done
Evidence: Expanded `src/editor/__tests__/inline-sync.test.ts` to 11 cases covering no-doc-change, code-block skip, already-formatted paragraph skip, cross-paragraph deletion, and undo behavior. `npm test -- src/editor/__tests__/inline-sync.test.ts` passes (11/11).
Deviations: Added an explicit "already formatted paragraph" no-op case to lock in the current paragraph-scoped strategy and prevent accidental recursive reparsing in follow-up edits.

### Step 4: Integrate the plugin into the editor and run full verification

**Files:** `src/editor/RefinexEditor.tsx`, `src/editor/index.ts`
**Verification:** Full `npm test`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml` pass

Status: ✅ Done
Evidence: Wired `inlineSyncPlugin(refinexParser, refinexSerializer)` into `src/editor/RefinexEditor.tsx`, switched dispatching to `state.applyTransaction(...)`, and re-exported the plugin surface from `src/editor/index.ts`. Full verification passes: `cargo test --manifest-path src-tauri/Cargo.toml` (0 tests, pass), `npm test` (31/31 pass), `npm run build` (pass).
Deviations: None

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | `npm test` 20/20 pass; `npm run build` pass | Added helper-first scaffold before placeholder rewrite |
| 2 | ✅ | `npm test -- src/editor/__tests__/inline-sync.test.ts` → 6/6 pass | Paragraph-scoped rewrite path chosen for stable Phase 2.1 closure rendering |
| 3 | ✅ | `npm test -- src/editor/__tests__/inline-sync.test.ts` → 11/11 pass | Added no-op, deletion, formatted-block, and undo coverage |
| 4 | ✅ | `cargo test` pass; `npm test` 31/31 pass; `npm run build` pass | EditorView now consumes appended transactions correctly |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| Add positive inline-sync tests in Step 2 | Step 2 needed concrete evidence for reparse and caret preservation before Step 3 expands edge-case coverage | Delay all tests to Step 3; rely on build-only evidence in Step 2 | Early behavioral tests reduce risk in the placeholder/remapping logic, which is the highest-risk part of the feature |
| Use raw paragraph text as the markdown source | `MarkdownSerializer` escapes literal Markdown delimiters in plain text, so plain paragraph reparse never sees `**`, `#`, or link syntax as Markdown | Continue using serializer output; add custom serializer escape bypass | Reading raw paragraph text preserves the exact user-typed syntax for the Phase 2.1 closure cases |
| Map caret via prefix reparse instead of `\u200B` parsing | `markdown-it` fails to close emphasis-like syntax when `\u200B` is injected after the closing delimiter | Keep strict placeholder parsing; invent a custom sentinel syntax | Prefix reparse preserves closure detection while still deriving a deterministic text-offset target in the rewritten document |
| Skip already formatted paragraphs in this phase | Once a paragraph already contains parsed marks, the rendered PM position no longer maps 1:1 to raw Markdown offsets | Reparse all paragraphs; introduce a full markdown-offset mapper now | The paragraph-only first-pass keeps closure rendering stable for the requested acceptance cases while avoiding cursor-jump regressions in richer mixed-mark paragraphs |
| Use `applyTransaction` in `RefinexEditor` dispatch | `appendTransaction` output is invisible when the editor only calls `state.apply(transaction)` | Keep current dispatch path; call plugin logic manually outside state | `applyTransaction` is the ProseMirror-native path that preserves plugin append hooks, history semantics, and a single post-append `onChange` snapshot |

## Completion Summary

Completed: 2026-04-13
Duration: 4 steps
All acceptance criteria: PASS

Summary: Implemented `src/editor/plugins/inline-sync.ts` as a ProseMirror append-transaction plugin that tracks changed ranges, reparses eligible paragraph textblocks into ProseMirror structure, and preserves caret placement through prefix-based text-offset remapping. Added 11 inline-sync tests covering syntax closure, no-op paths, code-block skipping, cross-paragraph deletion, and undo behavior. Integrated the plugin into `RefinexEditor` via `applyTransaction(...)` so appended transactions participate in editor updates and Markdown serialization, with full repo verification green (`cargo test`, `npm test`, `npm run build`).

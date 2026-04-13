# Markdown ↔ ProseMirror Round-trip Conversion

## Objective

Implement bidirectional Markdown ↔ ProseMirror conversion in `src/editor/parser.ts` and `src/editor/serializer.ts`, backed by round-trip tests that prove lossless conversion for all node/mark types in `refinexSchema`.

## Scope

- `src/editor/parser.ts` — new file
- `src/editor/serializer.ts` — new file
- `src/editor/__tests__/roundtrip.test.ts` — new file
- `src/components/editor/parser.ts` — update re-export
- `src/components/editor/serializer.ts` — update re-export
- `package.json` — add `markdown-it-task-lists`, `vitest` dev dependency

## Non-scope

- Editor UI / React component changes
- ProseMirror plugin or keymap wiring
- Table editing interactions (only parse/serialize)
- `src-tauri/` Rust-side Markdown

## Constraints

- Editor-core document semantics belong in `src/editor/` (AGENTS.md Key Patterns)
- Must use the existing `refinexSchema` from `src/editor/schema.ts`
- `src/components/editor/` should only re-export from `src/editor/`

## Acceptance Criteria

1. `parseMarkdown(md)` returns a valid ProseMirror `Node` conforming to `refinexSchema`
2. `serializeMarkdown(doc)` returns Markdown text
3. Round-trip: `serializeMarkdown(parseMarkdown(md))` ≈ `md` (whitespace differences tolerated, semantic equivalence required)
4. All 7 round-trip test cases pass (paragraph, nested list, code block, mixed format, GFM table, task list, empty doc)
5. `npm run build` still passes
6. Compatibility re-exports in `src/components/editor/` updated

## Implementation Steps

### Step 1 — Install dependencies ✅
- Installed `markdown-it-task-lists` and `vitest`
- Added `test` script to `package.json`
- **Evidence**: `npx vitest --version` → `vitest/4.1.4`

### Step 2 — Implement parser.ts ✅
- Created `src/editor/parser.ts` with markdown-it + GFM plugins
- Added custom core rule for task list token transformation
- Created type declaration for `markdown-it-task-lists`
- Added table nodes (table, table_row, table_header, table_cell) to schema
- **Evidence**: `npm run build` passes

### Step 3 — Implement serializer.ts ✅
- Created `src/editor/serializer.ts` with all node/mark serializers
- Custom table serializer with alignment support
- **Evidence**: `npm run build` passes

### Step 4 — Update component re-exports ✅
- Updated `src/components/editor/parser.ts` and `serializer.ts`
- **Evidence**: `npm run build` passes

### Step 5 — Write round-trip tests ✅
- Created 20 tests (expanded from original 7 to cover more edge cases)
- **Evidence**: 20/20 tests pass

### Step 6 — Fix round-trip mismatches ✅
- Added `text` node serializer (required by MarkdownSerializer)
- Made `image` node inline to match markdown-it parsing behavior
- Updated `bullet_list` content spec to allow `task_list_item`
- **Evidence**: all 20 tests pass, build passes

## Deviations from Original Plan

1. **Schema changes**: Added 4 table node types and modified image/bullet_list specs — not originally scoped but required for correct parsing
2. **Type declaration**: Added `src/types/markdown-it-task-lists.d.ts` — anticipated in risk notes
3. **Test count**: Expanded from 7 to 20 test cases for better coverage

## Completion Summary

Completed: 2026-04-13
Duration: 6 steps
All acceptance criteria: PASS

Summary: Implemented bidirectional Markdown ↔ ProseMirror conversion using `prosemirror-markdown`'s `MarkdownParser` and `MarkdownSerializer`. Extended `refinexSchema` with GFM table nodes and fixed image node to be inline. Added a custom markdown-it core rule to transform `markdown-it-task-lists` HTML checkbox tokens into clean `task_list_item` ProseMirror nodes. All 20 round-trip tests pass, proving lossless conversion across paragraphs, headings, lists (including nested and task lists), code blocks, blockquotes, tables with alignment, images, links, and all inline marks.

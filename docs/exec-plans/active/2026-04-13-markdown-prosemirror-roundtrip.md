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

### Step 1 — Install dependencies
- Install `markdown-it-task-lists` and `vitest` + `@types/markdown-it`
- Add `test` script to `package.json`
- **Verify**: `npx vitest --version` exits 0

### Step 2 — Implement parser.ts
- Create `src/editor/parser.ts`
- Configure `markdown-it` with GFM tables, strikethrough, task lists
- Map markdown-it tokens → `refinexSchema` nodes/marks via `MarkdownParser`
- Export `refinexParser` and `parseMarkdown()`
- **Verify**: `npm run build` passes

### Step 3 — Implement serializer.ts
- Create `src/editor/serializer.ts`
- Configure `MarkdownSerializer` with node/mark serialization rules
- Export `refinexSerializer` and `serializeMarkdown()`
- **Verify**: `npm run build` passes

### Step 4 — Update component re-exports
- Update `src/components/editor/parser.ts` to re-export from `../../editor/parser`
- Update `src/components/editor/serializer.ts` to re-export from `../../editor/serializer`
- **Verify**: `npm run build` passes

### Step 5 — Write round-trip tests
- Create `src/editor/__tests__/roundtrip.test.ts`
- Test cases: paragraph, nested list, code block, mixed format, GFM table, task list, empty doc
- **Verify**: `npx vitest run` all tests pass

### Step 6 — Fix any round-trip mismatches
- Debug and fix serialization/parsing issues discovered by tests
- **Verify**: all tests pass, build passes

## Risk Notes

- `markdown-it-task-lists` may not have types — might need inline declaration
- GFM table round-trip may require custom serializer logic since `prosemirror-markdown` doesn't include table serializers
- Note: `refinexSchema` inherits table nodes from `prosemirror-markdown`'s base schema via `markdownSchema.spec.nodes` — need to verify if table nodes exist

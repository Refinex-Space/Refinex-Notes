# Execution Plan: In-Document Find & Replace

**Objective:** Clicking the header search icon opens a functional find/replace panel that highlights all matches in the active ProseMirror editor, supports next/previous navigation, case-sensitive toggle, and single/all replace.

**Scope:**
- `src/editor/plugins/find-replace.ts` — new ProseMirror plugin
- `src/editor/editor.css` — highlight decoration CSS
- `src/editor/RefinexEditor.tsx` — register plugin
- `src/editor/index.ts` — export plugin key and dispatch helper
- `src/components/editor/FindReplaceBar.tsx` — new React component
- `src/components/layout/AppLayout.tsx` — add `findReplaceBar` slot prop, `searchOpen`/`onSearchToggle` props
- `src/App.tsx` — lift `searchOpen`, wire `FindReplaceBar` with `editorViewRef`
- `src/components/editor/__tests__/FindReplaceBar.test.tsx` — unit tests
- `src/editor/__tests__/find-replace.test.ts` — plugin unit tests

**Non-scope:**
- Cross-document/workspace-level search (covered by SearchPanel / native search)
- Regex-mode search
- Markdown source search (editor operates on ProseMirror doc text)

**Constraints (from AGENTS.md):**
- Editor logic belongs in `src/editor/`; React UI in `src/components/editor/`
- No direct file/Git/auth logic in UI components
- AppLayout receives domain state through props, not by reaching into stores

---

## Acceptance Criteria

1. Clicking the search icon opens the find/replace bar; clicking again or pressing Esc closes it and clears all decorations.
2. Typing in the find input highlights all matching text spans in the editor with a visible yellow/amber background.
3. Match count indicator shows `N / M` (current / total). Shows "无结果" when M=0.
4. ↓ / ↑ buttons and keyboard Enter/Shift+Enter navigate to next/previous match, scrolling the editor into view.
5. Case-sensitive toggle (Aa button) changes match behavior and refreshes highlights.
6. Replace input is hidden by default; a chevron button expands it.
7. "Replace" replaces the current match and advances to the next.
8. "Replace All" replaces all matches and shows updated count.
9. All 131+ tests continue to pass after each step.

---

## Implementation Steps

### Step 1 — ProseMirror find-replace plugin (`src/editor/plugins/find-replace.ts`)
Create a ProseMirror plugin with:
- `PluginKey<FindReplaceState>` where state = `{ query, caseSensitive, matches, current }`
- `apply(tr, prev)`: reads meta; if doc changed and query is non-empty, recomputes matches; clamps `current`
- `computeMatches(doc, query, caseSensitive)`: iterates all text nodes via `doc.descendants()`; returns `{from, to}[]`
- `decorations(state)`: returns `DecorationSet` — `Decoration.inline` with class `refinex-find-match` for all matches, `refinex-find-match-active` for current match
- Exported: `findReplaceKey`, `findReplacePlugin()`
- Exported commands: `dispatchFindQuery(view, query, caseSensitive)`, `dispatchFindNext(view)`, `dispatchFindPrev(view)`, `dispatchReplaceOne(view, replacement)`, `dispatchReplaceAll(view, replacement)`

Verification: unit tests for `computeMatches`, pass/fail states, decoration count.

### Step 2 — Highlight CSS (`src/editor/editor.css`)
Add two rules:
```css
.refinex-find-match { background: rgba(253,224,71,0.45); border-radius: 2px; }
.refinex-find-match-active { background: rgba(251,146,60,0.6); border-radius: 2px; outline: 1px solid rgb(251,146,60); }
```
Verification: `npm run build` passes.

### Step 3 — Register plugin in `RefinexEditor.tsx`
Import `findReplacePlugin` and add to the `plugins` array in `createEditorState`.
Verification: `npm run build` passes (no type errors); existing tests still pass.

### Step 4 — Export from `src/editor/index.ts`
Export `findReplaceKey`, `findReplacePlugin`, `dispatchFindQuery`, `dispatchFindNext`, `dispatchFindPrev`, `dispatchReplaceOne`, `dispatchReplaceAll`.
Verification: import works in `FindReplaceBar.tsx`.

### Step 5 — `FindReplaceBar` React component (`src/components/editor/FindReplaceBar.tsx`)
Props: `{ editorViewRef: MutableRefObject<EditorView|null>, onClose: () => void }`
State: `query`, `replacement`, `caseSensitive`, `replaceExpanded`, `matchCount`, `currentMatch` (derived from plugin state after each dispatch).
Behavior:
- On query/caseSensitive change: call `dispatchFindQuery`; read back plugin state to update counts
- Enter / click ↓: `dispatchFindNext`; Shift+Enter / click ↑: `dispatchFindPrev`
- Replace button: `dispatchReplaceOne` then re-read state
- Replace All: `dispatchReplaceAll` then re-read state
- Esc / close button: `dispatchFindQuery(view, "", false)` then `onClose()`
- Auto-focus find input on mount
Verification: render test, keyboard nav test.

### Step 6 — Lift `searchOpen` and wire into `AppLayout`
AppLayoutProps changes:
- Remove internal `searchOpen` state management for search bar
- Add `searchOpen?: boolean`, `onSearchToggle?: () => void`, `findReplaceBar?: ReactNode`
- Header search button calls `onSearchToggle` if provided, falls back to internal toggle
- Inline search area renders `findReplaceBar` when `searchOpen === true`

App.tsx changes:
- Add `const [searchOpen, setSearchOpen] = useState(false)`
- Render `<FindReplaceBar editorViewRef={editorViewRef} onClose={() => setSearchOpen(false)} />` when `searchOpen`
- Pass `searchOpen`, `onSearchToggle={() => setSearchOpen(s => !s)}`, `findReplaceBar={...}` to AppLayout

Verification: full test suite passes.

### Step 7 — Unit tests
- `src/editor/__tests__/find-replace.test.ts`: test `computeMatches` with various queries, case-insensitive match, overlapping, empty query
- `src/components/editor/__tests__/FindReplaceBar.test.tsx`: render test with mock editorView, assert match count display, close button

Verification: `npm test -- --run` shows 131+ tests passing.

---

## Risk Notes

- **Decoration flicker**: plugin must only recompute matches when query changes or doc changes, not on every dispatch. Guard with `prev.query !== newQuery || tr.docChanged`.
- **Replace position drift**: when replacing all, iterate matches in reverse order so earlier positions aren't invalidated by replacements.
- **Scroll coordination**: use `tr.scrollIntoView()` after setting `TextSelection` on the active match; ProseMirror handles scroll within the editor's container.
- **Plugin registration**: the plugin must be added before `history` to avoid decoration-layer ordering issues. Add it last in the plugin array so decorations are on top.

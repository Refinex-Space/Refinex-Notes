# Execution Plan: Source Mode Toggle (Cmd/Ctrl + /)

**Objective**: Add a Cmd/Ctrl+/ shortcut that toggles the active `RefinexEditor` between rich ProseMirror rendering and a raw Markdown textarea, matching Typora source mode UX.

**Started**: 2026-04-18

---

## Scope

- `src/types/editor.ts` — add `sourceMode`, `setSourceMode`, `toggleSourceMode` to store types
- `src/stores/editorStore.ts` — implement state + actions; reset sourceMode on `setActiveTab`
- `src/editor/plugins/keymap.ts` — add `Mod-/` to `RefinexKeymapOptions` + bindings map
- `src/editor/RefinexEditor.tsx` — add `sourceMode`/`onToggleSourceMode` props; render raw textarea when active; keep ProseMirror EditorView hidden (not unmounted); flush pending markdown on mode change
- `src/editor/editor.css` — style `.refinex-source-editor` textarea
- `src/App.tsx` — wire sourceMode state, global window keydown Mod+/ handler, and per-editor props

## Non-Scope

- CodeMirror / syntax highlighting in source mode (plain textarea for V1)
- Line numbers in source mode
- Per-tab sourceMode memory (global single boolean; resets on tab switch)

## Constraints

- ProseMirror EditorView **must stay mounted** (hidden via CSS) while in source mode — unmounting would destroy undo history
- Cross-mode sync uses existing controlled value + onChange round-trip; no direct ProseMirror ↔ textarea state coupling
- `Mod-/` must work when ProseMirror is focused (keymap plugin) and when textarea is focused (`onKeyDown`), plus a global window handler for when neither is focused

---

## Acceptance Criteria

- [x] AC-1: Pressing Cmd+/ (macOS) or Ctrl+/ (other OS) while the rich editor is focused toggles to raw source textarea showing the serialized Markdown.
- [x] AC-2: Pressing Cmd+/ again switches back to ProseMirror rendering with the latest markdown content (round-trip preserved).
- [x] AC-3: Edits made in source mode are reflected in the rich editor after switching back (textarea value flows through `onChange` → `value` prop → ProseMirror external sync).
- [x] AC-4: The shortcut also fires from the source textarea (`onKeyDown`) and from the global `window` keydown handler.
- [x] AC-5: Switching active tabs resets source mode to `false`.
- [x] AC-6: `npm test -- --run` passes (≥ baseline test count); `cargo test` 36/36; `npm run build` succeeds.

---

## Risk Notes

- **ProseMirror hidden state**: EditorView must not be destroyed when hidden. Confirmed: we keep `<div ref={mountRef}>` in DOM with CSS `display:none` and the `useEffect([], [])` mount lifecycle is unaffected.
- **Textarea height**: In source mode the textarea must fill the editor container. Use `resize-none` + `w-full h-full min-h-full`.
- **`Mod-/` key name in prosemirror-keymap**: prosemirror-keymap resolves `Mod-/` via `w3c-keyname`; `/` is a valid key name and `Mod` maps to Cmd/Ctrl.

---

## Implementation Steps

### Step 1 — Extend EditorStore types + state
Files: `src/types/editor.ts`, `src/stores/editorStore.ts`
- Add `sourceMode: boolean` to `EditorStoreState`
- Add `setSourceMode(enabled: boolean): void` and `toggleSourceMode(): void` to `EditorStoreActions`
- Implement in store with `sourceMode: false` default; `setActiveTab` resets `sourceMode` to `false`

### Step 2 — Add Mod-/ to ProseMirror keymap
Files: `src/editor/plugins/keymap.ts`
- Add `onToggleSourceMode?: () => void` to `RefinexKeymapOptions`
- Add `"Mod-/"` binding in `createRefinexKeyBindings` that calls `options.onToggleSourceMode()` if present

### Step 3 — Add sourceMode to RefinexEditor
Files: `src/editor/RefinexEditor.tsx`
- Add `sourceMode?: boolean` and `onToggleSourceMode?: () => void` to `RefinexEditorProps`
- Add `onToggleSourceModeRef` ref (same pattern as `openLinkPopoverRef`)
- Pass callback into `refinexKeymap({ onToggleSourceMode: () => onToggleSourceModeRef.current?.() })`
- `useEffect([sourceMode])`: when transitioning to source mode, flush pending markdown
- In JSX: keep `<div ref={mountRef}>` always in DOM; toggle `hidden` class when sourceMode; render `<textarea>` when sourceMode=true with `value`, `onChange`, and `onKeyDown` handling Mod-/

### Step 4 — Style source editor
Files: `src/editor/editor.css`
- Add `.refinex-source-editor` rules: full-height, monospace, transparent background, matching text color, no border/outline, padding consistent with rich editor, smooth transitions

### Step 5 — Wire App.tsx
Files: `src/App.tsx`
- Pull `sourceMode` and `toggleSourceMode` from `useEditorStore`
- Add `window` keydown handler for Mod+/ (prevent default, call `toggleSourceMode`) alongside existing Cmd+S handler
- Pass `sourceMode={isVisible ? sourceMode : false}` and `onToggleSourceMode={isVisible ? toggleSourceMode : undefined}` to each `RefinexEditor`

---

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1    | ✅     | `sourceMode`, `setSourceMode`, `toggleSourceMode` in `src/types/editor.ts`; `setActiveTab` now resets `sourceMode: false`. | |
| 2    | ✅     | `Mod-/` binding in `createRefinexKeyBindings`; `onToggleSourceMode` in `RefinexKeymapOptions`. | |
| 3    | ✅     | `sourceMode`/`onToggleSourceMode` props added to `RefinexEditorProps`; flush effect added; JSX updated with `hidden` ProseMirror div + conditional textarea. | Also fixed pre-existing `d.type` TS error in find-replace.test.ts (TD-003 re-fix). |
| 4    | ✅     | `.refinex-source-editor` CSS added with light+dark mode rules. | |
| 5    | ✅     | `sourceMode`/`toggleSourceMode` pulled from editorStore; global `window` keydown Mod+/ handler added; per-editor props wired in document map. | |

---

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| Plain textarea for source mode | V1 scope | CodeMirror with syntax highlighting | Simplest correct implementation; syntax highlighting can be layered in a follow-up |
| Keep ProseMirror hidden, not unmounted | Source mode implementation | Unmount/remount EditorView | Preserves undo history and avoids re-parse on every toggle |
| Global sourceMode in editorStore | State location | Per-document state | Only one document is ever visible at a time; resets on tab switch anyway |

---

## Completion Summary

Completed: 2026-04-18
All ACs: PASS
Tests: 142/142 frontend (baseline unchanged), 36/36 cargo, `npm run build` clean.

Delivered: `editorStore.sourceMode` boolean (resets on tab switch); `Mod-/` in ProseMirror keymap; `sourceMode` prop + raw textarea in `RefinexEditor` (ProseMirror EditorView stays mounted hidden to preserve undo history); monospace `.refinex-source-editor` CSS (light+dark); global `window` keydown handler in App.tsx; per-editor props wired in document map.

Deviation: re-applied the pre-existing TD-003 `find-replace.test.ts` type-cast fix which had been lost in the previous session's stash mishap.

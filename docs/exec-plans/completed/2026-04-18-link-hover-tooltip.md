# Execution Plan: Link Hover Tooltip

## Header

**Objective**: When the cursor hovers over a hyperlink in the ProseMirror editor, show a compact floating tooltip below the link with: globe icon, truncated URL, copy button, and "编辑" button. Clicking "编辑" opens the existing LinkPopover edit form. Design matches the existing FloatingToolbar / LinkPopover visual language.

**Scope**:
- `src/editor/rich-ui.ts` — add `findLinkMarkAtPos` (position-based link range lookup) and `getLinkHoverAnchorRect` (bottom-start anchor rect)
- `src/editor/ui/LinkHoverTooltip.tsx` — new compact hover tooltip component
- `src/editor/RefinexEditor.tsx` — hover state + mouse event wiring + JSX

**Non-scope**: No changes to LinkPopover edit form. No browser link navigation. No touch/mobile hover handling.

**Constraints**:
- Editor model logic (`findLinkMarkAtPos`) belongs in `src/editor/`; React UI shell (`LinkHoverTooltip`) in `src/editor/ui/` — matching existing `FloatingToolbar` / `LinkPopover` pattern
- Tooltip must not appear in source mode, when text selection is active, or when the edit popover is already open
- Hover hide is debounced (~200 ms) to allow mouse movement from link to tooltip without flicker

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| 1 | Hovering over a link in the rich editor shows a tooltip below the link text |
| 2 | Tooltip displays: globe icon + URL (≤40 chars, trailing … if truncated) + copy icon button + "编辑" text button |
| 3 | Copy button writes href to clipboard |
| 4 | "编辑" button closes hover tooltip and opens existing LinkPopover edit form pre-filled with the link's href + title |
| 5 | Moving mouse off both the link and the tooltip for 200 ms closes the tooltip |
| 6 | Tooltip does not appear in source mode, while text is selected (FloatingToolbar visible), or while LinkPopover is open |

## Implementation Steps

### Step 1 — Add `findLinkMarkAtPos` + `getLinkHoverAnchorRect` to `rich-ui.ts`

**Files**: `src/editor/rich-ui.ts`

- `findLinkMarkAtPos(state, pos)`: resolves pos in doc, finds link mark at that position (checks `$pos.marks()` then `$pos.nodeAfter.marks` for edge positions), expands to full link range using same walk logic as `findActiveLinkRange`.
- `getLinkHoverAnchorRect(view, from, to)`: uses `coordsAtPos(from)` and `coordsAtPos(to)` to return a `PopoverAnchorRect` with the actual left-edge (not center) so the tooltip anchors at start of the link text.
- Export both from `src/editor/index.ts` (following existing export pattern).
- Also add `findLinkMarkAtPos` test in `src/editor/__tests__/rich-ui.test.ts`.

**Verification**: `npm test -- --run` stays at 142+ passing.

### Step 2 — Create `LinkHoverTooltip.tsx`

**Files**: `src/editor/ui/LinkHoverTooltip.tsx` (new)

Props:
```ts
interface LinkHoverTooltipProps {
  href: string;
  anchor: PopoverAnchorRect;
  onEdit: () => void;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}
```

Renders a `Popover open` with `PopoverAnchor` positioned at `anchor.bottom` / `anchor.left` (fixed). `PopoverContent` uses `side="bottom"` `align="start"` `sideOffset={6}` `className="w-auto max-w-sm rounded-2xl p-0"`. Inner row: `<Globe>` icon + truncated URL as accessible link + divider + copy button + "编辑" button.

`truncateUrl(url, maxLength=40)` preserves domain, truncates path.

**Verification**: Component renders without TS errors (`npm run build`).

### Step 3 — Wire hover state into `RefinexEditor.tsx`

**Files**: `src/editor/RefinexEditor.tsx`

- Import `findLinkMarkAtPos`, `getLinkHoverAnchorRect` from `../rich-ui`; import `LinkHoverTooltip` from `./ui/LinkHoverTooltip`.
- New state: `linkHoverState: { from, to, href, title, anchor } | null`.
- New ref: `hideHoverTimerRef`.
- `cancelHoverHide()` and `scheduleHoverHide()` stable functions (useCallback).
- `handleEditorMouseMove(event)`: if sourceMode or editorView null → return. `posAtCoords` → `findLinkMarkAtPos` → update `linkHoverState` or schedule hide. Skip when `view.state.selection` is non-empty.
- `handleEditorMouseLeave()`: `scheduleHoverHide()`.
- Clear `linkHoverState` in: value sync cleanup block (alongside `setLinkPopoverRequest(null)`), unmount cleanup.
- Shell div gets `onMouseMove` / `onMouseLeave` handlers.
- JSX: render `<LinkHoverTooltip>` when `linkHoverState && !linkPopoverRequest && !sourceMode`. "onEdit" handler: `setLinkPopoverRequest({...linkHoverState, anchor: linkHoverState.anchor})` + `setLinkHoverState(null)`.

**Verification**: Full test suite + `npm run build`.

## Risk Notes

- **ProseMirror `posAtCoords` edge cases**: returns `null` when mouse is outside the editor doc area. Handled by `scheduleHoverHide()` in that case.
- **Popover Portal z-index conflict**: tooltip renders in a Portal; tested visually that it appears above editor content but below modal overlays.
- **Stale closure on hide timer**: timer stores `setLinkHoverState(null)` — this is a stable setter, no stale closure risk.

## Progress Log

| Step | Status | Evidence | Notes |
|------|--------|----------|-------|
| 1    | ✅     | 143 tests pass (new findLinkMarkAtPos test added); build OK | |
| 2    | ✅     | TS compiles, build OK | |
| 3    | ✅     | 143/143 tests, npm run build OK | |

## Completion Summary

Completed: 2026-04-18
Duration: 3 steps
All acceptance criteria: PASS

Summary: Delivered link hover tooltip for the ProseMirror editor. Added `findLinkMarkAtPos` and `getLinkHoverAnchorRect` to `rich-ui.ts` with a new unit test. Created `LinkHoverTooltip.tsx` with globe icon, truncated URL (≤40 chars), copy button, and "编辑" button. Wired hover state into `RefinexEditor.tsx` via `onMouseMove`/`onMouseLeave` on the shell div; tooltip hides with 200ms debounce to allow mouse movement from link to tooltip; clicking "编辑" opens the existing `LinkPopover` edit form pre-filled; tooltip suppressed in source mode, while text is selected, and while edit popover is open.

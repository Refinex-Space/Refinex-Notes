# StatusBar Prototype Alignment

**Started:** 2026-04-18  
**Objective:** Align the bottom status bar with the prototype design and fix hover colour regression on the GitHub account area.

## Scope

- `src/components/auth/AccountStatus.tsx` — fix logout button hover text colour
- `src/components/app-shell-utils.ts` — improve `countWords` accuracy for CJK content
- `src/components/layout/StatusBar.tsx` — redesign to match prototype layout
- `src/App.tsx` — add `encoding` prop to StatusBar

## Non-scope

- SyncStatus internal logic
- Git store or auth store changes
- Mobile / responsive breakpoints

## Constraints

- All 148 existing tests must continue to pass
- No new top-level abstractions; extend existing files only
- Keep `gitStatusSlot` API so AccountStatus + SyncStatus stay left-anchored

## Acceptance Criteria

1. **PASS** — Logout button in AccountStatus has visible text in both light and dark mode on hover
2. **PASS** — `countWords` counts CJK characters individually + Latin words; passes updated unit test
3. **PASS** — StatusBar left: gitStatusSlot (GitHub account + sync chip)
4. **PASS** — StatusBar right: `language | encoding | N 字 | 行N, 列N`
5. **PASS** — Center cursor pill removed; cursor info shown inline on right
6. **PASS** — All 148 tests pass

## Implementation Steps

### Step 1 — Fix AccountStatus hover colour ✅

File: `src/components/auth/AccountStatus.tsx`

The logout button uses `hover:text-rose-100` which is near-white and invisible on light backgrounds. Replace with `hover:text-rose-500` which is readable on both light (`bg-rose-400/10`) and dark mode.

Verification: visual inspection + no test regressions.

### Step 2 — Improve countWords for CJK accuracy ✅

File: `src/components/app-shell-utils.ts`

Current: `\S+` split — treats "你好世界" as 1 word.  
New algorithm:
1. Strip markdown syntax (headings, fenced code, inline code, images, link brackets)
2. Count each CJK character individually (Unicode range U+4E00–U+9FFF + extensions)
3. Count non-CJK Latin/number words (whitespace-delimited)

Update the existing unit test for `countWords` to cover CJK input.

Verification: `npm test` passes.

### Step 3 — Redesign StatusBar to match prototype ✅

File: `src/components/layout/StatusBar.tsx`

Current layout: `[gitStatusSlot | cursor-pill (center) | words + language]`  
Target layout:  `[gitStatusSlot] ←→ [language | encoding | N 字 | 行N, 列N]`

Changes:
- Remove center grid column + cursor pill
- Switch to 2-column flex: `justify-between`
- Right section: language, encoding (new prop), `{wordCount} 字`, `行{line}, 列{col}` 
- Add `encoding` prop (string, default `"UTF-8"`)
- Keep `gitStatusSlot` prop API unchanged

### Step 4 — Pass encoding from WorkspaceShell ✅

File: `src/App.tsx`

Pass `encoding="UTF-8"` to `<StatusBar>`. The value is static for this app (all files read/written as UTF-8).

## Completion Summary

Completed: 2026-04-18
Steps completed: 4
All acceptance criteria: PASS

Summary: Fixed the AccountStatus logout button hover colour (rose-100→rose-500 so it's visible on light backgrounds). Rewrote countWords to count CJK characters individually and Latin words as tokens, fixing accuracy for Chinese content; added two CJK test cases. Redesigned StatusBar from a 3-column grid with a centre cursor pill to a 2-column flex matching the prototype — left keeps gitStatusSlot (GitHub account + sync chip), right shows `language | encoding | N 字 | 行N, 列N`. Added `encoding` prop (default UTF-8) to StatusBar; passed it from WorkspaceShell. Test count: 148 → 149 (new CJK countWords tests).

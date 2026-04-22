# Fix Plan: Fix Slash Menu Interactions

Created: 2026-04-22
Status: Completed
Author: agent
Type: fix

## Bug Brief

**Symptom**: 编辑器内输入 `/` 打开的 Slash 菜单 hover 态背景变化过弱，且无法稳定通过上下键切换条目、按回车执行当前条目。
**Expected**: Slash 菜单中的当前项应有清晰可见的 hover / selected 反馈，并且键盘上下键、回车都能在菜单打开后立即工作。
**Severity**: Degraded
**Type**: Regression

### Reproduction

1. 在桌面编辑器中聚焦正文空段落。
2. 输入 `/` 打开 Slash 菜单。
3. 将鼠标移到菜单项上，观察 hover 反馈。
4. 继续按 `ArrowDown` / `ArrowUp` / `Enter`。

Reproduction evidence: 用户截图显示 Slash 菜单已打开但当前项视觉反馈极弱；代码检查显示 `src/editor/ui/SlashMenu.tsx` 在 `PopoverContent` 上阻止了 Radix 的自动聚焦，却没有把焦点显式转交给 `CommandInput`，这会让键盘事件继续停留在 ProseMirror 编辑器而不是 `cmdk` 输入框。

## Root Cause

**Mechanism**: Slash 菜单打开时没有把焦点移入 `cmdk` 输入框，导致 `cmdk` 的键盘导航状态机没有接管键盘事件；同时 `CommandItem` 仅使用较浅的 `bg-accent/12` 作为选中反馈，视觉对比不足。
**Introduced by**: 斜杠菜单首次接入 `Popover + cmdk` 时，为了避免 Popover 抢焦点添加了 `onOpenAutoFocus={preventDefault}`，但缺少后续的手动聚焦补偿；交互样式也沿用了较保守的命令项高亮强度。
**Why it wasn't caught**: 现有测试覆盖了 slash trigger 与命令执行 helper，但没有覆盖 Slash 菜单真实 DOM 焦点链路，也没有对命令项的交互样式强度做回归断言。

## Hypothesis Log

### Hypothesis #1: 键盘不可用的直接原因是 Slash 菜单打开后焦点仍停留在编辑器，而不是 `CommandInput`

Prediction: 如果菜单打开后显式聚焦 `CommandInput`，则 `ArrowUp` / `ArrowDown` / `Enter` 会重新进入 `cmdk` 的内建导航与选择逻辑。
Experiment: 检查 `src/editor/ui/SlashMenu.tsx` 的打开行为与 `cmdk` 文档要求。
Result: `PopoverContent` 阻止了自动聚焦，`SlashMenu` 没有任何 `ref.focus()` 补偿；`cmdk` 文档要求输入框参与焦点与 `data-selected` 状态管理。
Conclusion: CONFIRMED

### Hypothesis #2: hover 反馈偏弱是因为命令项只用了很浅的选中背景，没有额外边框或 hover 强化

Prediction: 如果提升 `CommandItem` 的 `hover` / `selected` 背景与边框对比，Slash 菜单中的当前项会更容易被识别。
Experiment: 检查 `src/components/ui/command.tsx` 当前 class 组合。
Result: 当前仅有 `data-[selected=true]:bg-accent/12`，没有 hover 边框或更明确的高亮层级。
Conclusion: CONFIRMED

## Fix

**Strategy**: 在 Slash 菜单打开时通过 `ref + requestAnimationFrame` 显式聚焦 `CommandInput`，同时收紧通用 `CommandItem` 的 hover / selected 样式，并为 Slash 菜单图标容器增加跟随选中态的对比增强；再补一份 jsdom DOM 交互测试和一份样式类名回归测试。
**Files**: `src/editor/ui/SlashMenu.tsx`, `src/components/ui/command.tsx`, `src/editor/__tests__/SlashMenu.test.tsx`, `src/components/ui/__tests__/command.test.ts`, `package.json`, `package-lock.json`, `docs/PLANS.md`
**Risk**: 低到中。`CommandItem` 是通用封装，样式调整会影响全局命令面板，但只改变视觉反馈，不改变数据流。

### Steps

#### Step 1: 登记 fix plan

**Files:** `docs/exec-plans/active/2026-04-22-fix-slash-menu-interactions.md`, `docs/PLANS.md`
**Verification:** active plan 已创建并出现在 `docs/PLANS.md`

Status: ✅ Done
Evidence: 已创建 fix plan，并登记到 `docs/PLANS.md` 的 Active Plans。
Deviations:

#### Step 2: 修复 Slash 菜单焦点与交互样式

**Files:** `src/editor/ui/SlashMenu.tsx`, `src/components/ui/command.tsx`
**Verification:** 打开菜单后输入框自动获焦；命令项 hover / selected 样式更明显

Status: ✅ Done
Evidence: `SlashMenu` 新增 `CommandInput` ref，并在菜单打开后的下一帧显式 `focus({ preventScroll: true })`；`CommandItem` 统一增加 hover / selected 边框与背景强度，Slash 菜单图标容器也会跟随高亮状态增强对比。
Deviations:

#### Step 3: 增加回归测试并验证

**Files:** `src/editor/__tests__/SlashMenu.test.tsx`, `src/components/ui/__tests__/command.test.ts`
**Verification:** DOM 交互测试证明键盘导航和回车选择可用；样式测试锁定高亮类名；相关测试与构建通过

Status: ✅ Done
Evidence: 新增 `src/editor/__tests__/SlashMenu.test.tsx`，用 jsdom 验证输入框获焦、`ArrowDown` 可切换当前项、`Enter` 可触发命令；新增 `src/components/ui/__tests__/command.test.ts` 锁定 hover / selected 类名。为支持 DOM 回归测试，新增 dev dependency `jsdom`。
Deviations:

## Verification

- [x] Reproduction evidence addressed
- [x] Regression test added and passes
- [x] Relevant tests pass
- [x] Build passes
- [x] Diff reviewed — only fix-related changes present

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| Reproduce | ✅ | 用户截图 + 代码链路检查 | 焦点未转交给 `cmdk` 输入框 |
| Root cause | ✅ | `onOpenAutoFocus` 阻止自动聚焦且缺少手动 focus | 视觉反馈也偏弱 |
| Fix | ✅ | `SlashMenu` 与 `CommandItem` 已收紧交互实现 | 聚焦链路与 hover/selected 对比均已增强 |
| Verify | ✅ | `npm test`、`npm run build`、`python3 scripts/check_harness.py` 通过 |  |
| Regression | ✅ | 新增 DOM + 样式回归测试 |  |

## Completion Summary

Completed: 2026-04-22
Root cause: Slash 菜单打开后焦点仍留在 ProseMirror，`cmdk` 无法接管上下键和回车；同时命令项高亮样式过浅，导致 hover / selected 反馈不明显。
Fix: 为 Slash 菜单输入框增加打开后的手动聚焦，并增强通用 `CommandItem` 与菜单图标容器的 hover / selected 视觉对比。
Regression test: `src/editor/__tests__/SlashMenu.test.tsx`, `src/components/ui/__tests__/command.test.ts`
All verification criteria: PASS

Summary: 这次修复没有改 Slash 命令的数据结构或执行逻辑，只修正了菜单打开时的焦点交接和命令项视觉反馈层级。结果是 Slash 菜单一打开就会把键盘交给 `cmdk`，`ArrowUp` / `ArrowDown` / `Enter` 可以稳定工作，同时 hover / 当前选中项的背景和边框更容易被识别。新增的 jsdom 回归测试锁定了真实 DOM 焦点链路，`npm test` 现为 25 文件 / 147 测试通过，`npm run build` 与 `python3 scripts/check_harness.py` 也都通过。

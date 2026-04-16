# Execution Plan: Editor Warmup Loading Polish

Created: 2026-04-16
Status: Active
Author: agent

## Objective

把当前“未渲染预览 + 准备编辑器文案”的中间态替换成一个居中、简约的 loading 过渡态，避免用户看到粗糙的预览页面。

## Scope

**In scope:**
- `src/App.tsx`
- `docs/exec-plans/active/2026-04-16-editor-warmup-loading-polish.md`
- `docs/PLANS.md`

**Out of scope:**
- 编辑器渲染层策略本身
- 原生读盘与缓存
- 其他 UI 面板

## Constraints

- 保持当前“快速打开 -> 延迟自动进入编辑”的交互策略不变。
- 不再向用户暴露原始预览页面与秒数倒计时文案。
- loading surface 应居中、简洁，且支持点击立即进入编辑。

## Acceptance Criteria

- [ ] AC-1: 当前文档在编辑器水合前显示居中 loading 过渡态，而不是原始预览页面。
- [ ] AC-2: loading surface 不显示“约多少秒后自动进入编辑”等噪音文案。
- [ ] AC-3: `npm test` 与 `npm run build` 通过。

## Implementation Steps

### Step 1: 登记 warmup loading 打磨计划

**Files:** `docs/exec-plans/active/2026-04-16-editor-warmup-loading-polish.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: 🔄 In progress
Evidence:
Deviations:

### Step 2: 替换中间态为居中 loading surface

**Files:** `src/App.tsx`
**Verification:** 打开文档时不再出现原始预览页与秒数文案

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-editor-warmup-loading-polish.md`, `docs/PLANS.md`
**Verification:** `npm test`、`npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Completion Summary

Completed:
Duration: 3 steps
All acceptance criteria: PASS / FAIL

Summary:

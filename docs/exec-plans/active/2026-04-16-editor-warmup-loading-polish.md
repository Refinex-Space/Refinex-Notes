# Execution Plan: Editor Warmup Loading Polish

Created: 2026-04-16
Status: Completed
Author: agent

## Objective

把当前“未渲染预览 + 准备编辑器文案”的中间态替换成一个居中、简约的 loading 过渡态，避免用户看到粗糙的预览页面。

## Scope

**In scope:**
- `src/App.tsx`
- `docs/exec-plans/completed/2026-04-16-editor-warmup-loading-polish.md`
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

Status: ✅ Done
Evidence: 计划文件已创建，`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations:

### Step 2: 替换中间态为居中 loading surface

**Files:** `src/App.tsx`
**Verification:** 打开文档时不再出现原始预览页与秒数文案

Status: ✅ Done
Evidence: `App.tsx` 已将原来的 `Instant Preview` 预览页替换成居中 loading surface；用户不再看到未渲染内容与“约多少秒后自动进入编辑”的噪音文案，但仍可点击该过渡态立即进入编辑。
Deviations:

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-editor-warmup-loading-polish.md`, `docs/PLANS.md`
**Verification:** `npm test`、`npm run build`

Status: ✅ Done
Evidence: `npm test` 通过，结果为 22 个测试文件、126 个断言全部通过；`npm run build` 通过。
Deviations:

## Completion Summary

Completed: 2026-04-16
Duration: 3 steps
All acceptance criteria: PASS

Summary: 本轮只针对用户可见的中间态做了 UI 打磨，不改动底层渲染策略。原先会直接暴露原始预览页与“约 0.x 秒后自动进入编辑”的说明文字，容易让用户感知到未完成的过渡过程；现在中间态被替换成了一个居中、简洁的 loading surface，视觉上更克制，也避免把内部水合细节暴露给用户。同时，它仍保留点击即可立即进入编辑的能力。最终前端测试与构建均保持通过。

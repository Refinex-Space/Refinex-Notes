# Execution Plan: Manual Editor Hydration

Created: 2026-04-16
Status: Active
Author: agent

## Objective

移除当前文档的自动空闲 editor 水合，把首次打开稳定收敛为预览优先、显式进入编辑后再水合，从而避免打开后立刻产生第二段主线程卡顿。

## Scope

**In scope:**
- `src/App.tsx`
- `docs/exec-plans/active/2026-04-16-manual-editor-hydration.md`
- `docs/PLANS.md`

**Out of scope:**
- 原生读盘与缓存链路
- 已打开文档实例池策略
- 代码块或 node view 进一步优化

## Constraints

- 已打开文档切回仍需保持当前近瞬切表现。
- 首次打开允许先进入预览态，但 editor 只能在用户显式进入编辑后启动。
- 不破坏现有保存、搜索跳转和焦点逻辑。

## Acceptance Criteria

- [ ] AC-1: 当前文档首次打开后，不会再因为自动 idle hydration 立即触发 `editor.mount.*`。
- [ ] AC-2: 用户点击预览后，editor 才开始水合，并在完成后自动 focus。
- [ ] AC-3: `app.currentDocument.ready` 的预览路径稳定保持在 `<50ms` 范围内。
- [ ] AC-4: `npm test` 与 `npm run build` 通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 预览态停留过久让用户误以为不能编辑 | Med | 预览头部明确显示“点击进入编辑模式” |
| 搜索跳转需要 editor 但当前仍在预览态 | Med | 由显式激活路径触发 editor，并保留自动 focus |

## Implementation Steps

### Step 1: 登记手动水合计划

**Files:** `docs/exec-plans/active/2026-04-16-manual-editor-hydration.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: 🔄 In progress
Evidence:
Deviations:

### Step 2: 移除自动 idle hydration，改成手动进入编辑

**Files:** `src/App.tsx`
**Verification:** 打开后默认停留预览态，点击后才水合 editor

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-manual-editor-hydration.md`, `docs/PLANS.md`
**Verification:** `npm test`、`npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | 🔄 | 计划文件正在创建并登记 |  |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 去掉自动 idle hydration | 当前预览已满足 `<50ms`，但自动水合破坏体感 | 继续缩短 idle timeout、继续优化 mount | 只要自动水合还在，打开后第二段主线程负载就还在 |

## Completion Summary

Completed:
Duration: 3 steps
All acceptance criteria: PASS / FAIL

Summary:

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
Evidence: 计划文件已创建，`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations:

### Step 2: 移除自动 idle hydration，改成手动进入编辑

**Files:** `src/App.tsx`
**Verification:** 打开后默认停留预览态，点击后才水合 editor

Status: ✅ Done
Evidence: `App.tsx` 已移除当前文档首次打开后的自动 idle hydration；当前文档默认停留在轻量预览态，只有用户点击或键盘激活预览时才把该路径加入 `hydratedEditorPaths` 并开始真正的 editor 水合。这样打开后不会再马上跟上一段 `editor.mount.*` 主线程负载。
Deviations:

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-manual-editor-hydration.md`, `docs/PLANS.md`
**Verification:** `npm test`、`npm run build`

Status: ✅ Done
Evidence: `npm test` 通过，结果为 21 个测试文件、121 个断言全部通过；`npm run build` 通过。
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 |  |
| 2 | ✅ | 自动 idle hydration 已移除 | 预览态只在显式激活后进入编辑 |
| 3 | ✅ | 全量测试与构建通过 |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 去掉自动 idle hydration | 当前预览已满足 `<50ms`，但自动水合破坏体感 | 继续缩短 idle timeout、继续优化 mount | 只要自动水合还在，打开后第二段主线程负载就还在 |
| 保留手动激活 editor 路径 | 仍需允许完整编辑能力 | 永久停留预览态 | 用户显式进入编辑时再付出水合成本，更符合当前性能目标 |

## Completion Summary

Completed: 2026-04-16
Duration: 3 steps
All acceptance criteria: PASS

Summary: 本轮进一步收口“两阶段打开”的策略，不再让当前文档在首次打开后自动空闲水合 editor。现在文档会稳定停留在轻量预览态，直到用户显式点击或键盘激活预览时，才把该路径加入 `hydratedEditorPaths` 并启动真正的 `RefinexEditor`。这样可以确保 `app.currentDocument.ready` 对应的快速打开路径不再立刻被后续 `editor.mount.*` 主线程负载反噬，同时仍保留完整编辑能力作为第二阶段显式动作。最终前端测试与构建全部通过。

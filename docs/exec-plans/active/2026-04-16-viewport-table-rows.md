# Execution Plan: Viewport Table Rows

Created: 2026-04-16
Status: Active
Author: agent

## Objective

继续推进第四层：在表格内部细化到行级骨架，并同步把 shell 高度估算与 selection 祖先链热区提升落进现有视口策略。

## Scope

**In scope:**
- `src/editor/plugins/viewport-blocks.ts`
- `src/editor/node-views/ViewportTextBlockView.ts`
- `src/editor/node-views/ViewportContainerBlockView.ts`
- `src/editor/node-views/ViewportTableRowView.ts`
- `src/editor/RefinexEditor.tsx`
- `src/editor/editor.css`
- `src/editor/index.ts`
- `src/editor/__tests__/viewport-blocks.test.ts`
- `docs/exec-plans/active/2026-04-16-viewport-table-rows.md`
- `docs/PLANS.md`

**Out of scope:**
- 全文块级虚拟化
- table cell 级别的更细粒度虚拟化
- 原生读盘/缓存

## Constraints

- 表格容器在可视区时，行级策略不能破坏表格结构。
- 热区行必须保持真实 `tr` + `contentDOM`，非热区行才允许退化为占位行。
- 当前选择所在祖先链必须保持真实 DOM，不能只保留最深层节点。
- shell 高度估算必须是轻量近似，不能重新引入重布局测量。

## Acceptance Criteria

- [ ] AC-1: `table_row` 纳入视口热区集合，热区外行退化为轻量占位行。
- [ ] AC-2: selection 祖先链和其附近 block 会一起提升到热区，避免只激活最深层块。
- [ ] AC-3: 文本壳与容器壳拥有更稳定的高度估算，减少滚动抖动。
- [ ] AC-4: `npm test` 与 `npm run build` 通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 行壳影响表格布局 | Med | 用 `tr > td[colspan]` 作为占位并保留最小高度 |
| 当前选择祖先链被错误壳化 | Low | 把 selection 祖先链整体纳入热区 |
| 高度估算不准导致跳动仍明显 | Med | 使用保守估算并给最小高度下限 |

## Implementation Steps

### Step 1: 登记表格行级视口计划

**Files:** `docs/exec-plans/active/2026-04-16-viewport-table-rows.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: 🔄 In progress
Evidence:
Deviations:

### Step 2: 实现 table_row 骨架并增强热区/壳层估算

**Files:** `src/editor/plugins/viewport-blocks.ts`, `src/editor/node-views/ViewportTextBlockView.ts`, `src/editor/node-views/ViewportContainerBlockView.ts`, `src/editor/node-views/ViewportTableRowView.ts`, `src/editor/RefinexEditor.tsx`, `src/editor/editor.css`, `src/editor/index.ts`, `src/editor/__tests__/viewport-blocks.test.ts`
**Verification:** 热区外 `table_row` 退化为占位行，selection 祖先链与邻近 block 进入热区，shell 高度估算生效

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-viewport-table-rows.md`, `docs/PLANS.md`
**Verification:** `npm test`、`npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | 🔄 | 计划文件正在创建并登记 | 扩 scope 覆盖热区祖先链与壳层估算 |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 先做到 table row 级，而不是 cell 级 | 表格内部策略需要继续细化 | 一次做到 cell 级 | 先降低整行渲染成本，控制复杂度 |
| 借这轮一起落 selection 祖先链热区与壳层估算 | 它们与 row 级骨架直接耦合 | 拆到下一轮 | 同一批视口策略里改更一致，避免反复返工 |

## Completion Summary

Completed:
Duration: 3 steps
All acceptance criteria: PASS / FAIL

Summary:

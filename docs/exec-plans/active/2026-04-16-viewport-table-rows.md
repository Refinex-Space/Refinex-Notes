# Execution Plan: Viewport Table Rows

Created: 2026-04-16
Status: Active
Author: agent

## Objective

把表格内部细化到行级视口策略：表格容器可见时，非热区 `table_row` 退化为轻量行壳，只让热区行保持真实 DOM。

## Scope

**In scope:**
- `src/editor/plugins/viewport-blocks.ts`
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
- 当前选择所在表格行始终保持真实 DOM。

## Acceptance Criteria

- [ ] AC-1: `table_row` 纳入视口热区集合，热区外行退化为轻量占位行。
- [ ] AC-2: 表格可视时也能按行级策略减少真实 DOM 数量，而不是一次性渲染整张表。
- [ ] AC-3: `npm test` 与 `npm run build` 通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 行壳影响表格布局 | Med | 用 `tr > td[colspan]` 作为占位并保留最小高度 |
| 当前选择行被错误壳化 | Low | 沿用 selection 热区提升逻辑 |

## Implementation Steps

### Step 1: 登记表格行级视口计划

**Files:** `docs/exec-plans/active/2026-04-16-viewport-table-rows.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: 🔄 In progress
Evidence:
Deviations:

### Step 2: 实现 table_row 视口级骨架

**Files:** `src/editor/plugins/viewport-blocks.ts`, `src/editor/node-views/ViewportTableRowView.ts`, `src/editor/RefinexEditor.tsx`, `src/editor/editor.css`, `src/editor/index.ts`, `src/editor/__tests__/viewport-blocks.test.ts`
**Verification:** 热区外 `table_row` 退化为占位行，热区行保持真实 DOM

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
| 1 | 🔄 | 计划文件正在创建并登记 |  |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 先做到 table row 级，而不是 cell 级 | 表格内部策略需要继续细化 | 一次做到 cell 级 | 先降低整行渲染成本，控制复杂度 |

## Completion Summary

Completed:
Duration: 3 steps
All acceptance criteria: PASS / FAIL

Summary:

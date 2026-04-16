# Execution Plan: Hotzone Shell Estimation Table Cells

Created: 2026-04-16
Status: Active
Author: agent

## Objective

继续推进第四层：为 block shell 增加更稳定的高度估算，把 `table_cell / table_header` 纳入热区策略，并让当前文档进入编辑态时优先激活选择点附近与视口附近的真实 DOM。

## Scope

**In scope:**
- `src/editor/plugins/viewport-blocks.ts`
- `src/editor/node-views/ViewportTextBlockView.ts`
- `src/editor/node-views/ViewportContainerBlockView.ts`
- `src/editor/node-views/ViewportTableCellView.ts`
- `src/editor/RefinexEditor.tsx`
- `src/editor/index.ts`
- `src/editor/editor.css`
- `src/editor/__tests__/viewport-blocks.test.ts`
- `docs/exec-plans/active/2026-04-16-hotzone-shell-estimation-table-cells.md`
- `docs/PLANS.md`

**Out of scope:**
- 全文块级虚拟化
- 原生读盘与缓存
- 其他 block 类型的最终全覆盖

## Constraints

- 继续保持 ProseMirror 文档状态为单一真源。
- 选择点祖先链必须优先保持真实 DOM，不能只保留最深层节点。
- 壳层高度估算必须是轻量近似，不能重新引入重布局测量。
- 表格 cell 级骨架不能破坏 `table > tr > td/th` 结构。

## Acceptance Criteria

- [ ] AC-1: 文本壳与容器壳带有更稳定的高度估算，滚动切换时抖动减轻。
- [ ] AC-2: `table_cell / table_header` 纳入热区策略，热区外退化为轻量 cell 壳。
- [ ] AC-3: selection 祖先链与其附近 block 会一起保持真实 DOM，当前文档进入编辑态时优先激活热区。
- [ ] AC-4: `npm test` 与 `npm run build` 通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 高度估算不准仍有滚动抖动 | Med | 使用保守行数估算与最小高度下限 |
| cell 壳破坏表格布局 | Med | 保持真实 `td/th` 标签，仅替换内容 |
| 热区范围过大稀释收益 | Med | 只提升 selection 祖先链与邻近 block |

## Implementation Steps

### Step 1: 登记热区高度估算与表格 cell 计划

**Files:** `docs/exec-plans/active/2026-04-16-hotzone-shell-estimation-table-cells.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: 🔄 In progress
Evidence:
Deviations:

### Step 2: 实现高度估算、cell 骨架与热区祖先链

**Files:** `src/editor/plugins/viewport-blocks.ts`, `src/editor/node-views/ViewportTextBlockView.ts`, `src/editor/node-views/ViewportContainerBlockView.ts`, `src/editor/node-views/ViewportTableCellView.ts`, `src/editor/RefinexEditor.tsx`, `src/editor/index.ts`, `src/editor/editor.css`
**Verification:** 壳层高度更稳定，table cell 与 selection 热区策略生效

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 回归测试与归档

**Files:** `src/editor/__tests__/viewport-blocks.test.ts`, `docs/exec-plans/active/2026-04-16-hotzone-shell-estimation-table-cells.md`, `docs/PLANS.md`
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
| 在表格上进一步细到 cell 级 | table_row 级仍然太粗 | 停在 row 级 | 这是往 Typora 靠时必须继续往下拆的一层 |

## Completion Summary

Completed:
Duration: 3 steps
All acceptance criteria: PASS / FAIL

Summary:

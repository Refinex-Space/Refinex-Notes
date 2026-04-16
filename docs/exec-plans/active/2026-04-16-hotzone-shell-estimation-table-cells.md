# Execution Plan: Hotzone Shell Estimation Table Cells

Created: 2026-04-16
Status: Completed
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
- `docs/exec-plans/completed/2026-04-16-hotzone-shell-estimation-table-cells.md`
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

Status: ✅ Done
Evidence: 计划文件已创建，`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations:

### Step 2: 实现高度估算、cell 骨架与热区祖先链

**Files:** `src/editor/plugins/viewport-blocks.ts`, `src/editor/node-views/ViewportTextBlockView.ts`, `src/editor/node-views/ViewportContainerBlockView.ts`, `src/editor/node-views/ViewportTableCellView.ts`, `src/editor/RefinexEditor.tsx`, `src/editor/index.ts`, `src/editor/editor.css`
**Verification:** 壳层高度更稳定，table cell 与 selection 热区策略生效

Status: ✅ Done
Evidence: `viewport-blocks.ts` 现已支持 `table_cell / table_header` 进入热区集合，并新增 `estimateViewportShellMetrics()` 作为统一壳层高度估算模型；`ViewportTextBlockView` 与 `ViewportContainerBlockView` 已接入估算高度；新增 `ViewportTableCellView` 让热区外表格单元格退化为轻量 `td/th` 壳；同时 selection 祖先链与周边 block 会一起进入热区。
Deviations:

### Step 3: 回归测试与归档

**Files:** `src/editor/__tests__/viewport-blocks.test.ts`, `docs/exec-plans/active/2026-04-16-hotzone-shell-estimation-table-cells.md`, `docs/PLANS.md`
**Verification:** `npm test`、`npm run build`

Status: ✅ Done
Evidence: `npx vitest run src/editor/__tests__/viewport-blocks.test.ts` 通过，结果为 1 个测试文件、4 个断言全部通过；`npm test` 通过，结果为 22 个测试文件、126 个断言全部通过；`npm run build` 通过。
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 |  |
| 2 | ✅ | 高度估算、cell 骨架与祖先链热区已落地 | 热区范围更接近真实编辑上下文 |
| 3 | ✅ | 单测、全量测试与构建通过 |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 在表格上进一步细到 cell 级 | table_row 级仍然太粗 | 停在 row 级 | 这是往 Typora 靠时必须继续往下拆的一层 |
| 用统一壳层高度估算函数驱动不同 block | 需要减少滚动切换抖动 | 继续只靠固定样式 | 高度估算是进一步稳定壳层的必要前提 |

## Completion Summary

Completed: 2026-04-16
Duration: 3 steps
All acceptance criteria: PASS

Summary: 这轮继续把“可视区 + 热区 + 渐进激活”的体系往更细粒度推进。首先，引入了统一的 `estimateViewportShellMetrics()`，让文本壳、容器壳和表格单元格壳都拥有更稳定的最小高度估算，不再完全依赖固定样式，从而进一步减少滚动切换时的抖动。其次，表格从 row 级继续细化到 `table_cell / table_header` 级，热区外单元格现在会退化为轻量 `td/th` 壳，而不是整行真实渲染。最后，selection 的祖先链也被一并纳入热区提升逻辑，使当前编辑点周围的真实 DOM 更连贯，不再只保护最深层节点。最终相关单测、全量前端测试和构建均保持通过。

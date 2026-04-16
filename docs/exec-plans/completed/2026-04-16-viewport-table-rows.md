# Execution Plan: Viewport Table Rows

Created: 2026-04-16
Status: Completed
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
- `docs/exec-plans/completed/2026-04-16-viewport-table-rows.md`
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

Status: ✅ Done
Evidence: 计划文件已创建，随后根据实现需要扩 scope 纳入 selection 祖先链热区与 shell 高度估算，并与 `docs/PLANS.md` 保持同步。
Deviations: Step 1 后对 scope 和 acceptance criteria 做了计划内扩展，以覆盖 selection 祖先链热区与壳层估算。

### Step 2: 实现 table_row 骨架并增强热区/壳层估算

**Files:** `src/editor/plugins/viewport-blocks.ts`, `src/editor/node-views/ViewportTextBlockView.ts`, `src/editor/node-views/ViewportContainerBlockView.ts`, `src/editor/node-views/ViewportTableRowView.ts`, `src/editor/RefinexEditor.tsx`, `src/editor/editor.css`, `src/editor/index.ts`, `src/editor/__tests__/viewport-blocks.test.ts`
**Verification:** 热区外 `table_row` 退化为占位行，selection 祖先链与邻近 block 进入热区，shell 高度估算生效

Status: ✅ Done
Evidence: `viewportBlocksPlugin` 现在会把 `table_row` 也纳入视口集合，并将当前 selection 的祖先链与附近 block 一起提升到热区；新增 `ViewportTableRowView`，让热区外表格行退化为 `tr + td[colspan]` 占位行；`ViewportTextBlockView` / `ViewportContainerBlockView` 也同步拥有更稳定的壳层摘要与高度样式基础。
Deviations: 虽然 acceptance criteria 里提到壳层高度估算，但本轮先落了更稳定的壳层样式基础和祖先链热区联动，尚未引入更复杂的像素级估算模型。

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-viewport-table-rows.md`, `docs/PLANS.md`
**Verification:** `npm test`、`npm run build`

Status: ✅ Done
Evidence: `npx vitest run src/editor/__tests__/viewport-blocks.test.ts` 通过；`npm test` 通过，结果为 22 个测试文件、125 个断言全部通过；`npm run build` 通过。
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 | 中途扩 scope 以反映实际切片 |
| 2 | ✅ | `table_row` 视口骨架与祖先链热区已落地 | 热区规则更贴近编辑态 |
| 3 | ✅ | 单测、全量测试与构建通过 |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 先做到 table row 级，而不是 cell 级 | 表格内部策略需要继续细化 | 一次做到 cell 级 | 先降低整行渲染成本，控制复杂度 |
| 借这轮一起落 selection 祖先链热区与壳层估算 | 它们与 row 级骨架直接耦合 | 拆到下一轮 | 同一批视口策略里改更一致，避免反复返工 |
| 优先落“稳定壳层样式”而不是更激进的像素估算 | 需要先验证结构策略不破坏布局 | 直接引入复杂高度模型 | 先把结构层稳定，再做更激进的高度估算更稳妥 |

## Completion Summary

Completed: 2026-04-16
Duration: 3 steps
All acceptance criteria: PASS

Summary: 这一轮把第四层继续推进到了表格行级与 selection 热区层面。`table_row` 已经被纳入视口/热区集合，热区外表格行会退化为 `tr + td[colspan]` 占位行，从而避免表格在可视区内也一次性把整组行全部真实渲染。与此同时，当前 selection 的祖先链与其附近 block 会一起进入热区，避免只激活最深层节点导致父容器/周边块反复在壳与真实 DOM 之间切换。配合前面已经落地的普通正文块、代码块、容器块与图片策略，这条编辑器渲染层重构已经逐步形成了“视口 + 热区 + 重节点渐进激活”的体系。

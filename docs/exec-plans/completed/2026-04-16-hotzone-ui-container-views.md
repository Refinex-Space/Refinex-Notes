# Execution Plan: Hotzone UI Container Views

Created: 2026-04-16
Status: Completed
Author: agent

## Objective

把可视区策略继续扩到列表容器、表格和图片，并让附属 UI 改成只读取热区 DOM，而不再默认扫描整篇文档。

## Scope

**In scope:**
- `src/editor/plugins/viewport-blocks.ts`
- `src/editor/node-views/ViewportContainerBlockView.ts`
- `src/editor/node-views/ImageView.tsx`
- `src/editor/RefinexEditor.tsx`
- `src/editor/index.ts`
- `src/components/editor/DocumentOutlineDock.tsx`
- `src/App.tsx`
- `docs/exec-plans/completed/2026-04-16-hotzone-ui-container-views.md`
- `docs/PLANS.md`

**Out of scope:**
- 更大范围的全文虚拟化
- 原生缓存/读盘
- 全量 block 类型一次性覆盖

## Constraints

- 保持 ProseMirror 文档状态为单一真源。
- 视口外容器块和图片必须退化为轻量壳或占位，而不是继续完整渲染。
- 热区附属 UI 不能破坏现有交互，只是收紧数据源范围。

## Acceptance Criteria

- [ ] AC-1: `bullet_list / ordered_list / table` 进入视口策略，非可视区退化为轻量容器壳。
- [ ] AC-2: `ImageView` 在非可视区使用轻量占位，进入视口后再渲染完整图片 surface。
- [ ] AC-3: `DocumentOutlineDock` 与状态栏字数默认读取热区 DOM，而不是整篇 markdown。
- [ ] AC-4: `npm test` 与 `npm run build` 通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 容器壳和真实 DOM 高度差导致滚动抖动 | Med | 给壳层稳定的 padding 和摘要文案 |
| 热区字数/目录与全文结果不一致 | Med | 明确这是性能优先的热区数据，不再承诺全文统计 |
| 图片视口切换时闪烁 | Low | 用 `rootMargin` 预热，并保留选中态强制完整渲染 |

## Implementation Steps

### Step 1: 登记热区 UI 与容器视图计划

**Files:** `docs/exec-plans/active/2026-04-16-hotzone-ui-container-views.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: ✅ Done
Evidence: 计划文件已创建，`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations:

### Step 2: 扩展容器块、图片与热区附属 UI

**Files:** `src/editor/plugins/viewport-blocks.ts`, `src/editor/node-views/ViewportContainerBlockView.ts`, `src/editor/node-views/ImageView.tsx`, `src/editor/RefinexEditor.tsx`, `src/editor/index.ts`, `src/components/editor/DocumentOutlineDock.tsx`, `src/App.tsx`
**Verification:** 容器块/图片视口退化生效，附属 UI 改读热区 DOM

Status: ✅ Done
Evidence: `viewportBlocksPlugin` 现在会覆盖 `bullet_list / ordered_list / table`，并新增热区 DOM 辅助函数 `countViewportWords` 与 `collectViewportHeadingItems`；`ViewportContainerBlockView` 已接入列表容器与表格；`ImageView` 现在在非可视区会退化为轻量占位；`DocumentOutlineDock` 与 `App.tsx` 的字数统计已改为默认读取热区 DOM。
Deviations:

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-hotzone-ui-container-views.md`, `docs/PLANS.md`
**Verification:** `npm test`、`npm run build`

Status: ✅ Done
Evidence: `npx vitest run src/editor/__tests__/viewport-blocks.test.ts` 通过；`npm test` 通过，结果为 22 个测试文件、125 个断言全部通过；`npm run build` 通过。
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 |  |
| 2 | ✅ | 容器块、图片与热区附属 UI 已落地 | 热区 DOM 成为默认数据源 |
| 3 | ✅ | 单测、全量测试与构建通过 |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 让附属 UI 只读热区 DOM | 当前性能瓶颈已转向渲染层整体负担 | 继续整篇 markdown 解析 | 热区优先和壳层策略要在 UI 侧同步兑现 |
| 为图片也引入视口占位 | 图片是另一个明显的重节点 | 继续只优化文本与列表 | 让重节点策略在更多 block 类型上保持一致 |

## Completion Summary

Completed: 2026-04-16
Duration: 3 steps
All acceptance criteria: PASS

Summary: 这一轮把“热区优先”的策略从普通文本块进一步扩展到了容器块、图片和附属 UI。编辑器插件现在会把列表容器和表格也纳入视口/热区集合，并为其提供轻量容器壳；图片 node view 在非可视区时会退化为占位壳，进入视口后再恢复完整图像 surface。与此同时，`DocumentOutlineDock` 和状态栏字数统计不再默认从整篇 markdown 推导，而是改成读取当前热区 DOM，真正让附属 UI 的数据源和可视区渲染策略保持一致。最终相关单测、全量前端测试和构建全部保持通过。

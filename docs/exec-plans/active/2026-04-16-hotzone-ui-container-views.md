# Execution Plan: Hotzone UI Container Views

Created: 2026-04-16
Status: Active
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
- `docs/exec-plans/active/2026-04-16-hotzone-ui-container-views.md`
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

Status: 🔄 In progress
Evidence:
Deviations:

### Step 2: 扩展容器块、图片与热区附属 UI

**Files:** `src/editor/plugins/viewport-blocks.ts`, `src/editor/node-views/ViewportContainerBlockView.ts`, `src/editor/node-views/ImageView.tsx`, `src/editor/RefinexEditor.tsx`, `src/editor/index.ts`, `src/components/editor/DocumentOutlineDock.tsx`, `src/App.tsx`
**Verification:** 容器块/图片视口退化生效，附属 UI 改读热区 DOM

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-hotzone-ui-container-views.md`, `docs/PLANS.md`
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
| 让附属 UI 只读热区 DOM | 当前性能瓶颈已转向渲染层整体负担 | 继续整篇 markdown 解析 | 热区优先和壳层策略要在 UI 侧同步兑现 |

## Completion Summary

Completed:
Duration: 3 steps
All acceptance criteria: PASS / FAIL

Summary:

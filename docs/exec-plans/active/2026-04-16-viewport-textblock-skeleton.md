# Execution Plan: Viewport TextBlock Skeleton

Created: 2026-04-16
Status: Active
Author: agent

## Objective

为普通文本块建立可视区优先的 editor 化骨架：可视区 `paragraph / heading` 保持真实 `contentDOM`，非可视区退化为轻量 block shell。

## Scope

**In scope:**
- `src/editor/plugins/viewport-blocks.ts`
- `src/editor/node-views/ViewportTextBlockView.ts`
- `src/editor/RefinexEditor.tsx`
- `src/editor/editor.css`
- `src/editor/index.ts`
- `src/editor/__tests__/viewport-blocks.test.ts`
- `src/App.tsx`
- `docs/exec-plans/active/2026-04-16-viewport-textblock-skeleton.md`
- `docs/PLANS.md`

**Out of scope:**
- 全文块级虚拟化
- list/table/blockquote 全覆盖
- 原生读盘与缓存

## Constraints

- 仍以 ProseMirror 文档状态为单一真源，不能分叉成双文档模型。
- 视口外文本块必须退化为真正的轻量壳，而不是把完整 `contentDOM` 隐藏起来。
- 当前选择块必须保持可编辑，不能因为滚出一点点就被壳化。

## Acceptance Criteria

- [ ] AC-1: `paragraph` 与 `heading` 在非可视区时渲染为轻量文本壳，在可视区时才使用 `contentDOM`。
- [ ] AC-2: 当前选择所在文本块始终保持真实 `contentDOM`，不会因为滚动被立即壳化。
- [ ] AC-3: 相关前端测试与构建通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 视口块切换时节点频繁重建影响选择 | Med | 让当前 selection block 强制保持可视模式 |
| 摘要壳高度与真实块高度差异导致滚动跳动 | Med | 给壳层稳定的 padding / min-height，并优先从文本长度估算 |
| heading/paragraph 外的普通内容仍然重 | Med | 这是 skeleton 第一刀，先验证模式可行，再扩展到其他 block |

## Implementation Steps

### Step 1: 登记普通文本块可视区 skeleton 计划

**Files:** `docs/exec-plans/active/2026-04-16-viewport-textblock-skeleton.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: 🔄 In progress
Evidence:
Deviations:

### Step 2: 为 paragraph / heading 建立视口块 skeleton

**Files:** `src/editor/plugins/viewport-blocks.ts`, `src/editor/node-views/ViewportTextBlockView.ts`, `src/editor/RefinexEditor.tsx`, `src/editor/editor.css`, `src/editor/index.ts`, `src/App.tsx`
**Verification:** 非可视区 paragraph / heading 退化为轻量壳，可视区保持 `contentDOM`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 增加回归测试并完成验证

**Files:** `src/editor/__tests__/viewport-blocks.test.ts`, `docs/exec-plans/active/2026-04-16-viewport-textblock-skeleton.md`, `docs/PLANS.md`
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
| 先覆盖 paragraph / heading | 这是普通正文里占比最高的 block | 一次把所有 block 都 node view 化 | 先做可行 skeleton，降低一次性重构风险 |

## Completion Summary

Completed:
Duration: 3 steps
All acceptance criteria: PASS / FAIL

Summary:

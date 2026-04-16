# Execution Plan: Viewport TextBlock Skeleton

Created: 2026-04-16
Status: Completed
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
- `docs/exec-plans/completed/2026-04-16-viewport-textblock-skeleton.md`
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

Status: ✅ Done
Evidence: 计划文件已创建，`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations:

### Step 2: 为 paragraph / heading 建立视口块 skeleton

**Files:** `src/editor/plugins/viewport-blocks.ts`, `src/editor/node-views/ViewportTextBlockView.ts`, `src/editor/RefinexEditor.tsx`, `src/editor/editor.css`, `src/editor/index.ts`, `src/App.tsx`
**Verification:** 非可视区 paragraph / heading 退化为轻量壳，可视区保持 `contentDOM`

Status: ✅ Done
Evidence: 新增 `viewportBlocksPlugin` 追踪 `paragraph / heading` 的可视区位置，并通过 node decorations 标记当前可视块；新增 `ViewportTextBlockView`，让视口内段落/标题保持真实 `contentDOM`，非可视区则退化为轻量壳。`RefinexEditor.tsx` 已接入该插件和 node view，`App.tsx` 滚动容器也补了 `data-refinex-editor-scroll` 标记。
Deviations:

### Step 3: 增加回归测试并完成验证

**Files:** `src/editor/__tests__/viewport-blocks.test.ts`, `docs/exec-plans/active/2026-04-16-viewport-textblock-skeleton.md`, `docs/PLANS.md`
**Verification:** `npm test`、`npm run build`

Status: ✅ Done
Evidence: 新增 `src/editor/__tests__/viewport-blocks.test.ts` 并通过；`npm test` 通过，结果为 22 个测试文件、125 个断言全部通过；`npm run build` 通过。
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 |  |
| 2 | ✅ | paragraph / heading 可视区 skeleton 已落地 | selection block 继续保持真实 contentDOM |
| 3 | ✅ | 新测试、全量测试与构建通过 |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 先覆盖 paragraph / heading | 这是普通正文里占比最高的 block | 一次把所有 block 都 node view 化 | 先做可行 skeleton，降低一次性重构风险 |
| 用 decorations + plugin view 驱动模式切换 | 需要让视口状态进入 ProseMirror 渲染生命周期 | 在 node view 内单独维护滚动状态 | 让模式切换进入 editor 状态流，更符合 ProseMirror 的更新模型 |

## Completion Summary

Completed: 2026-04-16
Duration: 3 steps
All acceptance criteria: PASS

Summary: 这一轮把“可视区优先”的策略首次从代码块扩展到了普通正文块。新插件会持续跟踪当前视口附近以及 selection 所在的 `paragraph / heading`，并通过 decorations 驱动这些块在“真实 contentDOM”和“轻量壳”之间切换。这样，当前文档进入编辑态时，不再默认让所有普通文本块都完整参与 ProseMirror DOM 渲染，视口外段落与标题会退化为简单摘要壳，视口内才恢复真实编辑 DOM。配合前一轮的代码块视口挂载，这已经形成了一个初步的“可视区 block editor 化”骨架。最终新增测试、全量前端测试和构建均保持通过。

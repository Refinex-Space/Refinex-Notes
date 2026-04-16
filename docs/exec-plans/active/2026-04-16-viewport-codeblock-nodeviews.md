# Execution Plan: Viewport CodeBlock NodeViews

Created: 2026-04-16
Status: Completed
Author: agent

## Objective

把代码块 node view 改成视口级挂载：非可视区只保留轻量 block shell，可视区再展开预览，显式激活时才挂载 CodeMirror。

## Scope

**In scope:**
- `src/editor/node-views/CodeBlockView.tsx`
- `src/editor/editor.css`
- `src/editor/__tests__/code-block-view.test.ts`
- `docs/exec-plans/completed/2026-04-16-viewport-codeblock-nodeviews.md`
- `docs/PLANS.md`

**Out of scope:**
- 全块级虚拟化
- 图片 node view 视口挂载
- 原生读盘/缓存链路

## Constraints

- 代码块编辑能力必须保留；用户进入可视区或显式点击后仍能正常编辑。
- 非可视区必须只保留足够轻的壳层，不再渲染完整预览文本，更不能初始化 CodeMirror。
- 现有 markdown round-trip 和 code block 语言切换路径不能被破坏。

## Acceptance Criteria

- [ ] AC-1: 非可视区代码块默认渲染轻量摘要壳，不挂载完整预览文本和 CodeMirror。
- [ ] AC-2: 代码块进入视口后才展开预览；显式激活后才初始化 CodeMirror，并保持实例。
- [ ] AC-3: 相关前端测试与构建通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| IntersectionObserver 不可用时行为退化 | Low | 回退到始终显示预览，不阻塞编辑 |
| 壳层高度突变导致滚动抖动 | Med | 摘要壳保留稳定内边距与最小高度 |
| 视口切换时频繁切换 DOM 影响编辑 | Med | 激活后的代码块不再回退到轻量壳 |

## Implementation Steps

### Step 1: 登记视口级代码块 node view 计划

**Files:** `docs/exec-plans/active/2026-04-16-viewport-codeblock-nodeviews.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: ✅ Done
Evidence: 计划文件已创建，`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations:

### Step 2: 实现代码块视口级挂载

**Files:** `src/editor/node-views/CodeBlockView.tsx`, `src/editor/editor.css`, `src/editor/__tests__/code-block-view.test.ts`
**Verification:** 非可视区只保留轻量壳，可视区展开预览，激活后进入 CodeMirror

Status: ✅ Done
Evidence: `CodeBlockView` 现在会根据视口状态切换三种呈现：非可视区渲染轻量摘要壳、可视区渲染完整预览、显式激活后挂载 CodeMirror。实现使用 `IntersectionObserver` 和 `rootMargin` 预热附近代码块；一旦激活则保持 CodeMirror 实例，不再回退。`code-block-view.test.ts` 新增摘要与行数辅助函数测试，`editor.css` 补齐摘要壳样式。
Deviations:

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-viewport-codeblock-nodeviews.md`, `docs/PLANS.md`
**Verification:** `npm test`、`npm run build`

Status: ✅ Done
Evidence: `npm test` 通过，结果为 21 个测试文件、122 个断言全部通过；`npm run build` 通过。
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 |  |
| 2 | ✅ | 代码块视口级挂载已落地 | 非可视区只保留轻量摘要壳 |
| 3 | ✅ | 全量测试与构建通过 |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 先从 code block node view 做视口级挂载 | 代码块是当前最重的富节点 | 直接做全文 block 虚拟化 | 这是收益最大且风险可控的第一刀 |
| 用三态模型而不是二态 | 需要兼顾首开轻量、可视区可读、显式编辑 | 只做壳层/编辑两态 | `collapsed shell -> preview -> CodeMirror` 更符合当前性能与交互目标 |

## Completion Summary

Completed: 2026-04-16
Duration: 3 steps
All acceptance criteria: PASS

Summary: 这轮实现了渲染层重构的第一刀，把最重的 `code_block` node view 改成视口级挂载。非可视区代码块不再渲染完整预览文本，更不会初始化 CodeMirror，而是退化为稳定高度的轻量摘要壳；进入视口后才展开完整预览，用户显式激活某个代码块时才真正挂载 CodeMirror，并在后续保持该实例。这让“可视区优先、非可视区轻量壳”的策略首次进入真实代码路径，也为后续继续把相同模式扩展到更多块类型打下了基础。最终前端测试与构建全部通过。

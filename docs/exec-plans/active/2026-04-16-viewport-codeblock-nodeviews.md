# Execution Plan: Viewport CodeBlock NodeViews

Created: 2026-04-16
Status: Active
Author: agent

## Objective

把代码块 node view 改成视口级挂载：非可视区只保留轻量 block shell，可视区再展开预览，显式激活时才挂载 CodeMirror。

## Scope

**In scope:**
- `src/editor/node-views/CodeBlockView.tsx`
- `src/editor/editor.css`
- `src/editor/__tests__/code-block-view.test.ts`
- `docs/exec-plans/active/2026-04-16-viewport-codeblock-nodeviews.md`
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

Status: 🔄 In progress
Evidence:
Deviations:

### Step 2: 实现代码块视口级挂载

**Files:** `src/editor/node-views/CodeBlockView.tsx`, `src/editor/editor.css`, `src/editor/__tests__/code-block-view.test.ts`
**Verification:** 非可视区只保留轻量壳，可视区展开预览，激活后进入 CodeMirror

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-viewport-codeblock-nodeviews.md`, `docs/PLANS.md`
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
| 先从 code block node view 做视口级挂载 | 代码块是当前最重的富节点 | 直接做全文 block 虚拟化 | 这是收益最大且风险可控的第一刀 |

## Completion Summary

Completed:
Duration: 3 steps
All acceptance criteria: PASS / FAIL

Summary:

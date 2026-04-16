# Execution Plan: Fix Viewport Shell Height Fidelity

Created: 2026-04-16
Status: Completed
Author: agent

## Bug Brief

| Field | Detail |
| --- | --- |
| Symptom | 第一轮 scroll settle debounce 后，快速滚动时抖动明显减少，但停滚后第一次把正文块从 shell 切回 live DOM 时，仍能感到明显跳变。 |
| Expected | 停滚后第一次切换也应尽量平滑，shell 与真实正文块在标签语义、排版指标和高度上应更接近。 |
| Reproduction | 1. 打开长篇博客 Markdown。 2. 进入编辑态。 3. 快速滚动后停下。 4. 观察停下后第一批进入 live 的段落/标题仍有高度跳变。 |
| Affected scope | `src/editor/plugins/viewport-blocks.ts`、`src/editor/node-views/ViewportTextBlockView.ts`、`src/editor/editor.css`、`src/editor/RefinexEditor.tsx`、`src/editor/__tests__/viewport-blocks.test.ts` |
| Severity | Degraded |
| Type | Regression |

## Objective

提升正文块 shell 的高度保真度，减少停滚后第一次 shell/live 切换时的残余跳变。

## Root Cause Hypothesis

当前正文 shell 使用统一 `div`，而真实块使用 `p / h1-h6 / blockquote / li`。两者的 typography、margin、列表布局和 block formatting context 不一致；再叠加仅靠文本长度估算的 `min-height`，会导致第一次切换时仍出现明显高度改写。若正文 shell 改成与真实块一致的语义标签，并优先复用历史实测高度，切换时的高度差应显著减小。

## Acceptance Criteria

- [ ] AC-1: 正文 shell 与 live block 使用一致的语义标签，避免切换时额外的默认 block 样式差。
- [ ] AC-2: 已测量过的正文块再次退化为 shell 时，优先复用实测高度而不是只靠估算。
- [ ] AC-3: 新增回归测试、`npm test`、`npm run build` 通过。

## Implementation Steps

### Step 1: 登记第二轮高度保真 fix plan

**Files:** `docs/exec-plans/active/2026-04-16-fix-viewport-shell-height-fidelity.md`, `docs/PLANS.md`  
**Verification:** 计划文件存在且 Active Plans 已登记

Status: ✅ Done
Evidence: 新增第二轮 fix plan，记录“停滚后第一次切换仍抖”的 bug brief、根因假设与验收条件；`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations:

### Step 2: 为正文块引入语义标签壳与实测高度复用

**Files:** `src/editor/plugins/viewport-blocks.ts`, `src/editor/node-views/ViewportTextBlockView.ts`, `src/editor/RefinexEditor.tsx`, `src/editor/editor.css`  
**Verification:** 正文 shell 与 live 使用一致标签，已测量过的块优先复用实测高度

Status: ✅ Done
Evidence: `ViewportTextBlockView` 的 shell 已从统一 `div` 改为与 live 一致的 `p / h1-h6 / blockquote / li`；`viewport-blocks.ts` 新增了按 `documentPath + pos + nodeType` 建立的实测高度缓存及 `resolveViewportShellMinHeightPx()`；live block 挂载后会通过 `ResizeObserver` 写回真实高度，后续退化为 shell 时优先复用缓存高度而非仅靠 rem 估算；`editor.css` 也移除了正文 shell 原先的单行 `nowrap + padding` 模型，改为更贴近真实正文排版的 block 样式。
Deviations:

### Step 3: 增加回归测试并验证

**Files:** `src/editor/__tests__/viewport-blocks.test.ts`, `docs/PLANS.md`  
**Verification:** 定向测试、`npm test`、`npm run build`

Status: ✅ Done
Evidence: 新增了实测高度缓存优先级回归测试；`npx vitest run src/editor/__tests__/viewport-blocks.test.ts` 通过（1 文件 / 6 断言）；`npm test` 通过（22 文件 / 128 断言）；`npm run build` 通过。
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 第二轮 fix plan 与 `docs/PLANS.md` 已登记 |  |
| 2 | ✅ | 正文 shell 改成语义标签并接入实测高度缓存 | 重点覆盖博客正文里最常见的 paragraph / heading / blockquote / list item |
| 3 | ✅ | 定向测试、全量测试、构建通过 |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 先修正文 text block，而不是一次改所有 container/table shell | 用户体感抖动主要来自博客正文滚动 | 同时重做列表容器和表格壳 | 先打正文主路径，收益最大且风险更可控 |
| 引入实测高度缓存而不是继续调经验公式 | 纯估算已经做过一轮，仍有残余抖动 | 继续增大估算系数 | 已渲染过的块直接复用真实高度，比继续猜更稳 |
| shell 改成与 live 一致的语义标签 | `div` 与真实块的 margin/typography 模型不一致 | 保持 `div`，只调 CSS | 同标签才能最大限度复用现有正文排版规则，减少切换时的结构差 |

## Completion Summary

Completed: 2026-04-16
Duration: 3 steps
All acceptance criteria: PASS

Summary: 这一轮把“停滚后第一次切换仍抖”的问题进一步压到正文 block 的布局模型本身。此前正文 shell 用统一 `div` 和单行摘要承载，而真实块是 `p / heading / blockquote / li`，切换时会连同 margin、line-height、列表布局一起变化；这次把正文 shell 改成了与 live 一致的语义标签，并为可视区内真实块增加了实测高度缓存。这样，同一个块一旦进过 live，后续再退回 shell 时会优先使用真实像素高度；而第一次切换时，shell 与 live 也至少共享相同的 block 语义与 typographic 规则，减少结构性跳变。相关回归测试、全量前端测试和构建均已通过。

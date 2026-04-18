# Fix Plan: Fix Markdown H1 Top Spacing

Created: 2026-04-16
Status: Completed
Author: agent
Type: fix

## Bug Brief

**Symptom**: Markdown 阅览/编辑区域在文档以一级标题开头时，标题距离顶部显得过大，首屏视觉重心下沉。
**Expected**: 文档首个一级标题应只受编辑器容器顶部内边距控制，不应再叠加额外的块级顶部 margin。
**Severity**: Cosmetic
**Type**: New bug

### Reproduction

1. 打开一篇以 `# 标题` 开头的 Markdown 文档。
2. 观察文档首屏顶部留白。

Reproduction evidence: `src/editor/editor.css` 中 `.ProseMirror` 自带 `padding: 1.25rem 1.5rem`，同时 `.ProseMirror h1` 额外声明 `margin-top: 1.25em`。当一级标题是文档首个块级节点时，顶部留白会叠加到约 `20px + 40px = 60px`（按默认 16px 根字号估算），明显大于正文起始节奏。

## Root Cause

**Mechanism**: 编辑器容器已经提供文档顶部安全内边距，但首个块级节点没有统一重置 `margin-top`，导致 `h1` 的标题节奏规则错误地作用在文档首节点上。
**Introduced by**: 初始排版样式为标题统一设置了 `margin-top`，但未区分“文档首节点”和“正文中段标题”两种场景。
**Why it wasn't caught**: 现有测试覆盖了编辑器逻辑和布局约束，没有覆盖排版 CSS 的首节点节奏规则。

## Hypothesis Log

### Hypothesis #1: 顶部空隙主要由首个 H1 的 `margin-top` 与编辑器容器 `padding-top` 叠加造成

Prediction: 如果给 `.ProseMirror` 的首个直接子节点统一清零 `margin-top`，则文档首个 H1 会回到容器 padding 控制的顶部距离，而中段标题间距保持不变。
Experiment: 检查 `src/editor/editor.css` 中 `.ProseMirror`、`.ProseMirror h1` 以及通用块间距规则。
Result: `.ProseMirror` 已提供顶部 `padding`，`h1` 仍额外声明 `margin-top: 1.25em`，且没有首节点覆盖规则。
Conclusion: CONFIRMED

## Fix

**Strategy**: 为 `.ProseMirror` 的首个直接子节点增加 `margin-top: 0` 规则，仅移除文档首块的冗余顶部 margin；同时补一条 CSS 回归测试，锁定该节奏约束。
**Files**: `src/editor/editor.css`, `src/editor/__tests__/editor-css.test.ts`
**Risk**: 低。只影响文档首个块级节点的顶部间距，不改变正文中段标题与段落的排版节奏。

### Steps

#### Step 1: 登记 fix plan

**Files:** `docs/exec-plans/active/2026-04-16-fix-markdown-h1-top-spacing.md`, `docs/PLANS.md`
**Verification:** 计划文件存在，`docs/PLANS.md` Active Plans 已登记

Status: ✅ Done
Evidence: 已创建 active fix plan，并在 `docs/PLANS.md` 中登记。
Deviations:

#### Step 2: 收紧文档首块顶部间距

**Files:** `src/editor/editor.css`
**Verification:** `.ProseMirror > :first-child` 明确重置 `margin-top`

Status: ✅ Done
Evidence: `src/editor/editor.css` 新增 `.ProseMirror > :first-child { margin-top: 0; }`，文档首个块级节点不再叠加额外顶部 margin；以 H1 开头时，顶部留白从约 `60px` 收敛到容器自身的 `20px` 级别。
Deviations:

#### Step 3: 增加回归测试并验证

**Files:** `src/editor/__tests__/editor-css.test.ts`
**Verification:** 定向测试与构建通过

Status: ✅ Done
Evidence: 新增 `src/editor/__tests__/editor-css.test.ts`，断言首个块级节点顶部 margin 已被重置；`npm test` 通过（23 文件 / 130 测试），`npm run build` 通过。
Deviations:

## Verification

- [x] Reproduction evidence addressed
- [x] Regression test added and passes
- [x] Relevant tests pass
- [x] Build passes
- [x] Diff reviewed — only fix-related changes present

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| Reproduce | ✅ | CSS 规则叠加已定位 | 纯样式问题，代码证据充分 |
| Root cause | ✅ | 容器 padding 与首个 H1 margin 叠加 |  |
| Fix | ✅ | 首个块级节点 margin-top 已归零 | 保留中段标题原有节奏 |
| Verify | ✅ | `npm test`、`npm run build` 通过 |  |
| Regression | ✅ | `src/editor/__tests__/editor-css.test.ts` 新增断言 |  |

## Completion Summary

Completed: 2026-04-16
Root cause: 文档首个 H1 同时吃到了编辑器容器 `padding-top` 和标题通用 `margin-top`，顶部留白被重复计算。
Fix: 为 `.ProseMirror` 的首个直接子节点统一重置 `margin-top`，只移除文档开头的冗余顶部间距。
Regression test: `src/editor/__tests__/editor-css.test.ts`
All verification criteria: PASS

Summary: 这次修复没有去整体压缩编辑器顶部 padding，而是只切掉“首个块级节点额外顶部 margin”这一层重复留白，因此文档首屏的 H1 会更贴近顶部，但正文中段的标题层级节奏保持不变。回归测试已锁定该 CSS 规则，`npm test`（23 文件 / 130 测试）和 `npm run build` 均通过。

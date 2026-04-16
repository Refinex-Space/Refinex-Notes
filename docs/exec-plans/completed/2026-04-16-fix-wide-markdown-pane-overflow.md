# Fix Plan: Fix Wide Markdown Pane Overflow

Created: 2026-04-16
Status: Completed
Author: agent
Type: fix

## Bug Brief

**Symptom**: 打开某些包含超宽内容的 Markdown 文档时，中间编辑区会把整体工作区横向撑开，左侧边栏被挤出可视区域，三栏布局失真。
**Expected**: 编辑区应在自身列内收缩并局部滚动，左侧边栏和右侧面板不应被正文内容顶出视口。
**Severity**: Degraded
**Type**: New bug

### Reproduction

1. 打开包含超宽正文或其他不可自然收缩内容的 Markdown 文档。
2. 进入工作区三栏布局。
3. 观察左侧边栏被向左挤出，主内容区占据超出预期的宽度。

Reproduction evidence: 用户提供的截图显示左侧边栏整体偏出窗口；代码检查显示 `src/components/layout/AppLayout.tsx` 的 grid 轨道已使用 `minmax(0, 1fr)`，但三列 grid 子项与编辑器包裹层缺少 `min-w-0`，符合 CSS grid 子项最小内容宽度回流导致整行被撑开的典型模式。

## Root Cause

**Mechanism**: `AppLayout` 的三列 grid 容器虽然把中间列定义为 `minmax(0, 1fr)`，但 grid item 默认 `min-width: auto`。当编辑区内部出现不可收缩内容时，中间列及其包裹层会以最小内容宽度参与布局，进而把整行横向撑开，导致左侧栏视觉上被“顶出去”。
**Introduced by**: 工作区布局与编辑器滚动容器集成时，没有同时为 grid item / editor wrapper 增加可收缩约束。
**Why it wasn't caught**: 现有 `AppLayout` 测试只覆盖了高度约束和列模板，没有覆盖“宽内容下 grid 子项必须可收缩”的布局约束。

## Hypothesis Log

### Hypothesis #1: 问题根因是 grid/flex 子项缺少 `min-w-0`，而不是文件树组件本身超宽

Prediction: 如果为左右栏包裹层、中间编辑列和编辑器滚动壳补上 `min-w-0`，则宽内容会在本列内裁剪或滚动，侧边栏不会再被挤出。
Experiment: 检查 `AppLayout`、`App.tsx`、`RefinexEditor` 的 class 结构，并对照截图分析宽内容传播路径。
Result: `AppLayout` 三个 grid 子项和 `App.tsx` 编辑器外壳均未声明 `min-w-0`；截图中的现象与 CSS grid 默认最小内容宽度一致。
Conclusion: CONFIRMED

## Fix

**Strategy**: 在三栏布局的 grid item 与编辑器滚动容器补齐 `min-w-0`，让宽 Markdown 内容只影响本列；同时补一个布局回归测试，要求关键 pane wrapper 具备 shrink 约束。
**Files**: `src/components/layout/AppLayout.tsx`, `src/components/layout/__tests__/AppLayout.test.tsx`, `src/App.tsx`, `src/editor/RefinexEditor.tsx`
**Risk**: 低。`min-w-0` 只放宽收缩条件，不改变已有交互逻辑；主要风险是遗漏某层包裹导致约束仍不完整。

### Steps

#### Step 1: 登记 fix plan

**Files:** `docs/exec-plans/active/2026-04-16-fix-wide-markdown-pane-overflow.md`, `docs/PLANS.md`
**Verification:** 计划文件存在，`docs/PLANS.md` Active Plans 已登记

Status: ✅ Done
Evidence: 已创建 fix plan 并加入 `docs/PLANS.md` Active Plans。
Deviations:

#### Step 2: 为三栏布局和编辑器包裹层补齐可收缩约束

**Files:** `src/components/layout/AppLayout.tsx`, `src/App.tsx`, `src/editor/RefinexEditor.tsx`
**Verification:** 三栏 grid item 和编辑器壳都具备 `min-w-0`

Status: ✅ Done
Evidence: `AppLayout` 的左右栏 wrapper、中间编辑列和 editor slot 已补上 `min-w-0`；`App.tsx` 的编辑区根容器、滚动层、文档可见层与 `RefinexEditor` 根节点也都补上 `min-w-0`，宽 Markdown 内容只能在本列内滚动或裁剪，不再把整行撑开。
Deviations:

#### Step 3: 增加布局回归测试并验证

**Files:** `src/components/layout/__tests__/AppLayout.test.tsx`
**Verification:** 新测试通过，且 `npm test`、`npm run build`、`cargo test --manifest-path src-tauri/Cargo.toml` 保持通过

Status: ✅ Done
Evidence: `src/components/layout/__tests__/AppLayout.test.tsx` 新增 “keeps each pane shrinkable so wide editor content cannot push the sidebar away” 回归测试；`npm test -- --run src/components/layout/__tests__/AppLayout.test.tsx` 通过（1 文件 / 4 断言）；`npm test` 通过（22 文件 / 129 断言）；`npm run build` 通过；`cargo test --manifest-path src-tauri/Cargo.toml` 通过（37 测试）。
Deviations:

## Verification

- [x] Reproduction test now passes
- [x] Regression test added and passes
- [x] Full test suite passes (no new failures)
- [x] Diff reviewed — only fix-related changes present
- [x] Pre-existing failures unchanged

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| Reproduce | ✅ | 用户截图 + 代码路径分析已确认 | 这是典型的 grid item 最小内容宽度问题 |
| Root cause | ✅ | `AppLayout` / editor wrapper 缺少 `min-w-0` |  |
| Fix | ✅ | 关键 pane wrapper 与 editor shell 已补 `min-w-0` |  |
| Verify | ✅ | `npm test`、`npm run build`、`cargo test` 全通过 |  |
| Regression | ✅ | `AppLayout` 新增 shrinkability 回归测试 |  |

## Completion Summary

Completed: 2026-04-16
Root cause: 三栏 grid item 与编辑器包裹层缺少 `min-w-0`，宽内容按最小内容宽度参与布局，导致整行被横向撑开。
Fix: 为 `AppLayout` 和编辑器滚动路径补齐可收缩约束，让宽 Markdown 内容只在中间列内处理。
Regression test: `src/components/layout/__tests__/AppLayout.test.tsx` 中的 `keeps each pane shrinkable so wide editor content cannot push the sidebar away`
All verification criteria: PASS

Summary: 这次修复没有去碰文件树或编辑器逻辑，而是直接收口在布局约束本身。问题根因是中间编辑列虽然用了 `minmax(0, 1fr)`，但 grid item 与 editor wrapper 默认仍是 `min-width: auto`，遇到超宽 Markdown 内容时会按最小内容宽度回流，连带把左侧边栏挤出视口。修复后，三栏 pane 和编辑器外壳都显式允许收缩，新增回归测试也把这条约束固定住了；全量前端测试、构建和原生测试均保持通过。

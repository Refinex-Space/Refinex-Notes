# Fix Plan: TabBar Hook And Drag Regression

Created: 2026-04-16
Status: Active
Author: agent
Type: fix

## Bug Brief

**Symptom**: 新版 `TabBar` 在运行时触发两个错误：`React has detected a change in the order of Hooks called by TabBar`，以及 `window.start_dragging not allowed. Permissions associated with this command: core:window:allow-start-dragging`。
**Expected**: `TabBar` 渲染时 Hook 顺序稳定，不触发 React hook mismatch；拖拽排序不依赖 Tauri 的受限窗口拖拽权限。
**Severity**: Blocking
**Type**: Regression

### Reproduction

1. 启动 `npm run dev`
2. 打开包含多个顶部标签的工作区
3. 观察控制台：切换到空标签/有标签状态时出现 hook 顺序错误；尝试拖拽标签时触发 `window.start_dragging not allowed`

Reproduction evidence: 用户提供的浏览器控制台日志直接指向 `TabBar.tsx` 中的 hook 顺序差异和拖拽权限错误。

## Root Cause

**Mechanism**: `TabBar` 在 `openFiles.length === 0` 时提前返回，导致后面的 `useMemo` 只在“有标签”场景执行，破坏 Hook 调用顺序；同时组件使用了原生 HTML5 `draggable` / `dragstart` 路径，在 Tauri 桌面环境下触发了受限的窗口拖拽命令。
**Introduced by**: `TabBar Compact Interactions` 重构中新增的 `useMemo` 位置和原生 `draggable` 实现。
**Why it wasn't caught**: 现有测试覆盖了 store 行为和静态 class，但没有覆盖运行时 hook 顺序，也没有在 Tauri 桌面环境下验证拖拽路径。

## Hypothesis Log

### Hypothesis #1: Hook 顺序错误来自 `useMemo` 位于条件 return 之后

Prediction: 如果移除条件 return 之后的 Hook，或者把 Tab 渲染从 Hook 改为普通表达式，则 React hook mismatch 消失。
Experiment: 读取 `TabBar.tsx`，对照错误日志中的 `undefined -> useMemo` 差异。
Result: `useMemo` 的确位于 `if (openFiles.length === 0) return ...` 之后，直接匹配报错。
Conclusion: CONFIRMED

### Hypothesis #2: Tauri 拖拽权限错误来自原生 `draggable` / `dragstart`

Prediction: 如果移除 `draggable` 和 `dataTransfer` 路径，改用 pointer 驱动排序，则不会再触发 `window.start_dragging not allowed`。
Experiment: 搜索仓库内 `start_dragging` / `draggable` / `onDragStart`，唯一运行时代码命中 `TabBar.tsx`。
Result: 唯一与该错误直接相关的可执行路径就是 `TabBar` 的原生 DnD。
Conclusion: CONFIRMED

## Fix

**Strategy**: 将标签渲染从 `useMemo` 改成普通表达式，保证 Hook 顺序稳定；移除原生 HTML5 DnD，改用 pointer 事件 + 几何命中判断实现轻量排序，保留右键菜单与排序能力。
**Files**: `src/components/editor/TabBar.tsx`, `src/components/editor/__tests__/TabBar.test.tsx`, `docs/exec-plans/active/2026-04-16-fix-tabbar-hook-dnd-regression.md`, `docs/PLANS.md`
**Risk**: pointer 拖拽如果状态清理不完整，可能留下悬挂的插入指示或误触发排序。

### Steps

#### Step 1: 修复 Hook 顺序与拖拽实现

**Files:** `src/components/editor/TabBar.tsx`
**Verification:** 相关测试与构建通过，代码不再包含 `draggable=` / `onDragStart`

Status: ⬜ Not started
Evidence:
Deviations:

#### Step 2: 更新回归测试

**Files:** `src/components/editor/__tests__/TabBar.test.tsx`
**Verification:** 测试覆盖新的 pointer 排序辅助逻辑或相关回归锚点

Status: ⬜ Not started
Evidence:
Deviations:

## Verification

- [ ] Related tests pass
- [ ] `npm run build` passes
- [ ] Full test suite has no new failures
- [ ] Diff reviewed — only fix-related changes present
- [ ] Pre-existing `DocumentOutlineDock` failure unchanged

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| Reproduce | ✅ | 控制台日志与源码位置吻合 | 阻塞级回归 |
| Root cause | ✅ | `useMemo` 条件执行 + `draggable` 原生 DnD | 两个问题都已确认 |
| Fix | ⬜ |  |  |
| Verify | ⬜ |  |  |
| Regression | ⬜ |  |  |

## Completion Summary

Completed:
Root cause:
Fix:
Regression test:
All verification criteria: PASS / FAIL

Summary:

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

Status: ✅ Done
Evidence: `TabBar.tsx` 已移除 `useMemo` 条件执行路径，标签渲染改为普通表达式；原生 `draggable` / `onDragStart` / `dataTransfer` 逻辑已替换为 pointer 事件排序。
Deviations:

#### Step 2: 更新回归测试

**Files:** `src/components/editor/__tests__/TabBar.test.tsx`
**Verification:** 测试覆盖新的 pointer 排序辅助逻辑或相关回归锚点

Status: ✅ Done
Evidence: `TabBar.test.tsx` 新增 `getDropIndicatorFromPointer` 断言，验证无需 native draggable 即可计算 before/after 插入位置。
Deviations:

## Verification

- [x] Related tests pass
- [x] `npm run build` passes
- [x] Full test suite has no new failures
- [x] Diff reviewed — only fix-related changes present
- [x] Pre-existing `DocumentOutlineDock` failure unchanged

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| Reproduce | ✅ | 控制台日志与源码位置吻合 | 阻塞级回归 |
| Root cause | ✅ | `useMemo` 条件执行 + `draggable` 原生 DnD | 两个问题都已确认 |
| Fix | ✅ | `TabBar.tsx` 改为 pointer 排序并消除条件 Hook | 不再依赖 Tauri start_dragging 权限 |
| Verify | ✅ | 相关测试 12/12 通过，`npm run build` 通过 | 全量 `npm test` 仅剩 `DocumentOutlineDock` 既有失败 |
| Regression | ✅ | `TabBar.test.tsx` 新增 pointer drop helper 测试 | 锁定去除 native draggable 的核心逻辑 |

## Completion Summary

Completed: 2026-04-16
Root cause: `TabBar` 在条件 return 之后执行 `useMemo`，且拖拽排序错误地使用了 Tauri 环境下不适配的原生 HTML5 DnD。
Fix: 将标签渲染改为无条件路径，移除 native draggable，改用 pointer 事件和几何命中判断实现排序。
Regression test: `src/components/editor/__tests__/TabBar.test.tsx`
All verification criteria: PASS

Summary: 本次修复解决了 `TabBar` 的两个运行时回归。首先移除了条件 return 后的 `useMemo`，恢复 Hook 顺序稳定性，从而消除 React 的 hook mismatch。其次撤掉了原生 `draggable` / `dragstart` 实现，改为 pointer 驱动的轻量排序逻辑，避免再触发 Tauri 的 `window.start_dragging` 权限错误。相关测试与构建都通过，全量前端测试没有新增失败，仍仅受工作树中与本任务无关的 `DocumentOutlineDock` 断言漂移影响。

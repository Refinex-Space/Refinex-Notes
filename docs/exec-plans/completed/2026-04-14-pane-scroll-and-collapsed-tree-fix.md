# Execution Plan: Pane Scroll And Collapsed Tree Fix

Created: 2026-04-14
Status: Completed
Author: agent

## Bug Brief

- Symptom: 打开工作区后，文件树中的目录默认全部展开；应用整体、左栏和主编辑区会一起继续向下滚动，而不是各自在 pane 内独立滚动。
- Expected: 目录默认折叠；页面高度被窗口截断，左栏文件区/大纲区、主编辑区、右栏内容区在各自容器内滚动。
- Reproduction:
  1. 启动 `npm run dev` 或 `npm run tauri dev`
  2. 打开任意包含多级目录和较长 Markdown 的本地工作区
  3. 观察左侧目录默认全部展开
  4. 向下滚动页面，整体文档会继续增长，侧栏与编辑区没有被稳定限制在视口内
- Affected scope: `src/components/sidebar/FileTree.tsx`, `src/components/layout/AppLayout.tsx`, `src/App.tsx`, `src/styles.css`
- Severity: Degraded
- Type: Regression

## Root Cause Hypothesis

1. `FileTree` 为每个目录节点都设置了 `Accordion defaultValue={[node.path]}`，导致目录初始态强制展开。
2. 顶层 `html/body/#root` 和 `AppLayout` 没有统一截断溢出；左栏 `Files/Outline` section 也没有把滚动区域约束在各自的 `flex-1` 内容区，导致外层容器被内容继续撑高。

## Acceptance Criteria

- [x] AC-1: 工作区目录树默认折叠。
- [x] AC-2: 应用整体不再出现页面级长滚动，左栏文件区/大纲区和主编辑区在各自 pane 内滚动。
- [x] AC-3: `npm test -- --run` 与 `npm run build` 通过。

## Steps

1. 修复目录树默认展开状态
   verify: `npm test -- --run`
   status: ✅ Done
   evidence: `src/components/sidebar/FileTree.tsx` 移除了目录 `Accordion` 的 `defaultValue`；新增 `FileTreeNodes` 纯渲染组件和 `src/components/sidebar/__tests__/FileTree.test.tsx` 回归用例，验证目录初始态为 `closed`。
2. 收紧 App shell 高度与各 pane 滚动边界
   verify: `npm run build`
   status: ✅ Done
   evidence: `src/components/layout/AppLayout.tsx` 为 shell 根节点和主 grid 增加 `overflow-hidden`；`src/App.tsx` 将左栏 `Files/Outline` section 改为 `flex-col + flex-1 overflow-auto`；`src/styles.css` 将 `html/body/#root` 设为 `height: 100%` 与 `overflow: hidden`。
3. 运行验证并归档计划
   verify: `npm test -- --run && npm run build`
   status: ✅ Done
   evidence: `npm test -- --run` 通过（77/77）；`npm run build` 通过；`cargo test --manifest-path src-tauri/Cargo.toml` 通过（3/3）；`python3 scripts/check_harness.py` 通过。

## Completion Summary

Completed: 2026-04-14
All acceptance criteria: PASS

Summary: 这次修复把目录树默认展开改回默认折叠，同时把应用高度约束统一下沉到 `html/body/#root`、`AppLayout` 和左栏 pane 内部，避免页面级长滚动重新出现。现状是左栏文件区/大纲区、主编辑区、右栏内容区都在各自容器内滚动，目录树回到更符合笔记应用预期的折叠初始态。

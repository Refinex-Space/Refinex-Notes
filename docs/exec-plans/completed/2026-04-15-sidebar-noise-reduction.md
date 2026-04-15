# Execution Plan: Sidebar Noise Reduction

Created: 2026-04-15
Completed: 2026-04-15
Status: Completed
Author: agent

## Objective

进一步压缩左侧边栏噪声：移除顶部解释性文案与 `FILES` 标签，把 GitHub 状态入口移到底部状态栏左侧并改为图标触发，同时重做文件树的空工作区状态，使左栏更接近专业桌面应用的工具导航。

## Scope

**In scope:**
- `src/App.tsx`
- `src/components/sidebar/FileTree.tsx`
- `src/components/layout/StatusBar.tsx`
- `src/components/auth/AccountStatus.tsx`
- `src/components/sidebar/__tests__/FileTree.test.tsx`
- `docs/PLANS.md`
- 本执行计划文档

**Out of scope:**
- 右侧 Git 面板信息架构调整
- 搜索弹窗结果布局重构
- 编辑器与悬浮目录 dock 行为调整

## Constraints

- 左侧边栏顶部默认只保留动作型 UI，不再用说明文案占据导航空间。
- GitHub 状态默认必须以图标呈现，hover / click 时再暴露详情或操作。
- 空状态要垂直居中、语义清晰，但避免“说明书式”长句。

## Acceptance Criteria

- [x] AC-1: 左侧边栏顶部删除 `WORKSPACE / 未打开项目 / 打开本地文件夹后显示...` 这类解释文案，仅保留动作入口。
- [x] AC-2: `FILES` 标签删除。
- [x] AC-3: GitHub 账号入口移动到状态栏左下，与 Git 状态并列，默认图标展示，hover / click 可查看详情并退出。
- [x] AC-4: 无工作区时左侧边栏展示垂直居中的极简空状态。
- [x] AC-5: `npm test` 与 `npm run build` 保持通过。

## Implementation Steps

### Step 1: 登记计划并锁定改造范围

**Files:** `docs/exec-plans/completed/2026-04-15-sidebar-noise-reduction.md`, `docs/PLANS.md`
**Verification:** Active plan 已登记

Status: ✅ Done
Evidence: 执行计划已创建并完成归档，`docs/PLANS.md` 已反映该任务完成状态。

### Step 2: 收敛侧栏噪声并重做状态入口

**Files:** `src/App.tsx`, `src/components/sidebar/FileTree.tsx`, `src/components/layout/StatusBar.tsx`, `src/components/auth/AccountStatus.tsx`
**Verification:** `npm run build`

Status: ✅ Done
Evidence: 左侧边栏顶部已收敛为纯动作区，`FILES` 标题已移除，GitHub 状态已迁移到底部 icon-only 入口，`npm run build` 通过。

### Step 3: 更新测试并完成验证

**Files:** `src/components/sidebar/__tests__/FileTree.test.tsx`
**Verification:** `npm test`

Status: ✅ Done
Evidence: 新增文件树空状态测试后，`npm test` 结果为 18/18 文件、98/98 用例通过。

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件已创建并归档 | 范围锁定在左栏降噪、底部账号入口、空状态 |
| 2 | ✅ | `npm run build` 通过 | 侧栏解释文案与 `FILES` 标签已移除，状态入口改到底部 |
| 3 | ✅ | `npm test` 98/98 通过 | 新增空状态测试并完成全量回归 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 顶部只保留打开项目与搜索两个动作图标 | 左栏需要从说明面板收敛成工具导航 | 保留工作区名或副标题文案 | 用户明确要求删除解释性文字，工具区应优先让位给文件树 |
| GitHub 状态改为底部 icon-only 账号入口 | 账号状态属于全局会话，不应占用左栏主导航空间 | 继续放左栏；或在底部用整段文字 chip | 图标默认态更克制，popover 再承载详情和退出动作 |
| 空状态使用“图标 + 标题 + 一行副文案” | 需要优雅但不能变成说明书 | 纯文字句子；或加大 CTA 按钮 | 简洁的中心构图既降低噪声，也保留足够引导 |

## Completion Summary

Summary: 已完成左侧栏降噪改造。顶部解释文案与 `FILES` 标签已删除，左栏现在只保留两个动作图标和文件树主体；GitHub 账号状态已迁移到底部状态栏左侧，以图标入口 + popover 方式承载详情与退出；文件树在未打开工作区时改为垂直居中的极简空状态。验证结果为 `npm test` 98/98 通过、`npm run build` 通过。

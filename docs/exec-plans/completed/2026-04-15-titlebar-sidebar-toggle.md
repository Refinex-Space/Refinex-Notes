# Execution Plan: Titlebar Sidebar Toggle

Created: 2026-04-15
Completed: 2026-04-15
Status: Completed
Author: agent

## Objective

将左侧边栏展开/折叠按钮从当前带边框圆角的内容控制样式，调整为标题栏内的纯图标控制，视觉上与红绿灯所在标题栏同层级，并去除放大的圆角按钮外观。

## Scope

**In scope:**
- `src/components/layout/AppLayout.tsx`
- `src/components/layout/__tests__/AppLayout.test.tsx`
- `src-tauri/src/lib.rs`
- `docs/PLANS.md`
- 本执行计划文档

**Out of scope:**
- 左侧边栏内部信息架构
- 右侧面板切换入口的整体交互逻辑
- 窗口原生标题栏行为

## Acceptance Criteria

- [x] AC-1: 左侧边栏折叠图标位于标题栏控制区，不再像内容区按钮。
- [x] AC-2: 左侧折叠图标去除圆角边框和放大按钮样式，改为纯图标控制。
- [x] AC-3: macOS 上红绿灯右侧不再显示系统名，Windows 仍保留正常窗口标题。
- [x] AC-4: `npm test`、`npm run build` 与 `cargo test --manifest-path src-tauri/Cargo.toml` 保持通过。

## Implementation Steps

### Step 1: 登记计划

**Files:** `docs/exec-plans/completed/2026-04-15-titlebar-sidebar-toggle.md`, `docs/PLANS.md`
**Verification:** Active plan 已登记

Status: ✅ Done
Evidence: 执行计划已创建并完成归档，`docs/PLANS.md` 已反映任务完成状态。

### Step 2: 调整 AppLayout 标题栏控制样式

**Files:** `src/components/layout/AppLayout.tsx`, `src/components/layout/__tests__/AppLayout.test.tsx`, `src-tauri/src/lib.rs`
**Verification:** `npm run build && cargo test --manifest-path src-tauri/Cargo.toml`

Status: ✅ Done
Evidence: 左侧折叠图标已移动到标题栏控制区并改为纯图标样式；macOS 启动时会清空主窗口标题，Windows 配置保持不变；`npm run build` 与 `cargo test --manifest-path src-tauri/Cargo.toml` 均通过。

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件已创建并归档 | 范围锁定为标题栏折叠图标与平台化窗口标题处理 |
| 2 | ✅ | `npm test` 99/99、`npm run build` 通过、Rust 34/34 通过 | macOS 让出红绿灯右侧标题，Windows 保留窗口标题 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 标题栏拆成“控制区 + 标题区”两层 | 需要让折叠图标进入 titlebar row，而不是贴在两行标题旁边 | 保持单层 header，只改按钮样式 | 两层结构能明确视觉语义：上层控制、下层标题 |
| macOS 用运行时清空窗口标题，Windows 保持配置标题 | 用户只要求 macOS 去掉红绿灯右侧系统名 | 直接把 `tauri.conf.json` 的标题改空 | 运行时按平台分流不会误伤 Windows |
| 标题栏按钮改为纯图标 hit area | 用户明确要求去掉放宽和圆角 | 仅移位置，保留圆形描边按钮 | 样式和标题栏控制语义保持一致，更克制 |

## Completion Summary

Summary: 已完成标题栏折叠按钮与平台细节修正。左侧边栏折叠按钮已进入标题栏控制区，去除了圆角、描边和放大按钮外观；`AppLayout` 会在 macOS 上为红绿灯预留左侧 inset，而 Windows 不额外让位。原生层在 macOS 启动时清空主窗口标题，因此红绿灯右侧不再显示系统名；Windows 继续使用配置里的窗口标题。验证结果为 `npm test` 99/99 通过，`npm run build` 通过，`cargo test --manifest-path src-tauri/Cargo.toml` 34/34 通过。

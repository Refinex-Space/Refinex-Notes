# Execution Plan: macOS Titlebar Alignment

Created: 2026-04-15
Completed: 2026-04-15
Status: Completed
Author: agent

## Objective

修正 macOS overlay titlebar 下红绿灯与左侧栏折叠图标的几何关系：拉开水平安全距离，并让折叠图标与红绿灯严格在同一视觉中心线。

## Scope

**In scope:**
- `src/components/layout/AppLayout.tsx`
- `src-tauri/tauri.macos.conf.json`
- `docs/PLANS.md`
- 本执行计划文档

**Out of scope:**
- Windows 标题栏布局
- 左栏内容区与按钮图形本身的改造

## Acceptance Criteria

- [x] AC-1: macOS 上折叠图标与红绿灯之间有明显安全间距，不再显得过近。
- [x] AC-2: macOS 上折叠图标与红绿灯在视觉上水平、垂直对齐。
- [x] AC-3: `npm run build` 与 `cargo test --manifest-path src-tauri/Cargo.toml` 保持通过。

## Implementation Steps

### Step 1: 登记计划

**Files:** `docs/exec-plans/completed/2026-04-15-macos-titlebar-alignment.md`, `docs/PLANS.md`
**Verification:** Active plan 已登记

Status: ✅ Done
Evidence: 计划文件已创建并归档，`docs/PLANS.md` 已反映完成状态。

### Step 2: 微调 macOS 红绿灯坐标和前端控制区网格

**Files:** `src-tauri/tauri.macos.conf.json`, `src/components/layout/AppLayout.tsx`
**Verification:** `npm run build && cargo test --manifest-path src-tauri/Cargo.toml`

Status: ✅ Done
Evidence: macOS `trafficLightPosition` 已调为 `{ x: 18, y: 14 }`，前端 titlebar control row 改为固定 `h-12` 并将左 inset 拉至 `pl-[6.75rem]`；`npm run build` 和 `cargo test --manifest-path src-tauri/Cargo.toml` 均通过。

## Completion Summary

Summary: 已完成 macOS titlebar 对齐微调。此次不是再改“是否同一行”，而是细化同一行里的几何关系：把红绿灯坐标略向右上收紧，同时把前端折叠图标所在的 titlebar 控制区改成固定高度单行网格，并增大与红绿灯的水平间距，从而改善视觉对齐和安全距离。验证结果为 `npm run build` 通过、`cargo test --manifest-path src-tauri/Cargo.toml` 34/34 通过。

# Execution Plan: macOS Overlay Titlebar

Created: 2026-04-15
Completed: 2026-04-15
Status: Completed
Author: agent

## Objective

让 macOS 上的左侧栏折叠图标真正进入与红绿灯同一条 titlebar，而不是停留在原生标题栏下方的第一行内容区；Windows 保持现有窗口模型，不引入额外 titlebar overlay。

## Scope

**In scope:**
- `src-tauri/tauri.macos.conf.json`
- `src-tauri/src/lib.rs`
- `docs/PLANS.md`
- 本执行计划文档

**Out of scope:**
- Windows/Linux 标题栏模型调整
- 左侧栏内部布局和按钮图标本身的进一步视觉微调

## Acceptance Criteria

- [x] AC-1: macOS 主窗口使用 overlay titlebar，web 内容可进入红绿灯同一条 titlebar。
- [x] AC-2: macOS 原生标题隐藏，不再出现红绿灯右侧系统名。
- [x] AC-3: Windows 继续保留默认窗口标题栏行为。
- [x] AC-4: `cargo test --manifest-path src-tauri/Cargo.toml` 与 `npm run build` 保持通过。

## Implementation Steps

### Step 1: 登记计划

**Files:** `docs/exec-plans/completed/2026-04-15-macos-overlay-titlebar.md`, `docs/PLANS.md`
**Verification:** Active plan 已登记

Status: ✅ Done
Evidence: 计划文件已创建并完成归档，`docs/PLANS.md` 已反映任务完成状态。

### Step 2: 为 macOS 增加 overlay titlebar 平台配置

**Files:** `src-tauri/tauri.macos.conf.json`, `src-tauri/src/lib.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml && npm run build`

Status: ✅ Done
Evidence: 新增 macOS 专用 Tauri 配置，主窗口启用 `titleBarStyle: Overlay`、`hiddenTitle: true` 与 `trafficLightPosition`；Rust 测试与前端构建均通过。

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件已创建并归档 | 范围锁定为 macOS overlay titlebar，不影响 Windows |
| 2 | ✅ | `npm run build` 通过，Rust 34/34 通过 | macOS 真正进入 overlay titlebar，Windows 保持默认窗口模型 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 使用 `src-tauri/tauri.macos.conf.json` 做平台覆盖 | 用户明确要求只有 macOS 变，Windows 不变 | 直接改主 `tauri.conf.json` | 平台覆盖文件最干净，不会把 macOS 标题栏策略扩散到 Windows |
| 用 `hiddenTitle: true` 替代运行时 `set_title(\"\")` | 需求是隐藏 macOS 原生标题，而不是把窗口标题全局改空 | 继续在 Rust setup 里动态清空标题 | 配置层表达更准确，也保留 Windows 的正常标题 |
| 设置 `trafficLightPosition` | overlay titlebar 下仍需要控制红绿灯与 web 控件的相对关系 | 只开 overlay，不设控件位置 | 给左侧栏折叠图标留出更稳定的同排空间 |

## Completion Summary

Summary: 已完成 macOS overlay titlebar 修正。之前折叠按钮看起来“在红绿灯同一行”，但实际上仍位于原生标题栏下方的 web 内容区；现在通过 `src-tauri/tauri.macos.conf.json` 为 macOS 主窗口启用 `titleBarStyle: Overlay`、`hiddenTitle: true` 和 `trafficLightPosition`，web 内容可以真正进入与红绿灯同一条 titlebar，且红绿灯右侧系统名不再显示。Windows 未应用该覆盖，仍保持默认标题栏行为。验证结果为 `npm run build` 通过、`cargo test --manifest-path src-tauri/Cargo.toml` 34/34 通过。

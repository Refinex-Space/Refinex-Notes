# Execution Plan: Workspace Switcher

Created: 2026-04-15
Completed: 2026-04-15
Status: Completed
Author: agent

## Objective

删除当前标题区 `PHASE 4.1 / Refinex Notes Workspace`，并将左侧边栏顶部的“打开项目”重构为真正的工作区切换器：未打开时显示 `Open Workspace`，已打开时显示当前工作区名；支持最近工作区持久化、快速切换和移除，切换后文件树同步更新。

## Scope

**In scope:**
- `src-tauri/src/db.rs`
- `src-tauri/src/commands/files.rs`
- `src-tauri/src/lib.rs`
- `src/services/fileService.ts`
- `src/stores/noteStore.ts`
- `src/types/notes.ts`
- `src/App.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/components/sidebar/WorkspaceSwitcher.tsx`
- 相关测试与 Harness 计划文档

**Out of scope:**
- 右侧 Git 面板结构调整
- 工作区多窗口并行打开
- 最近工作区的拖拽排序

## Constraints

- 最近工作区必须跨会话保留，不能只存在前端内存。
- 工作区切换器要优先复用现有 Radix/Tailwind 基础设施，不引入新的 UI 库。
- 删除标题区后，titlebar 只保留窗口级控制，不再承担页面说明性标题。

## Acceptance Criteria

- [x] AC-1: `PHASE 4.1 / Refinex Notes Workspace` 标题区从 UI 中移除。
- [x] AC-2: 左栏顶部显示工作区切换器，而不是单独文件夹图标。
- [x] AC-3: 最近工作区可跨会话列出、点击切换、独立移除。
- [x] AC-4: 切换工作区后左侧文件树刷新为对应目录树。
- [x] AC-5: `npm test`、`npm run build`、`cargo test --manifest-path src-tauri/Cargo.toml` 保持通过。

## Implementation Steps

### Step 1: 登记计划

**Files:** `docs/exec-plans/completed/2026-04-15-workspace-switcher.md`, `docs/PLANS.md`
**Verification:** Active plan 已登记

Status: ✅ Done
Evidence: 计划文件已创建并归档，`docs/PLANS.md` 已反映任务完成状态。

### Step 2: 补齐最近工作区原生命令与前端状态链路

**Files:** `src-tauri/src/db.rs`, `src-tauri/src/commands/files.rs`, `src-tauri/src/lib.rs`, `src/services/fileService.ts`, `src/stores/noteStore.ts`, `src/types/notes.ts`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ✅ Done
Evidence: 已新增最近工作区的列出/移除原生命令、前端 service/store 链路和数据库测试；`cargo test --manifest-path src-tauri/Cargo.toml` 35/35 通过。

### Step 3: 重构左栏顶部为工作区切换器并删除标题区

**Files:** `src/App.tsx`, `src/components/layout/AppLayout.tsx`, `src/components/sidebar/WorkspaceSwitcher.tsx`
**Verification:** `npm run build`

Status: ✅ Done
Evidence: 标题区已移除，左栏顶部已重构为工作区切换器，`npm run build` 通过。

### Step 4: 更新测试并完成全量验证

**Files:** 相关测试文件
**Verification:** `npm test && npm run build && cargo test --manifest-path src-tauri/Cargo.toml`

Status: ✅ Done
Evidence: `npm test` 19/19 文件、101/101 用例通过；`npm run build` 通过；`cargo test --manifest-path src-tauri/Cargo.toml` 35/35 通过。

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 最近工作区走 Tauri command + SQLite，而不是前端内存 | 用户明确要求“记住历史打开”并支持移除 | 只在 Zustand 里保存本次会话列表 | 历史跨会话是需求本体，必须落到数据库 |
| 工作区切换器使用 popover 而不是单独页面 | 左栏顶部空间有限，且需要快速切换 | 单独设置页、命令面板入口 | Popover 更接近桌面应用的 workspace switcher 交互 |
| 切换失败时自动移除无效历史路径 | 最近工作区可能指向已经删除的目录 | 保留报错，不处理脏历史 | 减少用户手工清理负担，切换器保持可用 |

## Completion Summary

Summary: 已完成工作区切换器重构。`PHASE 4.1 / Refinex Notes Workspace` 标题区已从 UI 中移除；左栏顶部不再是单独文件夹按钮，而是一个可显示当前工作区名的 workspace switcher。后端新增最近工作区列出/移除命令，前端 `fileService` 和 `noteStore` 已接通持久化链路，支持跨会话记住历史工作区、快速切换、独立移除，并在切换后刷新文件树。验证结果为 `npm test` 101/101 通过、`npm run build` 通过、`cargo test --manifest-path src-tauri/Cargo.toml` 35/35 通过。

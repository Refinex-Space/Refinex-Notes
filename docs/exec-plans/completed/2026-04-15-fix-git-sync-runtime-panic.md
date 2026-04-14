# Execution Plan: Fix Git Sync Runtime Panic

Created: 2026-04-15
Status: Active
Author: agent

## Objective

修复打开工作区后启动 Git 自动同步时因缺少 Tokio reactor 而导致的 Tauri 进程 panic。

## Acceptance Criteria

- [x] AC-1: `git_start_sync` 不再因 `there is no reactor running` panic 退出应用。
- [x] AC-2: `cargo test --manifest-path src-tauri/Cargo.toml` 保持通过。

## Steps

1. 将 Git 同步 task 从裸 `tokio::spawn` 切换到 Tauri 管理的 async runtime，并补一个最小回归断言。
2. 运行原生测试并归档计划。

## Completion Summary

Completed: 2026-04-15
Duration: 2 steps
All acceptance criteria: PASS

Summary: `GitSyncController` 现在通过 `tauri::async_runtime::spawn` 启动后台同步循环，而不是在同步命令上下文里直接调用 `tokio::spawn`。这样打开工作区后前端触发 `git_start_sync` 时，不再依赖当前线程已经进入 Tokio reactor，修复了 `there is no reactor running` 导致的应用崩溃；原生全测 34/34 保持通过。

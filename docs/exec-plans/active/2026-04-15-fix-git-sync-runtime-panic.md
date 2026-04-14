# Execution Plan: Fix Git Sync Runtime Panic

Created: 2026-04-15
Status: Active
Author: agent

## Objective

修复打开工作区后启动 Git 自动同步时因缺少 Tokio reactor 而导致的 Tauri 进程 panic。

## Acceptance Criteria

- [ ] AC-1: `git_start_sync` 不再因 `there is no reactor running` panic 退出应用。
- [ ] AC-2: `cargo test --manifest-path src-tauri/Cargo.toml` 保持通过。

## Steps

1. 将 Git 同步 task 从裸 `tokio::spawn` 切换到 Tauri 管理的 async runtime，并补一个最小回归断言。
2. 运行原生测试并归档计划。

## Completion Summary

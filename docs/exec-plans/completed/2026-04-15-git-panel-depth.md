# Execution Plan: Git Panel Depth

Created: 2026-04-15
Completed: 2026-04-15
Status: Archived
Author: agent

## Objective

继续深化右侧 Git 面板：把变更概览升级为 staged / unstaged 两组，历史视图补充仓库级最近提交概览，并去掉右侧最上层多余的 `GIT` 标题条，让面板更像成熟工具软件而不是说明页面。

## Scope

**In scope:**
- `src-tauri/src/git/mod.rs`
- `src-tauri/src/commands/git.rs`
- `src/services/gitService.ts`
- `src/types/git.ts`
- `src/stores/gitStore.ts`
- `src/App.tsx`
- `src/components/git/*`
- 相关测试
- `docs/PLANS.md`
- 本执行计划文档

**Out of scope:**
- Git 原生命令新增 staged/unstaged 之外的复杂交互（逐文件 stage、逐 hunk stage）
- 工作区切换或文件树行为

## Acceptance Criteria

- [ ] AC-1: Git 状态数据包含 staged / unstaged 维度。
- [ ] AC-2: Git 概览面板能按 staged / unstaged 分组展示变更。
- [ ] AC-3: 历史视图包含仓库级最近提交概览，不只显示当前文件历史。
- [ ] AC-4: 右侧最上层 `GIT` 标题条移除。
- [ ] AC-5: `npm test`、`npm run build`、`cargo test --manifest-path src-tauri/Cargo.toml` 保持通过。

## Implementation Steps

### Step 1: 登记计划

**Files:** `docs/exec-plans/completed/2026-04-15-git-panel-depth.md`, `docs/PLANS.md`
**Verification:** Active plan 已登记

Status: ✅ Archived on request

### Step 2: 扩展 Git 状态数据链路

**Files:** `src-tauri/src/git/mod.rs`, `src-tauri/src/commands/git.rs`, `src/services/gitService.ts`, `src/types/git.ts`, `src/stores/gitStore.ts`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ⏳ Pending

### Step 3: 重构概览/历史视图并压掉顶层标题条

**Files:** `src/App.tsx`, `src/components/git/*`
**Verification:** `npm run build`

Status: ⏳ Pending

### Step 4: 更新测试并全量验证

**Files:** 相关测试文件
**Verification:** `npm test && npm run build && cargo test --manifest-path src-tauri/Cargo.toml`

Status: ⏳ Pending

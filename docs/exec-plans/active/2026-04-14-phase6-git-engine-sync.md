# Execution Plan: Phase 6 Git Engine Sync

Created: 2026-04-14
Status: Active
Author: agent

## Objective

在 `src-tauri` 内实现基于 `git2-rs` 的 Git 操作引擎、GitHub token 凭证桥接、后台自动同步状态机，以及对应的 Tauri Git commands。

## Scope

**In scope:**
- `src-tauri/Cargo.toml`
- `src-tauri/src/git/`
- `src-tauri/src/commands/git.rs`
- `src-tauri/src/commands/files.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/state.rs`
- 与上述行为直接相关的 Rust 测试
- Harness 执行计划与必要控制面文档

**Out of scope:**
- React Git UI 面板实现
- SSH 认证与非 `origin` remote 管理
- 冲突解决 UI / 手动三方合并工具
- GitHub 以外的凭证来源

## Constraints

- 保持 `src-tauri/src/commands/` 为 IPC 边界，Git 逻辑集中在 `src-tauri/src/git/`。
- 复用现有 `AppState` 与 Tauri runtime wiring，不在前端或无关模块中嵌入原生 Git 逻辑。
- 文件保存触发同步必须接入现有工作区文件命令生命周期，避免新增平行保存路径。
- 以可验证行为为准；每一步都需要测试或命令级证据，并记录到本计划。

## Acceptance Criteria

- [ ] AC-1: `git_init_repo`、`git_clone_repo`、`git_get_status`、`git_commit`、`git_push`、`git_pull`、`git_get_log`、`git_get_diff` commands 可编译并在 Rust 测试中覆盖核心成功路径。
- [ ] AC-2: `src-tauri/src/git/mod.rs` 支持仓库初始化、HTTPS clone、状态枚举、`add -A`、commit、fetch、push、`pull --rebase`、日志与 diff 查询，并对空仓库/无变更/无 upstream 等边界返回明确错误或空结果。
- [ ] AC-3: `src-tauri/src/git/sync.rs` 提供可启动/停止/强制触发的后台同步任务，状态在 `not-initialized → dirty → committed → fetching → merging → pushing → synced/conflicted` 之间转换，并通过 Tauri event `git-sync-status` 发给前端。
- [ ] AC-4: `write_file`/`create_file`/`create_dir`/`delete_file`/`rename_file` 在工作区已启动同步时会触发 30 秒防抖即时同步；rebase 冲突时会发出 `conflicted` 状态而不是静默失败。
- [ ] AC-5: `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test -- --run`、`npm run build` 在完成后保持通过，不劣化基线。

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| `git2` 的 rebase API 细节复杂，容易在冲突路径卡住 | Med | 先用临时仓库测试覆盖 happy path 和冲突路径，再将冲突统一上报为 `conflicted` |
| keyring token 读取逻辑与现有 auth 命令格式不一致 | Med | 复用现有 keyring payload 结构与兼容旧 token 字符串格式的解析策略 |
| 后台同步与文件写命令并发，导致重复提交或锁冲突 | Med | 用单一同步控制器串行化任务，并用防抖/显式状态保护重入 |
| 测试环境无法稳定覆盖 push/fetch/pull | Med | 使用本地 bare repo + 临时工作树构造可重复的离线 Git 集成测试 |

## Implementation Steps

### Step 1: 建立 Git 域模型与执行计划基线

**Files:** `src-tauri/Cargo.toml`, `src-tauri/src/git/mod.rs`, `src-tauri/src/git/auth.rs`, `docs/exec-plans/active/2026-04-14-phase6-git-engine-sync.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml git::`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 2: 实现核心 Git 操作与离线仓库测试

**Files:** `src-tauri/src/git/mod.rs`, `src-tauri/src/git/auth.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml git::tests::`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 实现同步状态机并接入工作区写入触发

**Files:** `src-tauri/src/git/sync.rs`, `src-tauri/src/state.rs`, `src-tauri/src/commands/files.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml git::sync::tests::`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: 暴露 Tauri Git commands 并接入运行时

**Files:** `src-tauri/src/commands/git.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/commands/mod.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml commands::git::tests::`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 5: 全量验证并更新控制面

**Files:** `docs/PLANS.md`, `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`, `docs/exec-plans/active/2026-04-14-phase6-git-engine-sync.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml && npm test -- --run && npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ⬜ | | |
| 2 | ⬜ | | |
| 3 | ⬜ | | |
| 4 | ⬜ | | |
| 5 | ⬜ | | |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 使用本地 bare repo 做 Git 集成测试 | push/fetch/pull 需要可重复验证 | 直接访问 GitHub、mock git2 | 本地 bare repo 不依赖网络且能覆盖真实 libgit2 行为 |

## Completion Summary

Completed:
Duration: 5 steps
All acceptance criteria: PASS / FAIL

Summary:

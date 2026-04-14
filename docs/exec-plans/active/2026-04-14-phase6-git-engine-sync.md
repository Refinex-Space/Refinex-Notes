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

**Files:** `src-tauri/Cargo.toml`, `src-tauri/src/git/mod.rs`, `src-tauri/src/git/auth.rs`, `src-tauri/src/lib.rs`, `docs/exec-plans/active/2026-04-14-phase6-git-engine-sync.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml git::`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml git::` 通过，新增 6 个 Git 域单测（状态映射 3 个、token 解析 3 个）全部通过。
Deviations: 为了让 Git 域测试进入编译图，本步额外接入了 `src-tauri/src/lib.rs` 的 `mod git;` 声明。

### Step 2: 实现核心 Git 操作与离线仓库测试

**Files:** `src-tauri/src/git/mod.rs`, `src-tauri/src/git/auth.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml git::tests::`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml git::tests::` 通过，覆盖 `init/status/stage/commit/log/diff`、本地 bare remote 的 `clone/fetch/pull --rebase/push`、以及 rebase 冲突上报。
Deviations: 将核心 Git 原语的离线集成测试与实现放在同一个 `src-tauri/src/git/mod.rs`，避免当前仓库尚无独立 Rust 集成测试目录时再引入额外结构。

### Step 3: 实现同步状态机并接入工作区写入触发

**Files:** `src-tauri/src/git/sync.rs`, `src-tauri/src/state.rs`, `src-tauri/src/commands/files.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml git::sync::tests::`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml git::sync::tests::` 通过，覆盖“脏工作区自动提交推送”“远端更新自动拉取”“rebase 冲突上报 conflicted”三类状态机场景。
Deviations: 同步器核心循环拆成可单测的 `run_sync_cycle`，后台 `tokio` task 仅负责计时、防抖与事件发射；这样测试无需依赖真实 Tauri 窗口句柄。

### Step 4: 暴露 Tauri Git commands 并接入运行时

**Files:** `src-tauri/src/commands/git.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/commands/mod.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml commands::git::tests::`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml commands::git::tests::` 通过，Git commands 的路径解析、limit 归一化、停止同步状态构造均已验证；同时 `src-tauri/src/lib.rs` 已完成 invoke handler 注册。
Deviations: command 层保持薄封装，仅测试无 Tauri runtime 依赖的辅助逻辑；运行时接线的有效性由本步编译通过和第 5 步全量验证共同兜底。

### Step 5: 全量验证并更新控制面

**Files:** `docs/PLANS.md`, `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`, `docs/exec-plans/active/2026-04-14-phase6-git-engine-sync.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml && npm test -- --run && npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml git::` 通过，6/6 Git 域测试通过 | 建立 `git2` 依赖、错误类型与 keyring 凭证桥接 |
| 2 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml git::tests::` 通过，6 个 Git 域测试全部通过 | 核心 Git 原语已可离线验证，包含冲突路径 |
| 3 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml git::sync::tests::` 通过，3 个同步场景测试通过 | 已接入后台循环、30 秒保存防抖与 conflicted 上报 |
| 4 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml commands::git::tests::` 通过，3 个 command 辅助测试通过 | Git IPC commands 与运行时注册已接通 |
| 5 | ⬜ | | |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 使用本地 bare repo 做 Git 集成测试 | push/fetch/pull 需要可重复验证 | 直接访问 GitHub、mock git2 | 本地 bare repo 不依赖网络且能覆盖真实 libgit2 行为 |
| 第 1 步提前接入 `mod git;` | Rust 模块未进入编译图，Git 域测试不会执行 | 推迟到 commands 接线阶段 | 先把模块纳入编译/测试，能尽早暴露类型和依赖问题 |
| 第 2 步测试与实现共置于 `git/mod.rs` | 当前仓库只有内联 Rust 测试惯例 | 新建 `tests/` 目录 | 遵循 `src-tauri/AGENTS.md` 的“inline unit tests”约定，减少控制面漂移 |
| 同步循环拆分为“纯同步周期 + task 外壳” | 需要同时满足可测试性与 Tauri 事件发射 | 直接把所有逻辑写进 `tokio::spawn` | 保持状态机可离线单测，同时让命令层只管理生命周期 |
| Git commands 只做参数校验与状态取用 | 避免 command 层重新承载 Git 业务逻辑 | 在 `commands/git.rs` 里直接拼装底层操作 | 保持 `src-tauri/AGENTS.md` 规定的 IPC 边界清晰，测试也更聚焦 |

## Completion Summary

Completed:
Duration: 5 steps
All acceptance criteria: PASS / FAIL

Summary:

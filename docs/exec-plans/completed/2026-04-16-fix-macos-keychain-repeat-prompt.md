# Fix Plan: Fix macOS Keychain Repeat Prompt

Created: 2026-04-16
Status: Completed
Author: agent
Type: fix

## Bug Brief

**Symptom**: 用户在 macOS 系统钥匙串弹窗中已经点击“永久允许”后，应用后续仍会再次请求访问 GitHub session/token。
**Expected**: 同一应用会话内，系统钥匙串授权命中一次后，后续认证检查和 Git HTTPS 认证不应继续重复触发 Keychain 访问提示。
**Severity**: Degraded
**Type**: New bug

### Reproduction

1. 在 macOS 上完成 GitHub 登录，让 session 写入系统钥匙串。
2. 在系统钥匙串权限弹窗里点击“永久允许”。
3. 继续执行应用启动鉴权、Git push/pull 或自动同步。
4. 观察系统仍可能再次弹出钥匙串访问请求。

Reproduction evidence: 代码检查显示 `check_auth_status()`、token refresh 写回，以及 `git::auth::remote_callbacks()` 都会各自直接访问 `keyring::Entry`；当前实现没有任何进程内缓存，因此单个 app session 内会重复命中 macOS Keychain。

## Root Cause

**Mechanism**: GitHub session/token 的读取分散在认证检查和 Git 认证两个路径上，且每次都直接访问系统钥匙串。即使 Keychain ACL 正常，单进程内仍会重复触发受保护资源访问；在 dev/未稳定签名环境下，这会进一步放大成“明明点过永久允许却还在反复索要”的体感问题。
**Introduced by**: 初版实现只考虑了安全存储，没有引入会话级缓存层来去重 Keychain 读操作。
**Why it wasn't caught**: 现有测试覆盖了 token/session 解析，但没有覆盖“同一进程内只访问一次系统钥匙串”的行为约束。

## Hypothesis Log

### Hypothesis #1: 主要问题不在 session 解析，而在多个命令路径重复直接读取 Keychain

Prediction: 如果把 session 读写收敛到共享模块并加入进程内缓存，同一进程内的重复鉴权与 Git 认证将不再重复访问 Keychain。
Experiment: 检查 `src-tauri/src/commands/auth.rs` 和 `src-tauri/src/git/auth.rs` 的读写路径，以及 `keyring` 在 macOS 下的实现。
Result: `check_auth_status()`、refresh 写回和 Git remote callbacks 都会直接访问系统钥匙串；`keyring` 的 macOS 实现通过 `find_generic_password` / `set_generic_password` 读写 Keychain，当前仓库没有缓存层。
Conclusion: CONFIRMED

## Fix

**Strategy**: 新增共享 GitHub session 存储模块，统一负责 Keychain 读写、JSON/legacy token 解析与进程内缓存；认证命令和 Git 认证都只走这一个入口。
**Files**: `src-tauri/src/github_session.rs`, `src-tauri/src/commands/auth.rs`, `src-tauri/src/git/auth.rs`, `src-tauri/src/lib.rs`, `docs/PLANS.md`
**Risk**: 低到中。缓存必须和写入、登出、失效清理保持一致，否则会出现脏读。

### Steps

#### Step 1: 登记 fix plan

**Files:** `docs/exec-plans/active/2026-04-16-fix-macos-keychain-repeat-prompt.md`, `docs/PLANS.md`
**Verification:** 计划文件存在，`docs/PLANS.md` 已登记

Status: ✅ Done
Evidence: 已创建 fix plan 并加入 `docs/PLANS.md`。
Deviations:

#### Step 2: 抽出共享 session/keychain 模块并加进程内缓存

**Files:** `src-tauri/src/github_session.rs`, `src-tauri/src/commands/auth.rs`, `src-tauri/src/git/auth.rs`, `src-tauri/src/lib.rs`
**Verification:** 认证检查、refresh、Git callbacks 都通过统一入口访问 session

Status: ✅ Done
Evidence: 新增 `src-tauri/src/github_session.rs`，统一负责 GitHub session 的 Keychain 读写、structured JSON / legacy token 解析与进程内缓存；`src-tauri/src/commands/auth.rs` 的鉴权检查、refresh 写回、logout 清理和 `src-tauri/src/git/auth.rs` 的 Git HTTPS callbacks 都改为走这一个入口。
Deviations:

#### Step 3: 增加 Rust 回归测试并验证

**Files:** `src-tauri/src/github_session.rs`, `src-tauri/src/commands/auth.rs`, `src-tauri/src/git/auth.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml` 通过，新增测试覆盖缓存命中

Status: ✅ Done
Evidence: `github_session` 模块新增 `load_session_uses_process_cache_after_first_read` 回归测试，验证同一进程内第二次读取直接命中缓存、不再触发底层加载；`cargo test --manifest-path src-tauri/Cargo.toml` 通过（36 测试），`npm test` 通过（22 文件 / 129 断言），`npm run build` 通过，`python3 scripts/check_harness.py` 通过。
Deviations:

## Verification

- [x] Reproduction path now uses cached session after first load
- [x] Regression test added and passes
- [x] Full relevant test suite passes
- [x] Diff reviewed — only fix-related changes present
- [x] Pre-existing failures unchanged

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| Reproduce | ✅ | 用户描述 + 代码路径确认重复 Keychain 访问 |  |
| Root cause | ✅ | 鉴权与 Git 路径都在直接读 Keychain |  |
| Fix | ✅ | 认证与 Git 路径已统一接入 `github_session` |  |
| Verify | ✅ | `cargo test`、`npm test`、`npm run build`、Harness 校验通过 |  |
| Regression | ✅ | 新增缓存命中回归测试 |  |

## Completion Summary

Completed: 2026-04-16
Root cause: GitHub session/token 的 Keychain 访问散落在鉴权检查、token refresh 和 Git HTTPS 认证中，同一进程内没有缓存层，导致系统钥匙串会被重复命中。
Fix: 新增共享 `github_session` 模块，把 Keychain 读写和解析收口，并加入进程内 raw session cache；认证与 Git 认证都复用它。
Regression test: `src-tauri/src/github_session.rs` 中的 `load_session_uses_process_cache_after_first_read`
All verification criteria: PASS

Summary: 这次修复没有改登录协议本身，而是改了“怎么访问系统钥匙串”。此前 GitHub session 在 `check_auth_status()`、token refresh 写回和 Git callbacks 中各自直接读写 Keychain，macOS 上这会让同一 app 会话里重复命中受保护凭据。现在 session 存储逻辑被统一到 `github_session` 模块，首次从 Keychain 读出后会放入进程内缓存，后续同一进程里的认证检查、Git push/pull 和自动同步都直接复用缓存，不再继续触发底层 Keychain 读取。相关 Rust 回归测试、全量前端测试、构建和 Harness 校验均已通过。

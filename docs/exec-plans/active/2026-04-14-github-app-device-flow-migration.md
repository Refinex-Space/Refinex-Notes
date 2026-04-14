# Execution Plan: GitHub App Device Flow Migration

Created: 2026-04-14
Status: Active
Author: agent

## Objective

将当前 GitHub OAuth App Device Flow 实现收敛为 GitHub App + Device Flow，并把桌面端登录态切换到 user access token / refresh token 模型，同时把 `client_id` 改为应用内置配置。

## Scope

**In scope:**
- `src-tauri/src/commands/auth.rs`、`src-tauri/src/lib.rs`、`src-tauri/src/state.rs`
- `src/services/authService.ts`、`src/stores/authStore.ts`、`src/types/auth.ts`、`src/components/auth/LoginScreen.tsx`、`src/App.tsx`
- `docs/ARCHITECTURE.md`、`docs/OBSERVABILITY.md`、`docs/PLANS.md`

**Out of scope:**
- Git 同步层对 GitHub App user access token 的复用
- GitHub App 注册、权限设计与真实 `client_id` 发放流程
- 端到端桌面 OAuth smoke 自动化

## Constraints

- 前端认证流程必须继续经由 `src/services/` 调用 Tauri command，不在 React 组件里直接嵌入原生认证细节。
- Rust 侧 GitHub API / keyring / token 刷新逻辑保留在 `src-tauri/src/commands/` 与 `AppState` 边界内，不向前端暴露敏感 token。
- token 与 refresh token 不得进入 localStorage、console 日志或前端持久化层；仅允许进入操作系统 keyring。
- 保持现有 `SplashScreen → LoginScreen → WorkspaceShell` 交互结构，避免重做 UI 流程。

## Acceptance Criteria

- [ ] AC-1: Rust 侧 Device Flow 请求不再使用 OAuth app scope 语义，而是按 GitHub App user access token 路径处理 `device_code`、`access_token`、`refresh_token`、过期信息与错误映射。
- [ ] AC-2: `check_auth_status` 能使用 keyring 中的会话记录恢复登录；当 access token 失效但 refresh token 仍有效时，能自动刷新并继续返回用户信息。
- [ ] AC-3: `client_id` 由应用内置配置提供，最终用户运行时不再需要设置 `GITHUB_CLIENT_ID`；缺失时错误文案指向“应用构建未嵌入 GitHub App 配置”而不是要求用户配置环境变量。
- [ ] AC-4: 前端登录界面和 store 交互基本不变，但文案/类型/错误提示对齐 GitHub App 语义。
- [ ] AC-5: `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test -- --run`、`npm run build`、`python3 scripts/check_harness.py` 通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| GitHub App user access token 默认过期，现有只存单 token 会导致重启恢复在 8 小时后失效 | High | 将 keyring 条目改为结构化会话，保存 refresh token 与过期时间，并在 `check_auth_status` 内集中刷新 |
| 编译期内置 `client_id` 后，本地开发体验与已发布版本的配置来源不同 | Medium | 保留编译期环境变量注入能力，但移除面向终端用户的运行时配置要求与错误文案 |
| GitHub App device flow 的错误码与现有 OAuth 逻辑略有差异，可能导致 UI 提示误判 | Medium | 按 GitHub 官方文档补充错误映射与 Rust 单测，确保 `slow_down` / `device_flow_disabled` / refresh 失败等路径可验证 |

## Implementation Steps

### Step 1: 建立 GitHub App 迁移计划并注册控制面

**Files:** `docs/exec-plans/active/2026-04-14-github-app-device-flow-migration.md`, `docs/PLANS.md`
**Verification:** `git diff -- docs/PLANS.md docs/exec-plans/active/2026-04-14-github-app-device-flow-migration.md`

Status: 🔄 In progress
Evidence:
Deviations:

### Step 2: 重构 Rust 认证链路与 keyring 会话模型

**Files:** `src-tauri/src/commands/auth.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/state.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 对齐前端认证语义与错误处理

**Files:** `src/services/authService.ts`, `src/stores/authStore.ts`, `src/types/auth.ts`, `src/components/auth/LoginScreen.tsx`, `src/stores/__tests__/authStore.test.ts`
**Verification:** `npm test -- --run src/stores/__tests__/authStore.test.ts`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: 同步文档与完成全量验证

**Files:** `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`, `docs/PLANS.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml && npm test -- --run && npm run build && python3 scripts/check_harness.py`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | 🔄 | 计划文件创建中 | 收敛 GitHub App 迁移范围、验收标准与风险 |
| 2 | ⬜ |  | 待改造原生 token 交换/刷新/配置来源 |
| 3 | ⬜ |  | 待对齐前端语义与测试 |
| 4 | ⬜ |  | 待同步控制面并归档 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 为 GitHub App 迁移创建新计划，而不是回写已归档的 OAuth 计划 | 已有计划已归档且结论不同 | 直接修改旧归档计划 | 保持审计链条清晰，避免把产品方向变更覆盖成同一轮交付 |

## Completion Summary

Completed:
Duration:
All acceptance criteria:

Summary:

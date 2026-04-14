# Execution Plan: GitHub App Device Flow Migration

Created: 2026-04-14
Status: Completed
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

Status: ✅ Done
Evidence: `git diff -- docs/PLANS.md docs/exec-plans/active/2026-04-14-github-app-device-flow-migration.md` 已建立新计划并注册到 Active Plans。
Deviations:

### Step 2: 重构 Rust 认证链路与 keyring 会话模型

**Files:** `src-tauri/src/commands/auth.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/state.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml` 通过（10/10）；`src-tauri/src/commands/auth.rs` 已切换到 GitHub App Device Flow 会话模型，keyring 改为结构化会话，`check_auth_status` 可按 refresh token 续期。
Deviations: 为兼容已落地的旧钥匙串条目，新增了对“纯 access token 字符串”格式的兼容解析，而不是强制删除旧会话。

### Step 3: 对齐前端认证语义与错误处理

**Files:** `src/services/authService.ts`, `src/stores/authStore.ts`, `src/types/auth.ts`, `src/components/auth/LoginScreen.tsx`, `src/stores/__tests__/authStore.test.ts`
**Verification:** `npm test -- --run src/stores/__tests__/authStore.test.ts`

Status: ✅ Done
Evidence: `npm test -- --run` 通过（80/80）；登录界面与 auth service/store 交互未改形，但前端语义已从 “OAuth/access token” 收敛为“GitHub 登录会话”。
Deviations: 没有新增前端状态字段，继续复用现有 `DeviceCodeResponse` / `AuthProgressEvent` 模型以减少界面层扰动。

### Step 4: 同步文档与完成全量验证

**Files:** `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`, `docs/PLANS.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml && npm test -- --run && npm run build && python3 scripts/check_harness.py`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test -- --run`、`npm run build`、`python3 scripts/check_harness.py` 全部通过；`docs/ARCHITECTURE.md` 与 `docs/OBSERVABILITY.md` 已同步为 GitHub App + 编译期内置 client_id 模型。
Deviations: 当前仓库仍未内置真实的 GitHub App client ID，因此桌面手工 smoke 仍需由维护者在构建时提供 `GITHUB_APP_CLIENT_ID`。

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 新计划已创建并注册到 `docs/PLANS.md` | 与已归档 OAuth 计划拆分，保留独立审计链条 |
| 2 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml` 通过（10/10） | Rust 侧已切到 GitHub App user access token / refresh token 模型 |
| 3 | ✅ | `npm test -- --run` 通过（80/80） | 前端交互未重写，仅收敛语义与错误文案 |
| 4 | ✅ | `cargo test` / `npm test` / `npm run build` / `check_harness` 全绿 | 控制面文档已同步 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 为 GitHub App 迁移创建新计划，而不是回写已归档的 OAuth 计划 | 已有计划已归档且结论不同 | 直接修改旧归档计划 | 保持审计链条清晰，避免把产品方向变更覆盖成同一轮交付 |
| `client_id` 改为编译期内置，保留 `GITHUB_CLIENT_ID` 仅作旧构建链路回退 | 用户不应在运行时手工配置登录参数 | 继续使用运行时环境变量、把 `client_id` 硬编码进仓库 | 让发布版满足“最终用户零配置”，同时不阻断当前本地构建链路 |
| keyring 条目升级为结构化 session JSON，并兼容旧纯 token 字符串 | GitHub App user access token 默认短期过期 | 继续只存 access token、强制清空旧 session | 既满足 refresh token 续期，又避免升级后立刻把已有会话全部打掉 |

## Completion Summary

Completed:
Duration: 4 steps
All acceptance criteria: PASS

Summary: 本轮将 Refinex-Notes 的 Phase 5 登录实现从 GitHub OAuth App Device Flow 收敛到了 GitHub App + Device Flow：Rust 侧不再使用 scope 语义，而是改为 GitHub App user access token / refresh token 会话模型，并把 keyring 持久化从单字符串升级为结构化 session；`check_auth_status` 在启动恢复时可先校验、再按需刷新 token。前端交互维持原有 `LoginScreen`、验证码展示和轮询提示，只把用户可见语义收口为“GitHub 登录会话”。配置上，`client_id` 已改为编译期内置来源，避免把配置责任推给最终用户。当前残余风险只有一项：仓库仍未内置真实 GitHub App client ID，因此真实桌面授权 smoke 仍需要维护者在构建时提供 `GITHUB_APP_CLIENT_ID`。

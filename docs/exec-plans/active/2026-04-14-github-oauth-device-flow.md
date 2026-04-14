# Execution Plan: GitHub OAuth Device Flow

Created: 2026-04-14
Status: Active
Author: agent

## Objective

为 Refinex-Notes 落地完整的 GitHub OAuth Device Flow 登录链路，使用户可完成登录、自动恢复会话，并将 access token 仅存储在操作系统钥匙串中。

## Scope

**In scope:**
- `src-tauri/src/commands/auth.rs`、`src-tauri/src/lib.rs`、`src-tauri/src/state.rs`
- `src-tauri/Cargo.toml` 与必要的 Tauri capability / plugin 配置
- `src/services/authService.ts`、`src/stores/authStore.ts`、`src/components/auth/LoginScreen.tsx`、`src/App.tsx`
- `src/types/auth.ts` 及相关前端测试

**Out of scope:**
- Git 同步层对 OAuth token 的复用桥接
- 多 Provider 认证、刷新 token、账户切换
- 远端 API mock server 或端到端桌面自动化测试

## Constraints

- 前端认证流程必须通过 `src/services/` 调用 Tauri command，不在 React 组件里直接嵌入原生逻辑。
- Rust 侧 OAuth / keyring / GitHub API 通讯保留在 `src-tauri/src/commands/` 与共享 `AppState` 边界内。
- token 不得进入 localStorage、console 日志或前端持久化层；仅允许存入操作系统 keyring。
- 保持现有工作区/编辑器壳层不回退；未登录时只做界面 gating，不重写主界面结构。

## Acceptance Criteria

- [ ] AC-1: 首次启动在无有效 token 时展示登录界面，点击 GitHub 登录后可获得 `user_code`、展示 `verification_uri`，并在授权成功后进入主界面。
- [ ] AC-2: `github_auth_poll` 使用 Tauri Channel 向前端发送轮询进度，授权成功后把 token 写入 `"refinex-notes" / "github-token"` 钥匙串条目。
- [ ] AC-3: 应用重启后 `check_auth_status` 能恢复有效登录态；执行登出后删除钥匙串 token 并回到登录界面。
- [ ] AC-4: `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test -- --run`、`npm run build` 通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| GitHub Device Flow 轮询节奏处理不当导致 `slow_down` 或过期逻辑错误 | Medium | 严格按 GitHub `interval` 字段轮询，并对 `slow_down` 累加等待时间 |
| keyring 3 在不同平台缺少 feature 或行为差异导致编译/运行失败 | Medium | 在 `Cargo.toml` 显式启用 macOS / Windows / Linux Secret Service feature，并在错误路径统一包装 |
| Tauri 外部浏览器打开能力缺失导致“打开浏览器”按钮不可用 | Medium | 使用官方 opener plugin 与 capability；若本地环境不支持，则保留可复制 URL 的回退路径 |
| App gate 改动误伤现有 workspace shell 初始化 | Low | 把认证 gating 放在 `App.tsx` 顶层，并保持现有主界面渲染逻辑原样复用 |

## Implementation Steps

### Step 1: 实现 Rust 侧 GitHub Device Flow command 与安全存储

**Files:** `src-tauri/Cargo.toml`, `src-tauri/src/commands/auth.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/state.rs`, `src-tauri/capabilities/default.json`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml` 通过，Rust 测试由 3 个增至 6 个；`github_auth_start` / `github_auth_poll` / `check_auth_status` / `github_logout` / `open_external_url` 已注册到 Tauri invoke handler。
Deviations:

### Step 2: 实现前端认证 service/store 与进度模型

**Files:** `src/services/authService.ts`, `src/stores/authStore.ts`, `src/types/auth.ts`, `src/hooks/useAuth.ts`, `src/stores/__tests__/authStore.test.ts`
**Verification:** `npm test -- --run src/stores/__tests__/authStore.test.ts`

Status: ✅ Done
Evidence: `npm test -- --run src/stores/__tests__/authStore.test.ts` 通过（3/3），`npm run build` 通过；前端已具备 `checkStatus` / `startLogin` / `pollForLogin` / `logout` / `openVerificationUri` service 封装，以及带轮询状态机的 `authStore`。
Deviations:

### Step 3: 落地登录界面与主界面认证 gating

**Files:** `src/components/auth/LoginScreen.tsx`, `src/App.tsx`, `src/components/layout/StatusBar.tsx`（如需接入登出入口）
**Verification:** `npm run build`

Status: ✅ Done
Evidence: `npm run build` 通过；`src/App.tsx` 已在启动时执行 `checkAuth()` 并按 `SplashScreen → LoginScreen → WorkspaceShell` gating，`LoginScreen` 已包含 GitHub 登录按钮、验证码展示、复制/打开浏览器按钮与轮询中的进度提示。
Deviations:

### Step 4: 运行全量验证并同步控制面

**Files:** `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`（如依赖或运行要求变化）
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml && npm test -- --run && npm run build && python3 scripts/check_harness.py`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml` 通过（6/6） | Rust 侧 GitHub Device Flow、keyring 与浏览器打开辅助命令已落地 |
| 2 | ✅ | `npm test -- --run src/stores/__tests__/authStore.test.ts` 通过（3/3） | 前端 service/store 已具备启动恢复、device flow 轮询和登出清空状态 |
| 3 | ✅ | `npm run build` 通过 | 登录界面与主界面 gating 已接通，侧栏 Workspace 区新增登出入口 |
| 4 | ⬜ | | |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 使用 GitHub 官方 Device Flow + keyring | 认证与 token 存储方案 | 自建回调、localStorage、明文文件 | 与设计文档一致，且满足桌面端安全约束 |
| 使用极小的 `open_external_url` 原生命令替代 opener plugin | 需要“打开浏览器”按钮但仓库当前未接入 opener 能力 | 新增 `tauri-plugin-opener`、纯前端 `window.open` | 减少额外依赖与 capability 变更，同时仍可在原生层安全限制只打开 GitHub 授权链接 |

## Completion Summary

Completed:
Duration: 4 steps
All acceptance criteria: PASS / FAIL

Summary:

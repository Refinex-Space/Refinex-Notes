# Execution Plan: Optional GitHub Login On Startup

Created: 2026-04-22
Status: Completed
Author: agent
Type: feature

## Objective

让应用在启动完成会话恢复检查后直接进入主壳层，而不是因未登录 GitHub 被整页阻塞；GitHub 登录改为壳内可选入口。

## Scope

- `src/App.tsx`
- `src/components/auth/LoginScreen.tsx`
- `src/components/auth/AccountStatus.tsx`
- `src/**/__tests__`
- `docs/PLANS.md`

## Non-Scope

- Rust 侧 GitHub Device Flow / keyring / auth command 改造
- Git 功能权限模型重做
- 新增独立设置页或账户中心

## Constraints

- 保持 `src/` 内的 UI 和 store/service 分层，不把 auth IPC 逻辑塞进 `App.tsx`
- 优先复用现有 `LoginScreen` 的 device flow UI，不再造一套并行登录组件
- 维持现有 `checkAuth()` 启动恢复语义，只取消“未登录即阻塞主界面”的门禁

## Acceptance Criteria

- 启动时在 `checkAuth()` 完成后，无论是否已登录，都进入 `WorkspaceShell`
- 未登录时应用壳层内存在可见的 GitHub 登录入口
- 已登录时仍显示现有账号状态和退出能力
- 现有 auth store 流程与会话恢复不回归
- 相关测试覆盖新的启动策略和未登录入口

## Risks

- 如果只删启动门禁而不补壳内入口，登录能力会变得不易发现
- 如果壳内入口直接复刻一套登录 UI，容易和现有 `LoginScreen` 分叉
- 如果启动判断逻辑没有测试，后续很容易被重新改回强制登录

## Assumptions

- 当前工作区壳层在未登录状态下依然可用，GitHub 登录只影响账号/仓库相关能力
- 启动阶段短暂显示 `SplashScreen` 用于等待 `checkAuth()` 结果仍然可接受

## Steps

### Step 1: Remove the startup auth gate

**Files:** `src/App.tsx`
**Verification:** 认证解析完成后总是渲染 `WorkspaceShell`，不再渲染全屏登录页

Status: ✅ Done

### Step 2: Move login entry into the app shell

**Files:** `src/components/auth/AccountStatus.tsx`, `src/components/auth/LoginScreen.tsx`
**Verification:** 未登录时状态栏出现“连接 GitHub”入口，点击后可在应用内继续现有 device flow

Status: ✅ Done

### Step 3: Add regression coverage and verify

**Files:** `src/__tests__/App.test.ts`, `src/components/auth/__tests__/AccountStatus.test.tsx`
**Verification:** `npm test`, `npm run build`, `python3 scripts/check_harness.py`

Status: ✅ Done

## Verification Summary

- `npm test` -> pass (`27` files / `149` tests)
- `npm run build` -> pass
- `python3 scripts/check_harness.py` -> pass

## Completion Summary

Completed: 2026-04-22

Summary:

- 启动阶段现在只在 auth 恢复尚未完成时显示 `SplashScreen`；恢复完成后总是进入 `WorkspaceShell`
- 未登录时，状态栏会显示“连接 GitHub”入口，并在应用内弹出复用现有 device flow 的登录面板
- `LoginScreen` 被改造成可嵌入面板，避免再维护第二套登录 UI
- 新增回归测试锁定新的启动判定和未登录入口可见性

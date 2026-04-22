# Execution Plan: Phase 8 AI Provider Proxy

Created: 2026-04-22
Status: Active
Author: agent

## Objective

在 `src-tauri` 内实现统一的 AI Provider 流式代理层，让前端通过 Tauri `Channel<String>` 接收 token，并保证 API Key 只保留在 Rust 进程与系统钥匙串中。

## Scope

**In scope:**
- `src-tauri/src/ai/`
- `src-tauri/src/commands/ai.rs`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/db.rs`
- `src-tauri/src/state.rs`
- `src-tauri/src/lib.rs`
- 与 AI provider 设置 / keyring / 流式解析直接相关的 Rust 测试
- `docs/ARCHITECTURE.md`

**Out of scope:**
- 前端 AI 对话面板 UI 与状态管理
- Provider 配置编辑界面
- 工具调用、多模态输入、非流式对话接口
- 多会话并发取消管理

## Constraints

- IPC 入口必须留在 `src-tauri/src/commands/`，Provider 逻辑必须留在 `src-tauri/src/ai/`
- 复用现有 `settings` SQLite 表与 `keyring`，不要引入新的配置存储系统
- 不把 API Key 返回到前端、日志、SQLite 明文或测试快照
- 任务应以填充现有占位模块为主，不创建平行架构

## Acceptance Criteria

- [x] AC-1: `ai_list_providers` 能从 `settings` 表读取 JSON 配置列表，并返回不含 API Key 的 provider 元数据
- [x] AC-2: OpenAI compatible provider 能构造流式聊天请求，并从 SSE 数据流中解析增量文本后通过 `Channel<String>` 发送
- [x] AC-3: Anthropic provider 能构造 `v1/messages` 流式请求，并从 SSE 数据流中解析增量文本后通过 `Channel<String>` 发送
- [x] AC-4: `ai_chat_stream` 能按 `provider_id` 选择 provider、从 keyring 取 key、启动流式请求，并在完成时结束；`ai_cancel_stream` 能中断当前流
- [x] AC-5: Rust 测试覆盖设置读取、SSE 解析、provider 请求/响应解析和取消状态管理，且 `cargo test --manifest-path src-tauri/Cargo.toml` 保持通过

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| 不同 provider 的 SSE 事件结构不一致 | Med | 先抽象通用逐行解析器，再按 provider 定义 delta 提取函数 |
| Tauri `Channel` 与取消句柄的状态共享容易造成锁竞争 | Med | 将当前流句柄集中放在 `AppState`，缩小锁作用域并避免在锁内等待异步网络 |
| keyring 命名规则不稳定会影响后续配置兼容性 | Low | 固定 service/account 约定并以单元测试锁定 |
| 联网 smoke 依赖真实密钥，CI 无法证明外部 API 可用 | High | 以结构化单元测试证明请求构造、流解析和取消逻辑，把真实 smoke 留给人工验收 |

## Implementation Steps

### Step 1: 建立 AI 配置与运行时状态骨架

**Files:** `src-tauri/src/ai/mod.rs`, `src-tauri/src/db.rs`, `src-tauri/src/state.rs`, `src-tauri/src/lib.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml ai::tests:: db::tests::`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml` 通过，Rust 测试总数从 36 增至 43；新增 `ai::tests::*` 与 `db::tests::*` 覆盖 provider 配置、keyring account 约定、settings JSON round-trip。
Deviations:

### Step 2: 实现通用 SSE 流解析与 token 下发

**Files:** `src-tauri/src/ai/streaming.rs`, `src-tauri/src/ai/mod.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml streaming`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml streaming` 通过，新增 3 个解析测试覆盖多行 `data:`、chunk 边界、`[DONE]` 与非法字段处理。
Deviations:

### Step 3: 实现 OpenAI-compatible 与 Anthropic provider

**Files:** `src-tauri/src/ai/providers.rs`, `src-tauri/src/ai/mod.rs`, `src-tauri/Cargo.toml`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml providers`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml commands::ai` 通过，`commands::ai` 新增 4 个测试覆盖 provider 查找、替换流时取消旧 sender、仅清理当前 sender、手动取消当前流。
Deviations:

### Step 4: 接入 Tauri AI commands 与取消语义

**Files:** `src-tauri/src/commands/ai.rs`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/state.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml commands::ai`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml` 54 passed；`npm test -- --run` 149 passed；`npm run build` 通过。`docs/ARCHITECTURE.md` 与 `docs/OBSERVABILITY.md` 已更新为 AI 代理层现状与最新测试计数。
Deviations:

### Step 5: 更新控制面并做整体验证

**Files:** `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`（如需）, `docs/exec-plans/active/2026-04-22-phase8-ai-provider-proxy.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`, `npm test -- --run`, `npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml` 43 passed | AI 配置骨架、settings 读取与单流取消状态已就位 |
| 2 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml streaming` 3 passed | SSE 事件解析与可取消流循环已独立实现 |
| 3 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml providers` 4 passed | OpenAI-compatible / Anthropic 请求体与事件提取已就位 |
| 4 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml commands::ai` 4 passed | Tauri AI commands、provider 选择与取消状态接入完成 |
| 5 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml`; `npm test -- --run`; `npm run build` | 全量验证通过，控制面文档已同步 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 当前任务只实现 Rust 代理层，不包含前端 AI 面板 | 用户当前子任务聚焦后端代理 | 同时实现 UI | 保持 diff 聚焦，先满足当前阶段的原生能力验收 |
| 取消语义先支持单个当前流 | 需求只要求“取消当前流” | 完整多会话取消表 | 更小设计即可满足验收，避免过早引入会话编排 |
| Step 1 提前触及 `src-tauri/src/lib.rs` | `db.rs` 需要复用 `crate::ai` 类型 | 把类型留在 `db.rs` 或延后注册模块 | 直接在 crate root 注册 `ai` 模块更符合现有域边界 |

## Completion Summary

Completed: 2026-04-22
Duration: 5 steps
All acceptance criteria: PASS

Summary: 已在 `src-tauri` 内落地统一的 AI Provider 代理层，使用 SQLite `settings` 表存放 provider 元数据、系统 keyring 存放 API Key，并通过 `tauri::ipc::Channel<String>` 将流式 token 发送到前端。实现包含 OpenAI-compatible / Anthropic 两类 HTTP 客户端、可复用的 SSE 解析器、单个当前流的取消语义，以及相应的 Rust 单元测试。真实 DeepSeek / Anthropic 联网 smoke 尚未在本地执行，因为当前会话没有可用的真实 API Key。

# Execution Plan: Phase 8 AI Model Catalog

Created: 2026-04-22
Status: Active
Author: agent

## Objective

在现有 Rust AI 流式代理层上补齐原生层统一模型目录与命令面，让前端后续只消费 Tauri commands 提供的 provider/model 真源。

## Scope

**In scope:**
- `src-tauri/src/ai/`
- `src-tauri/src/commands/ai.rs`
- `src-tauri/src/db.rs`
- `src-tauri/src/lib.rs`
- 与 AI provider/model 目录直接相关的 Rust 测试
- `docs/ARCHITECTURE.md`
- `docs/OBSERVABILITY.md`

**Out of scope:**
- 前端 AI 对话面板与状态管理
- 设置页 Provider/Model 配置 UI
- 动态模型刷新接口的真实联网实现
- 在桌面运行时引入 Vercel AI SDK
- 工具调用、多模态输入、结构化 token event

## Constraints

- Rust 继续作为唯一 AI 执行面，前端不直接触达第三方 AI API
- API Key 只允许存在于系统 keyring 与 Rust 进程内，不写入 SQLite、日志或前端代码
- Provider 与模型目录的运行时真源都在原生层；前端不得维护分散硬编码真源
- 复用现有 `settings` 表与 AI 模块边界，不创建新的存储系统或平行架构
- 当前阶段只需实现 L1 稳定默认模型目录，并为后续 L2 刷新保留扩展位

## Acceptance Criteria

- [ ] AC-1: 原生层定义稳定的 AI 模型目录类型，至少包含 `provider_id`、`model_id`、`label`、`is_default`
- [ ] AC-2: `ai_list_models(provider_id)` 能稳定返回对应 provider 的模型目录，并在无持久化配置时回退到内置默认目录
- [ ] AC-3: `ai_list_providers()`、`ai_chat_stream()`、`ai_cancel_stream()` 继续保持可用且不泄露 API Key
- [ ] AC-4: `ai_test_connection(provider_id, model)` 具备稳定 command 边界，供 Phase 10 设置页复用
- [ ] AC-5: Rust 测试覆盖模型目录默认回退、settings round-trip、command 查询与既有 AI 流能力不回归；`cargo test --manifest-path src-tauri/Cargo.toml` 保持通过

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| 模型目录结构过早绑定未来刷新策略 | Med | 先实现最小稳定字段，只预留可扩展数据入口 |
| provider 配置和模型目录来源分离导致前端选择数据不一致 | Med | 统一通过 `commands/ai.rs` 做查询与回退策略，测试锁定行为 |
| 补充命令面时破坏既有流式 AI 行为 | Low | 只做外科手术式扩展，并在全量 Rust 测试上验证 |

## Implementation Steps

### Step 1: 定义原生模型目录类型与默认目录

**Files:** `src-tauri/src/ai/mod.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml ai::tests::`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 2: 扩展 settings 读取与模型目录回退策略

**Files:** `src-tauri/src/db.rs`, `src-tauri/src/ai/mod.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml db::tests::`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 扩展 AI commands 暴露 provider/model 查询与测试连接边界

**Files:** `src-tauri/src/commands/ai.rs`, `src-tauri/src/lib.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml commands::ai`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: 同步控制面并完成整体验证

**Files:** `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`, `docs/PLANS.md`, `docs/exec-plans/active/2026-04-22-phase8-ai-model-catalog.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`; `npm test -- --run`; `npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ⬜ |  | 待补齐模型目录类型与默认目录 |
| 2 | ⬜ |  | 待补齐 settings 读取与默认回退 |
| 3 | ⬜ |  | 待扩展命令面 |
| 4 | ⬜ |  | 待同步控制面与整体验证 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 本轮在既有 Rust AI 代理层上增量扩展，而不是重建整个代理层 | `chat_stream` / SSE / cancel 已存在 | 从零重做 Phase 8 Rust 层 | 真实缺口集中在模型目录与命令真源，重建会制造无效 diff |
| 先落地 L1 默认模型目录，不直接做 L2 联网刷新 | 当前验收不要求动态刷新 | 现在就接入各 provider 模型元数据接口 | 先建立稳定 native contract，再按需扩展刷新能力 |
| `ai_test_connection` 先提供稳定命令边界 | Phase 10 需要复用但当前未实现设置页 | 暂不暴露该命令 | 先固定 IPC 契约，减少后续 prompt 再次把探活逻辑推回前端的风险 |

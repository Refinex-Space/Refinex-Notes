# Execution Plan: Phase 8 AI Chat Panel

Created: 2026-04-22
Status: Completed
Author: agent

## Objective

在现有应用 shell 内落地可用的右侧 AI 对话面板，并通过前端 store/service 接入 Rust 原生 AI commands，同时构建 MVP 上下文感知 system prompt。

## Scope

**In scope:**
- `src/App.tsx`
- `src/components/ai/ChatPanel.tsx`
- `src/components/ai/ProviderSelect.tsx`
- `src/components/ai/ContextBuilder.ts`
- `src/components/ai/StreamRenderer.tsx`
- `src/components/ui/select.tsx`
- `src/stores/aiStore.ts`
- `src/services/aiService.ts`
- `src/types/ai.ts`
- 与 AI 面板 / context builder / store/service 直接相关的 Vitest 测试
- `docs/ARCHITECTURE.md`
- `docs/OBSERVABILITY.md`

**Out of scope:**
- Rust AI proxy 层继续扩容
- AI Provider/Model 设置页
- 会话持久化到磁盘
- 编辑器选区能力底层改造
- provider token 预算或上下文裁剪的原生统一策略
- 前端直连 AI SDK 或第三方 Provider API

## Constraints

- Provider 与 Model 运行时真源必须来自原生层 `ai_list_providers()` / `ai_list_models()`
- 前端只能经由 `src/services/aiService.ts` 调用 Tauri commands，不能在组件内直接调 `invoke`
- Markdown 渲染优先复用现有 `markdown-it` 能力，不以 `react-markdown` 为默认前提
- UI 需延续现有 App shell 视觉语言，不额外引入新的设计系统
- 选区在当前阶段允许为空，不阻塞 Phase 8

## Acceptance Criteria

- [x] AC-1: 右侧 AI 面板可替换当前 placeholder，并提供 Provider/Model 选择、消息列表、输入区和流式中止按钮
- [x] AC-2: Provider/Model 列表全部来自原生层返回结果，前端不维护独立运行时硬编码真源
- [x] AC-3: `sendMessage()` 会构建包含当前文档与工作区信息的 system prompt，并通过 Tauri Channel 实时接收流式 token
- [x] AC-4: AI 输出能稳定渲染 Markdown，流式半截代码块不会导致 UI 报错或明显闪烁
- [x] AC-5: `cancelStream()` 可以中止当前生成；`clearHistory()` 可以清空消息列表
- [x] AC-6: Vitest、Rust 测试与生产构建保持通过

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Tauri Channel 前端封装不当导致流式状态不同步 | Med | 在 `aiService` 统一封装 `Channel` 生命周期，store 只消费回调 |
| 上下文构建直接依赖多个 store，容易把 UI 状态和业务逻辑耦死 | Med | 把 prompt 构建下沉到纯函数 `ContextBuilder.ts`，store 只负责收集输入 |
| 半截 Markdown 在流式阶段导致整块重排或渲染异常 | Med | 在 `StreamRenderer` 里做未闭合代码块补全与稳定 HTML 渲染 |
| 新增 Select wrapper 时破坏其他 UI 使用场景 | Low | 让 `select.tsx` 保持通用包装，并用 AI 面板作为首个调用方验证 |

## Implementation Steps

### Step 1: 补齐 AI 类型、Radix Select wrapper 与原生 AI service

**Files:** `src/types/ai.ts`, `src/components/ui/select.tsx`, `src/services/aiService.ts`
**Verification:** `npm test -- --run`

Status: ✅ Completed
Evidence:
- `src/types/ai.ts` 新增 Provider / Model / command message / AIContext / store 状态类型
- `src/components/ui/select.tsx` 落地可复用的 Radix Select wrapper
- `src/services/aiService.ts` 统一封装 `ai_list_providers` / `ai_list_models` / `ai_chat_stream` / `ai_cancel_stream`
- `npm test -- --run src/stores/__tests__/aiStore.test.ts` 通过
Deviations:
- 无

### Step 2: 实现上下文构建、流式 Markdown 渲染与 AI store

**Files:** `src/components/ai/ContextBuilder.ts`, `src/components/ai/StreamRenderer.tsx`, `src/stores/aiStore.ts`
**Verification:** `npm test -- --run`

Status: ✅ Completed
Evidence:
- `src/components/ai/ContextBuilder.ts` 复用 `extractOutlineHeadings` 构建系统 prompt
- `src/components/ai/StreamRenderer.tsx` 复用 `markdown-it` 并在流式阶段补全未闭合代码块
- `src/stores/aiStore.ts` 接入原生 provider/model 真源、流式 token、取消语义与清空历史
- `npm test -- --run src/components/ai/__tests__/ContextBuilder.test.ts src/components/ai/__tests__/StreamRenderer.test.tsx src/stores/__tests__/aiStore.test.ts` 通过
Deviations:
- 上下文窗口当前按字符半径实现，token 预算仍留给后续原生层统一演进

### Step 3: 实现 ProviderSelect / ChatPanel 并接入 App shell

**Files:** `src/components/ai/ProviderSelect.tsx`, `src/components/ai/ChatPanel.tsx`, `src/App.tsx`
**Verification:** `npm test -- --run`; `npm run build`

Status: ✅ Completed
Evidence:
- `src/components/ai/ProviderSelect.tsx` 基于原生 provider/model 目录渲染双 Select
- `src/components/ai/ChatPanel.tsx` 提供消息列表、流式状态、停止生成与清空历史
- `src/App.tsx` 用 `ChatPanel` 替换原 `AiPanelPlaceholder`
- `npm run build` 通过
Deviations:
- 无

### Step 4: 同步控制面并完成整体验证

**Files:** `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`, `docs/PLANS.md`, `docs/exec-plans/completed/2026-04-22-phase8-ai-chat-panel.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`; `npm test -- --run`; `npm run build`

Status: ✅ Completed
Evidence:
- `docs/ARCHITECTURE.md`、`docs/OBSERVABILITY.md` 已同步 AI 面板与前端原生 AI 边界
- `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test -- --run`、`npm run build` 已通过
Deviations:
- `npm run build` 仍保留既有体积告警与 Tailwind `duration-[120ms]` 歧义告警，本次未扩展处理

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | `src/types/ai.ts`、`src/components/ui/select.tsx`、`src/services/aiService.ts` | 前端只经 `aiService` 调 Tauri commands |
| 2 | ✅ | `src/components/ai/ContextBuilder.ts`、`src/components/ai/StreamRenderer.tsx`、`src/stores/aiStore.ts` | system prompt 与流式状态机已接通 |
| 3 | ✅ | `src/components/ai/ProviderSelect.tsx`、`src/components/ai/ChatPanel.tsx`、`src/App.tsx` | 右侧 AI 面板已替换 placeholder |
| 4 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test -- --run`、`npm run build` | 控制面同步完成，计划可归档 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 复用现有 `markdown-it` 与 `extractOutlineHeadings` | 当前仓库已有 Markdown/Outline 能力 | 新引 `react-markdown` 或独立 outline parser | 减少运行时与依赖面，保持一致的 Markdown 解释方式 |
| `aiStore` 从现有 note/editor store 收集上下文，而不是让 `App.tsx` 手工拼装 | 现有 shell 已有当前文档、打开文件、光标位置状态 | 在组件 props 层逐级传递 AI context | 让上下文收集逻辑集中到 AI domain，减少 shell 层胶水代码 |
| 先实现 MVP 字符窗口上下文 | 当前验收只要求上下文感知 system prompt | 前端估算 token 预算 | 避免再次制造前端运行时真源，后续 token 策略留给原生层统一演进 |
| Provider/Model 选择数据仅消费原生命令结果 | Phase 8 已明确原生层是真源 | 前端维护一份运行时模型表 | 避免前端目录与 Rust 模型目录漂移 |

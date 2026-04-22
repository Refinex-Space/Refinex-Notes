# Execution Plan: Phase 8 AI Chat Panel

Created: 2026-04-22
Status: Active
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

- [ ] AC-1: 右侧 AI 面板可替换当前 placeholder，并提供 Provider/Model 选择、消息列表、输入区和流式中止按钮
- [ ] AC-2: Provider/Model 列表全部来自原生层返回结果，前端不维护独立运行时硬编码真源
- [ ] AC-3: `sendMessage()` 会构建包含当前文档与工作区信息的 system prompt，并通过 Tauri Channel 实时接收流式 token
- [ ] AC-4: AI 输出能稳定渲染 Markdown，流式半截代码块不会导致 UI 报错或明显闪烁
- [ ] AC-5: `cancelStream()` 可以中止当前生成；`clearHistory()` 可以清空消息列表
- [ ] AC-6: Vitest、Rust 测试与生产构建保持通过

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

Status: ⬜ Not started
Evidence:
Deviations:

### Step 2: 实现上下文构建、流式 Markdown 渲染与 AI store

**Files:** `src/components/ai/ContextBuilder.ts`, `src/components/ai/StreamRenderer.tsx`, `src/stores/aiStore.ts`
**Verification:** `npm test -- --run`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 实现 ProviderSelect / ChatPanel 并接入 App shell

**Files:** `src/components/ai/ProviderSelect.tsx`, `src/components/ai/ChatPanel.tsx`, `src/App.tsx`
**Verification:** `npm test -- --run`; `npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: 同步控制面并完成整体验证

**Files:** `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`, `docs/PLANS.md`, `docs/exec-plans/active/2026-04-22-phase8-ai-chat-panel.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`; `npm test -- --run`; `npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ⬜ |  | 待补齐类型、Select wrapper 和 Tauri AI service |
| 2 | ⬜ |  | 待补齐 context builder、stream renderer 和 store |
| 3 | ⬜ |  | 待实现 AI 面板并接入 App shell |
| 4 | ⬜ |  | 待同步控制面并完成整体验证 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 复用现有 `markdown-it` 与 `extractOutlineHeadings` | 当前仓库已有 Markdown/Outline 能力 | 新引 `react-markdown` 或独立 outline parser | 减少运行时与依赖面，保持一致的 Markdown 解释方式 |
| `aiStore` 从现有 note/editor store 收集上下文，而不是让 `App.tsx` 手工拼装 | 现有 shell 已有当前文档、打开文件、光标位置状态 | 在组件 props 层逐级传递 AI context | 让上下文收集逻辑集中到 AI domain，减少 shell 层胶水代码 |
| 先实现 MVP 字符窗口上下文 | 当前验收只要求上下文感知 system prompt | 前端估算 token 预算 | 避免再次制造前端运行时真源，后续 token 策略留给原生层统一演进 |

# Execution Plan: AI Chat Attachments Multimodal

Created: 2026-04-22
Status: Active
Author: agent

## Objective

为 AI 右侧面板增加附件上传能力：图片附件走真正多模态输入，文本类附件作为附加上下文参与对话。

## Scope

**In scope:**
- `src/types/ai.ts`
- `src/services/aiService.ts`
- `src/stores/aiStore.ts`
- `src/stores/__tests__/aiStore.test.ts`
- `src/components/ai/ChatPanel.tsx`
- `src/components/ai/__tests__/ChatPanel.test.tsx`
- `src-tauri/src/ai/mod.rs`
- `src-tauri/src/ai/providers.rs`
- `src-tauri/src/commands/ai.rs`

**Out of scope:**
- PDF / Office / 音频附件解析与上传
- 云端文件对象存储、服务端附件持久化、跨设备同步
- 基于模型精细能力矩阵的附件入口动态禁用

## Constraints

- 保持现有前后端分层：前端负责文件选择与本地预处理，provider 序列化逻辑留在 `src-tauri/src/ai/`。
- 不把附件读取副作用塞进 UI 组件；组件只维护交互与预览状态。
- 复用现有 `ai_chat_stream` 和 conversation store，不为附件单独引入第二套聊天协议。
- 保持当前多会话、停止生成、`@` 引用文档、当前文档上下文能力继续工作。

## Acceptance Criteria

- [ ] AC-1: AI 输入区支持选择并展示待发送附件，可移除附件后再发送。
- [ ] AC-2: 图片附件会作为真实多模态消息内容传给 OpenAI-compatible / Anthropic provider，而不是被降级成纯文本说明。
- [ ] AC-3: 文本类附件内容会作为附加上下文参与对话，且不会破坏现有当前文档 / `@` 引用文档链路。
- [ ] AC-4: 用户消息在会话历史里能展示已发送附件的基本信息，刷新后历史仍可恢复。
- [ ] AC-5: `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test`、`npm run build` 全部通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| 多模态消息结构与现有字符串消息混用导致 provider 序列化出错 | Medium | 引入显式附件类型并在 provider 层集中映射 |
| 图片 base64 过大导致请求体膨胀 | Medium | 在前端限制附件数量与单文件大小，只支持 MVP 范围 |
| 文本附件与现有 referencedDocuments 重复注入造成提示词噪音 | Medium | 将上传文本附件统一纳入上下文构建层，由 store 去重 |
| 会话持久化后附件体积过大 | Medium | 仅持久化实际已发送消息所需附件数据，限制尺寸并避免无限制附件堆积 |

## Implementation Steps

### Step 1: 扩展 AI 消息与 store 类型以承载附件

**Files:** `src/types/ai.ts`, `src/stores/aiStore.ts`, `src/stores/__tests__/aiStore.test.ts`
**Verification:** `npm test -- --run src/stores/__tests__/aiStore.test.ts`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 2: 接入输入区附件选择、预览与发送流程

**Files:** `src/components/ai/ChatPanel.tsx`, `src/components/ai/__tests__/ChatPanel.test.tsx`
**Verification:** `npm test -- --run src/components/ai/__tests__/ChatPanel.test.tsx`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 将附件映射到 provider 多模态请求体

**Files:** `src/services/aiService.ts`, `src-tauri/src/ai/mod.rs`, `src-tauri/src/ai/providers.rs`, `src-tauri/src/commands/ai.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: 运行全量验证并同步控制面

**Files:** `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`, `docs/PLANS.md`, `docs/exec-plans/active/2026-04-22-ai-chat-attachments-multimodal.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml && npm test && npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ⬜ |  |  |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |
| 4 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| MVP 附件范围为图片 + 文本类文件 | 用户要求“多模态 + 上传附件”，但完整 Notion 级文件系统过大 | 一步支持 PDF/Office/音频；只支持图片 | 这是最小可交付且真正包含多模态的版本 |

## Completion Summary

<!-- Fill in when archiving the plan -->

Completed:
Duration: <N> steps
All acceptance criteria: PASS / FAIL

Summary:

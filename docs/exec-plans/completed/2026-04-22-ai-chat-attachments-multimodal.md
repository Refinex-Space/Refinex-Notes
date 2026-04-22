# Execution Plan: AI Chat Attachments Multimodal

Created: 2026-04-22
Status: Completed
Author: agent

## Objective

为 AI 右侧面板增加附件上传能力：图片附件走真正多模态输入，文本类附件作为附加上下文参与对话。

## Scope

**In scope:**
- `src/types/ai.ts`
- `src/services/aiService.ts`
- `src/services/aiAttachmentService.ts`
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

- [x] AC-1: AI 输入区支持选择并展示待发送附件，可移除附件后再发送。
- [x] AC-2: 图片附件会作为真实多模态消息内容传给 OpenAI-compatible / Anthropic provider，而不是被降级成纯文本说明。
- [x] AC-3: 文本类附件内容会作为附加上下文参与对话，且不会破坏现有当前文档 / `@` 引用文档链路。
- [x] AC-4: 用户消息在会话历史里能展示已发送附件的基本信息，刷新后历史仍可恢复。
- [x] AC-5: `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test`、`npm run build` 全部通过。

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

Status: ✅ Completed
Evidence:
- `src/types/ai.ts` 为 `AIMessage` / `AICommandMessage` 增加 `attachments`，并定义图片/文本附件联合类型。
- `src/stores/aiStore.ts` 让消息持久化、流式请求和多会话切换都携带附件；`src/stores/__tests__/aiStore.test.ts` 新增附件转发断言。
- 验证：`npm test -- --run src/stores/__tests__/aiStore.test.ts src/components/ai/__tests__/ChatPanel.test.tsx`
Deviations:
- 无。

### Step 2: 接入输入区附件选择、预览与发送流程

**Files:** `src/services/aiAttachmentService.ts`, `src/components/ai/ChatPanel.tsx`, `src/components/ai/__tests__/ChatPanel.test.tsx`
**Verification:** `npm test -- --run src/components/ai/__tests__/ChatPanel.test.tsx`

Status: ✅ Completed
Evidence:
- 新增 `src/services/aiAttachmentService.ts`，将浏览器 `File` 归一化为图片 / 文本附件，并限制数量与大小。
- `src/components/ai/ChatPanel.tsx` 增加附件选择、预览、移除、发送和会话历史展示；`src/components/ai/__tests__/ChatPanel.test.tsx` 新增上传并发送文本附件的回归测试。
- 验证：`npm test -- --run src/stores/__tests__/aiStore.test.ts src/components/ai/__tests__/ChatPanel.test.tsx`
Deviations:
- 原计划没有单列附件 service，实施时新增 `src/services/aiAttachmentService.ts` 以保持 UI 组件薄。

### Step 3: 将附件映射到 provider 多模态请求体

**Files:** `src/services/aiService.ts`, `src-tauri/src/ai/mod.rs`, `src-tauri/src/ai/providers.rs`, `src-tauri/src/commands/ai.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ✅ Completed
Evidence:
- `src-tauri/src/ai/mod.rs` 为 `AIMessage` 增加附件字段，并定义 `AIAttachment`。
- `src-tauri/src/ai/providers.rs` 将图片附件序列化为 OpenAI-compatible `image_url` / Anthropic `image` block，将文本附件序列化为附加 `text` block。
- Rust 新增 `openai_provider_serializes_image_and_text_attachments` 与 `anthropic_provider_serializes_image_and_text_attachments` 两个用例。
- 验证：`cargo test --manifest-path src-tauri/Cargo.toml ai::providers::tests`
Deviations:
- `src/services/aiService.ts` 与 `src-tauri/src/commands/ai.rs` 无需改动；两者已经是对消息结构的透明透传层。

### Step 4: 运行全量验证并同步控制面

**Files:** `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`, `docs/PLANS.md`, `docs/exec-plans/active/2026-04-22-ai-chat-attachments-multimodal.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml && npm test && npm run build`

Status: ✅ Completed
Evidence:
- `docs/ARCHITECTURE.md` 已补充 AI 面板附件上传与 provider 多模态序列化说明。
- 全量验证通过：`cargo test --manifest-path src-tauri/Cargo.toml`、`npm test`、`npm run build`。
Deviations:
- `docs/OBSERVABILITY.md` 仅更新测试覆盖描述，不需要新增命令。

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | `npm test -- --run src/stores/__tests__/aiStore.test.ts src/components/ai/__tests__/ChatPanel.test.tsx` | 附件类型与 store 透传完成 |
| 2 | ✅ | `npm test -- --run src/stores/__tests__/aiStore.test.ts src/components/ai/__tests__/ChatPanel.test.tsx` | 输入区附件选择、预览、移除与发送完成 |
| 3 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml ai::providers::tests` | OpenAI-compatible / Anthropic 多模态映射完成 |
| 4 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml` / `npm test` / `npm run build` | 控制面已同步并完成全量验证 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| MVP 附件范围为图片 + 文本类文件 | 用户要求“多模态 + 上传附件”，但完整 Notion 级文件系统过大 | 一步支持 PDF/Office/音频；只支持图片 | 这是最小可交付且真正包含多模态的版本 |
| 附件读取与归一化下沉到前端 service | `File` 读取需要浏览器 API，但不应塞进 React 组件 | 直接在 `ChatPanel` 中读文件；引入新的 native 文件命令 | 复用浏览器 File API 即可完成 MVP，同时保持 UI 组件薄 |

## Completion Summary

Completed:
Duration: 4 steps
All acceptance criteria: PASS

Summary:
- AI 右侧面板现在支持上传图片和文本类附件；图片以真实多模态内容块发送，文本附件以内联文本块参与对话。
- 附件会显示在输入区待发送预览与用户消息历史中，并随多会话持久化一起保存。
- 现有当前文档上下文、`@` 引用文档、多会话与停止生成链路均保持可用。

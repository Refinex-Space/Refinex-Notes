# Fix Plan: AI Chat Attachment Message And Args

Created: 2026-04-23
Status: Active
Author: agent

## Bug Brief

- Symptom: 1) 带附件的用户消息把附件渲染在蓝色用户气泡内部，视觉过重；2) 发送附件时 Tauri 命令报错 `invalid args messages for command ai_chat_stream: missing field mime_type`。
- Expected: 1) 附件独立展示在用户消息气泡上方；2) 前端附件对象可被 Rust 命令边界正确反序列化并继续发送到 provider。
- Reproduction: 上传图片附件并发送；观察用户消息区域和运行时错误提示。
- Affected scope: `src/components/ai/ChatPanel.tsx`、`src/components/ai/__tests__/ChatPanel.test.tsx`、`src-tauri/src/ai/mod.rs` 及相关 Rust 测试。
- Severity: Degraded
- Type: Regression
- Assumptions: 这次不改 provider 具体协议，仅修复命令参数反序列化和消息布局。

## Scope

**In scope:**
- `src/components/ai/ChatPanel.tsx`
- `src/components/ai/__tests__/ChatPanel.test.tsx`
- `src-tauri/src/ai/mod.rs`
- `src-tauri/src/ai/providers.rs`
- `docs/PLANS.md`
- `docs/exec-plans/active/2026-04-23-fix-ai-chat-attachment-message-and-args.md`

**Out of scope:**
- 附件大小阈值和上传入口样式
- 其他消息样式体系重构

## Acceptance Criteria

- [ ] AC-1: 带附件的用户消息将附件显示在气泡上方，而不是气泡内部。
- [ ] AC-2: `ai_chat_stream` 能正确接收前端发出的附件对象，不再报 `missing field mime_type`。
- [ ] AC-3: 前端定向测试、Rust AI 相关测试和构建通过。

## Implementation Steps

### Step 1: 修复用户消息附件布局
Status: ⬜ Not started

### Step 2: 修复 Rust 命令边界附件反序列化
Status: ⬜ Not started

### Step 3: 补充回归测试并验证
Status: ⬜ Not started

## Completion Summary

<!-- Fill when archiving -->

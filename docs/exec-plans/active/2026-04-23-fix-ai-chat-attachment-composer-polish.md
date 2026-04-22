# Fix Plan: AI Chat Attachment Composer Polish

Created: 2026-04-23
Status: Active
Author: agent

## Bug Brief

- Symptom: AI 输入框中的附件预览尺寸过大，图片附件占据过多可视空间；附件按钮带边框且位于右侧，与发送区和模型选择的布局语言不一致。
- Expected: 附件预览更紧凑、排列更克制；附件按钮使用 `Paperclip` 图标、无边框，并位于输入框左下角，与右下角模型选择 / 发送形成对位。
- Reproduction: 在 AI 输入框上传图片附件后，观察预览区域尺寸和底部操作区布局。
- Affected scope: `src/components/ai/ChatPanel.tsx`，以及对应 Vitest 回归测试。
- Severity: Cosmetic
- Type: Regression / polish
- Assumptions: 这次只调整输入框内部附件预览与按钮布局，不改附件大小限制和 provider 发送协议。

## Scope

**In scope:**
- `src/components/ai/ChatPanel.tsx`
- `src/components/ai/__tests__/ChatPanel.test.tsx`
- `docs/PLANS.md`
- `docs/exec-plans/active/2026-04-23-fix-ai-chat-attachment-composer-polish.md`

**Out of scope:**
- 附件上传能力协议、大小阈值、provider 多模态序列化
- 其他 AI 面板消息样式

## Acceptance Criteria

- [ ] AC-1: 输入区附件预览显著缩小，图片与文本附件排列更紧凑，不再压迫正文输入区。
- [ ] AC-2: 附件按钮改为 `Paperclip` 图标、无边框，并移动到输入框左下角。
- [ ] AC-3: 模型选择和发送按钮保持右下角，输入区底部左右分区清晰。
- [ ] AC-4: `npm test -- --run src/components/ai/__tests__/ChatPanel.test.tsx` 通过。

## Implementation Steps

### Step 1: 收口附件预览尺寸与排列
Status: ⬜ Not started

### Step 2: 重排输入区底部操作区并替换附件按钮样式
Status: ⬜ Not started

### Step 3: 补充回归测试并验证
Status: ⬜ Not started

## Completion Summary

<!-- Fill when archiving -->

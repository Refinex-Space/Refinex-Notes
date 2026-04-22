# Execution Plan: AI Chat Current Document Chip

Created: 2026-04-22
Completed: 2026-04-22
Status: Completed
Author: agent

## Objective

在 AI 对话输入框内部展示当前活跃文档的上下文 chip，并允许用户移除它；移除后，这个当前文档不再作为 AI 可见上下文参与系统提示构建。

## Scope

**In scope:**
- `src/components/ai/ChatPanel.tsx`
- `src/stores/aiStore.ts`
- `src/types/ai.ts`
- AI 面板 / AI store 相关测试
- `docs/PLANS.md`

**Out of scope:**
- AI 模型选择器样式改造
- 编辑器侧 AI 插入命令上下文逻辑
- 非当前文档的附加上下文管理 UI

## Constraints

- UI 上下文 chip 必须与真实 AI 上下文开关一致，不能只做视觉假象
- 当前文档切换时，新文档默认重新纳入上下文
- 不新增全局上下文管理 store，优先复用现有 `aiStore` / `noteStore`

## Acceptance Criteria

- [x] AC-1: 输入框内左上角在存在当前活跃文档时显示上下文 chip
- [x] AC-2: hover 时出现关闭 `x`，点击后 chip 消失，且发送消息时当前文档不再进入系统提示
- [x] AC-3: 当前活跃文档切换后，新的文档 chip 会实时更新并默认重新纳入上下文
- [x] AC-4: `npm test -- --run` 与 `npm run build` 通过

## Implementation Steps

### Step 1: 为 AI store 增加当前文档上下文开关

**Files:** `src/stores/aiStore.ts`, `src/types/ai.ts`, 相关 store 测试
**Verification:** `npm test -- --run src/stores/__tests__/aiStore.test.ts`

Status: ✅ Done
Evidence:
- `src/stores/aiStore.ts` 为 `sendMessage` / `streamPrompt` 增加 `includeCurrentDocument` 开关
- 当前文档被移除时，系统提示不再携带其内容、路径以及 `openFiles` / `recentFiles` 中的当前文档路径
- `src/stores/__tests__/aiStore.test.ts` 已覆盖“排除当前文档上下文”场景

### Step 2: 在 ChatPanel 输入框内渲染可移除上下文 chip

**Files:** `src/components/ai/ChatPanel.tsx`, 相关组件测试
**Verification:** `npm test -- --run src/components/ai/__tests__/ChatPanel.test.tsx`

Status: ✅ Done
Evidence:
- `src/components/ai/ChatPanel.tsx` 在输入区左上角渲染当前文档 chip，并在 hover/focus 时暴露移除按钮
- 当前文档切换时，chip 会随 `currentDocument.path` 实时更新并默认重新纳入上下文
- `src/components/ai/__tests__/ChatPanel.test.tsx` 已覆盖 chip 渲染与移除交互

### Step 3: 全量验证并归档计划

**Files:** `docs/PLANS.md`, `docs/exec-plans/active/2026-04-22-ai-chat-current-document-chip.md`
**Verification:** `npm test -- --run`; `npm run build`

Status: ✅ Done
Evidence:
- `python3 scripts/check_harness.py` 通过
- `npm test -- --run` 通过（37 files, 175 tests）
- `npm run build` 通过
- `docs/PLANS.md` 已将本计划从 Active 移至 Completed

## Completion Summary

Completed: 2026-04-22
All acceptance criteria: PASS

Summary:
- AI 输入框左上角现在会实时显示当前活跃文档的上下文 chip，交互形式接近 Notion AI
- 用户移除 chip 后，当前文档会从真实系统提示中剔除，而不是只做 UI 隐藏
- 当前文档切换后，新的文档会自动重新作为 AI 可见上下文纳入输入区

# Execution Plan: AI Chat Document Mentions

Created: 2026-04-22
Completed: 2026-04-22
Status: Completed
Author: agent

## Objective

在 AI 对话输入区支持 `@` 触发的项目文档引用菜单，允许用户通过文件名模糊匹配选择补充上下文文档，并在发送消息时把这些附加文档真实注入 AI 系统提示。

## Scope

**In scope:**
- `src/components/ai/ChatPanel.tsx`
- `src/components/ai/__tests__/ChatPanel.test.tsx`
- 新增 AI 文档 mention 纯函数或 UI 辅助模块
- `src/stores/aiStore.ts`
- `src/stores/__tests__/aiStore.test.ts`
- `src/components/ai/ContextBuilder.ts`
- `src/types/ai.ts`
- `docs/PLANS.md`

**Out of scope:**
- 把 AI 输入框整体改造成富文本编辑器
- 原生搜索索引或 Rust `search_files` 算法改造
- 非文档资源类型的 `@` 引用能力
- 设置页或 Provider 选择器改造

## Constraints

- 复用现有 `noteStore`、`searchService`、`Command`、`Popover` 组件与状态边界
- UI 上被附加的文档必须和发送链路中的真实 AI 上下文保持一致
- 保留现有“当前文档”上下文行为，附加文档作为额外知识文档参与对话
- 键盘主流程必须顺滑：`@` 触发、上下选择、回车确认、Esc 关闭
- 默认结果先展示 5 个，剩余结果通过折叠项展开

## Acceptance Criteria

- [x] AC-1: 输入框中输入 `@` 后会打开文档联想菜单，默认优先展示当前页面，其余结果按文件名模糊匹配排序
- [x] AC-2: 菜单默认显示前 5 个匹配文档，剩余结果以“其余 N 个结果”折叠；可通过键盘或鼠标展开并继续选择
- [x] AC-3: 选中文档后，输入区会显示可点击的 `@文档` 附加上下文 chip；点击 chip 可打开文档，点击移除按钮会把该文档从上下文中移除
- [x] AC-4: 发送消息时，附加文档会以补充上下文的形式进入 AI 系统提示；未附加的文档不会被误注入
- [x] AC-5: `npm test -- --run`、`cargo test --manifest-path src-tauri/Cargo.toml`、`npm run build` 通过

## Implementation Steps

### Step 1: 扩展 AI 上下文模型，支持附加文档

**Files:** `src/types/ai.ts`, `src/components/ai/ContextBuilder.ts`, `src/stores/aiStore.ts`, `src/stores/__tests__/aiStore.test.ts`
**Verification:** `npm test -- --run src/stores/__tests__/aiStore.test.ts`

Status: ✅ Done
Evidence:
- `src/stores/aiStore.ts` 已支持 `attachedDocumentPaths`，并在发送时按需读取未打开文档内容
- `src/components/ai/ContextBuilder.ts` 已把附加文档写入系统提示中的“附加参考文档”分区
- `npm test -- --run src/stores/__tests__/aiStore.test.ts` 通过

### Step 2: 实现 `@` 文档联想与结果折叠逻辑

**Files:** 新增 AI mention 辅助模块、相关单测
**Verification:** 新增 mention helper 测试

Status: ✅ Done
Evidence:
- 新增 `src/components/ai/documentMentions.ts`，包含 `@` 触发区间识别、折叠分组、本地兜底搜索和结果扁平化逻辑
- 新增 `src/components/ai/__tests__/documentMentions.test.ts`
- `npm test -- --run src/components/ai/__tests__/documentMentions.test.ts` 通过

### Step 3: 将 `@` 菜单和附加文档 chip 集成到 ChatPanel

**Files:** `src/components/ai/ChatPanel.tsx`, `src/components/ai/__tests__/ChatPanel.test.tsx`
**Verification:** `npm test -- --run src/components/ai/__tests__/ChatPanel.test.tsx`

Status: ✅ Done
Evidence:
- `src/components/ai/ChatPanel.tsx` 已集成 `@` 联想菜单、键盘选择、附加文档 chip、点击打开文档和发送链路透传
- `src/components/ai/__tests__/ChatPanel.test.tsx` 已覆盖 mention 菜单选择、附加 chip 打开文档和发送附加上下文
- `npm test -- --run src/components/ai/__tests__/ChatPanel.test.tsx` 通过

### Step 4: 全量验证并归档计划

**Files:** `docs/PLANS.md`, `docs/exec-plans/active/2026-04-22-ai-chat-document-mentions.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`; `npm test -- --run`; `npm run build`

Status: ✅ Done
Evidence:
- `cargo test --manifest-path src-tauri/Cargo.toml` 通过（74 Rust tests）
- `npm test -- --run` 通过（38 files, 185 tests）
- `npm run build` 通过
- `docs/ARCHITECTURE.md` 与 `docs/OBSERVABILITY.md` 已同步 AI mention 能力与最新测试基线

## Risks

- `textarea` 不支持真正的富文本内联 mention，如果 UI 过于接近 Notion 富文本形态，容易把实现复杂度拉高
- 搜索结果若完全依赖异步原生搜索，需要处理输入节流、竞态与浮层焦点一致性
- 附加文档上下文如果直接注入全文，可能导致系统提示长度膨胀，需要控制摘要粒度

## Open Assumptions

- 当前版本采用 `@` 触发菜单 + 选中后生成附加上下文 chip 的形态，而不是重写成富文本 mention 输入框
- 文档搜索只要求文件名/标题模糊联想，足以支撑首版 UX
- 点击附加文档 chip 视为“打开对应文档”，满足用户对 `@xxx` 可点击跳转的预期

## Completion Summary

Completed: 2026-04-22
Duration: 4 steps
All acceptance criteria: PASS

Summary:
- AI 对话输入区现在支持 `@` 触发的项目文档联想菜单，默认突出当前页面，并支持前 5 项结果展示与“其余 N 个结果”展开
- 选中的文档会以可点击的 `@文档` chip 附着在输入区，点击可打开文档，移除则会同步从真实 AI 上下文中剔除
- 发送链路已支持按需加载未打开文档内容，并将附加文档独立写入系统提示中的“附加参考文档”分区

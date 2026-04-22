# Execution Plan: AI Chat Panel Layout Polish

Created: 2026-04-22
Completed: 2026-04-22
Status: Completed
Author: agent

## Objective

重构 AI 对话面板顶部模型选择与底部输入操作区，使模型切换更贴近输入动作、发送按钮更紧凑、清空历史移到顶部右侧，同时保持现有消息流与 store 行为不变。

## Scope

**In scope:**
- `src/components/ai/ChatPanel.tsx`
- `src/components/ai/ProviderSelect.tsx`
- `src/components/ai/__tests__/ProviderSelect.test.tsx`
- `src/components/ai/__tests__/ChatPanel.test.tsx`
- `docs/PLANS.md`

**Out of scope:**
- `src/stores/aiStore.ts` 状态模型改造
- AI 消息气泡与流式渲染逻辑重写
- 设置页 AI Provider 管理界面调整

## Constraints

- 复用现有 `aiStore` 的 provider / model 选择能力，不新增并行状态源
- 复用现有 Radix `Popover` / `Select` / UI wrapper，不额外引入组件库
- 保持现有 AI 面板桌面端视觉语言，避免过度装饰
- 代码注释使用中文，且只在必要处添加

## Acceptance Criteria

- [x] AC-1: 发送按钮移除“发送”文字，仅保留图标按钮，并保持禁用/发送中的行为语义
- [x] AC-2: 当前模型切换入口移动到输入框右下发送按钮左侧，展示 provider 图标 + 当前模型名，点击后以上弹浮层打开
- [x] AC-3: 模型浮层按 provider 分组展示模型，支持切换 provider / model，且不再展示旧的“当前模型 DeepSeek / deepseek-reasoner”块
- [x] AC-4: “清空历史”移动到 AI 面板顶部右上角，底部输入区不再保留该按钮
- [x] AC-5: `npm test -- --run` 与 `npm run build` 通过

## Implementation Steps

### Step 1: 重构模型选择入口与浮层

**Files:** `src/components/ai/ProviderSelect.tsx`, `src/components/ai/__tests__/ProviderSelect.test.tsx`
**Verification:** `npm test -- --run src/components/ai/__tests__/ProviderSelect.test.tsx`

Status: ✅ Done
Evidence:
- `ProviderSelect` 已从顶部双下拉改为输入区单触发器 + 上弹 `Popover`
- 浮层按 provider 分组展示模型，当前项显示 provider 图标、模型名与选中态
- `src/components/ai/__tests__/ProviderSelect.test.tsx` 已覆盖单触发器与分组浮层渲染

### Step 2: 调整 ChatPanel 顶部与输入区布局

**Files:** `src/components/ai/ChatPanel.tsx`, `src/components/ai/__tests__/ChatPanel.test.tsx`
**Verification:** `npm test -- --run src/components/ai/__tests__/ChatPanel.test.tsx`

Status: ✅ Done
Evidence:
- 顶部区域只保留右上角“清空历史”操作
- 输入区右下改为“模型触发器 + 发送图标按钮”，发送按钮不再显示文字
- 新增 `ChatPanel` 测试，锁住“无发送文案 / 无旧当前模型块 / 顶部清空历史存在”

### Step 3: 全量前端验证并归档计划

**Files:** `docs/PLANS.md`, `docs/exec-plans/completed/2026-04-22-ai-chat-panel-layout-polish.md`
**Verification:** `npm test -- --run`; `npm run build`

Status: ✅ Done
Evidence:
- `npm test -- --run` 通过（37 files, 172 tests）
- `npm run build` 通过
- `docs/PLANS.md` 已将本计划从 Active 归档到 Completed

## Risks

- `ProviderSelect` 从双下拉改为单入口浮层后，需确保键盘可达性与禁用态不回退
- provider/model 联动仍依赖 `selectProvider` 异步加载模型，切换时要避免空白态闪烁过重
- 输入区按钮重排后要兼顾窄宽度下的可点击性

## Open Assumptions

- 当前 AI 面板主要面向桌面端使用，本次按桌面布局优先优化，同时保持窄宽度下不溢出
- provider 分组顺序沿用 `aiStore.providers` 当前顺序，不新增自定义排序规则

## Completion Summary

Completed: 2026-04-22
All acceptance criteria: PASS

Summary:
- AI 对话面板顶部只保留清空历史，模型切换移动到输入区发送按钮左侧
- 模型选择改为更轻量的上弹浮层，按 provider 分组展示，避免旧的双下拉和当前模型摘要块
- 新增 AI 面板布局测试，验证图标发送按钮与新模型切换入口结构

# Execution Plan: Fix AI Panel Width And Drag Permission

Created: 2026-04-22
Completed: 2026-04-22
Status: Completed
Author: agent

## Objective

修复 AI 面板回归问题：补齐 Tauri 标题栏拖拽权限、调整模型浮层图标层级、抬高右侧 AI 面板最小宽度以避免发送区溢出，并将当前模型触发器改为无边框 hover 背景样式。

## Scope

**In scope:**
- `src-tauri/capabilities/default.json`
- `src/components/layout/AppLayout.tsx`
- `src/components/layout/__tests__/AppLayout.test.tsx`
- `src/components/ai/ProviderSelect.tsx`
- 必要的 AI 面板相关前端测试
- `docs/PLANS.md`

**Out of scope:**
- AI store / 消息流逻辑改造
- 标题栏视觉重做
- 设置页或其他非 AI 面板样式调整

## Constraints

- 仅补齐 `start_dragging` 所需最小 capability，不扩权限范围
- 复用现有 `Popover` 与 AI 面板结构，不引入新组件库
- 右侧面板宽度约束需要同时兼容 Git 与 AI 面板，不破坏现有拖拽逻辑

## Acceptance Criteria

- [x] AC-1: 标题栏拖拽不再触发 `window.start_dragging not allowed`
- [x] AC-2: 模型浮层不再出现比供应商标题更抢眼的模型图标层级
- [x] AC-3: 右侧 AI 面板在最小可拖拽宽度下仍能完整显示模型触发器与发送按钮
- [x] AC-4: 当前模型触发器默认无边框，仅 hover 时通过圆角背景展示交互反馈
- [x] AC-5: `npm test -- --run` 与 `npm run build` 通过

## Implementation Steps

### Step 1: 修复 Tauri 拖拽权限与右侧面板最小宽度

**Files:** `src-tauri/capabilities/default.json`, `src/components/layout/AppLayout.tsx`, `src/components/layout/__tests__/AppLayout.test.tsx`
**Verification:** `npm test -- --run src/components/layout/__tests__/AppLayout.test.tsx`

Status: ✅ Done
Evidence:
- 参考 Tauri v2 文档确认 `start_dragging` 需要在 capability 中显式允许 `core:window:allow-start-dragging`
- `src-tauri/capabilities/default.json` 已补齐该权限
- `MIN_RIGHT_PANEL_WIDTH` 提升到 `360`，并新增测试锁住 AI 面板打开后的最小宽度 clamp

### Step 2: 收敛 AI 模型触发器与浮层样式

**Files:** `src/components/ai/ProviderSelect.tsx`, `src/components/ai/ChatPanel.tsx`, 相关 AI 面板测试
**Verification:** `npm test -- --run src/components/ai/__tests__/ProviderSelect.test.tsx src/components/ai/__tests__/ChatPanel.test.tsx`

Status: ✅ Done
Evidence:
- 当前模型触发器去掉默认边框与阴影，改为 hover / open 态圆角背景反馈
- 模型浮层仅在 provider 标题展示图标，模型行不再重复渲染图标
- 输入区底部操作区改为可换行收口，防止极窄宽度下按钮挤出

### Step 3: 全量前端验证并归档计划

**Files:** `docs/PLANS.md`, `docs/exec-plans/completed/2026-04-22-fix-ai-panel-width-and-drag-permission.md`
**Verification:** `npm test -- --run`; `npm run build`

Status: ✅ Done
Evidence:
- `npm test -- --run` 通过（37 files, 173 tests）
- `npm run build` 通过
- `docs/PLANS.md` 已将本计划归档到 Completed

## Completion Summary

Completed: 2026-04-22
All acceptance criteria: PASS

Summary:
- 修复了 Tauri 标题栏拖拽 capability 缺失导致的 `start_dragging not allowed` 控制台错误
- 优化了 AI 模型浮层的图标层级和当前模型触发器交互，去掉多余边框
- 提高右侧面板最小宽度并补了布局约束测试，避免 AI 输入区在窄宽度下溢出

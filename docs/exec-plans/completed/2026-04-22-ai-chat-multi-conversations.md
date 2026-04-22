# Execution Plan: AI Chat Multi Conversations

Created: 2026-04-22
Status: Active
Author: agent

## Objective

将 AI 右侧面板从单一消息流升级为支持多会话切换、创建、重命名与删除的本地持久化会话系统。

## Scope

**In scope:**
- `src/types/ai.ts`
- `src/stores/aiStore.ts`
- `src/stores/__tests__/aiStore.test.ts`
- `src/components/ai/ChatPanel.tsx`
- `src/components/ai/__tests__/ChatPanel.test.tsx`

**Out of scope:**
- 云端会话同步或跨设备同步
- 会话图标自定义、分享能力、服务端会话检索

## Constraints

- 遵守 `AGENTS.md` / `src/AGENTS.md` 的既有分层：状态与持久化留在 `src/stores/`，UI 交互留在 `src/components/ai/`。
- 不把文件读取、原生调用或本地持久化副作用塞进 React 组件。
- 复用现有 AI 发送 / 流式链路，避免为了多会话重写 `aiService` 或 native AI command seam。
- 保持 `npm test`、`cargo test --manifest-path src-tauri/Cargo.toml`、`npm run build` 基线不回退。

## Acceptance Criteria

- [x] AC-1: 顶部区域支持展示当前会话标题，并可打开历史会话列表切换到任一已有会话继续聊天。
- [x] AC-2: 顶部右侧提供新建会话入口；新建后生成独立会话，当前输入与后续消息只写入该会话。
- [x] AC-3: 顶部右侧 `...` 菜单支持重命名当前会话与删除当前会话；删除当前会话后界面稳定落到剩余会话或自动新建的空会话。
- [x] AC-4: 多会话列表与当前选中会话可在本地持久化，刷新/重建 store 后仍能恢复。
- [x] AC-5: 现有 AI 发送、流式追加、取消生成、文档 mention 上下文能力在多会话模式下继续工作。

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| 流式响应写入了错误会话 | Medium | 在 store 中把活跃请求与当前会话 ID 绑定，token 只追加到发起流的会话 |
| 持久化引入 hydration 抖动 | Medium | 使用 Zustand `persist` 的 `partialize`，仅持久化会话数据与当前会话 ID，不持久化临时流状态 |
| 删除当前会话导致 UI 空引用 | Medium | 在 store 层统一保证至少保留一个可选中的会话 |
| 会话标题策略过早复杂化 | Low | 第一版只用首条用户消息 / 默认标题生成标题，不做 AI 自动摘要命名 |

## Implementation Steps

### Step 1: 扩展 AI store 为多会话状态模型

**Files:** `src/types/ai.ts`, `src/stores/aiStore.ts`, `src/stores/__tests__/aiStore.test.ts`
**Verification:** `npm test -- --run src/stores/__tests__/aiStore.test.ts`

Status: ✅ Done
Evidence: `npm test -- --run src/stores/__tests__/aiStore.test.ts` → 1 file, 7 tests passed
Deviations:

### Step 2: 接入顶部会话切换与新建会话 UI

**Files:** `src/components/ai/ChatPanel.tsx`, `src/components/ai/__tests__/ChatPanel.test.tsx`
**Verification:** `npm test -- --run src/components/ai/__tests__/ChatPanel.test.tsx`

Status: ✅ Done
Evidence: `npm test -- --run src/components/ai/__tests__/ChatPanel.test.tsx` → 1 file, 5 tests passed
Deviations: 与 Step 3 合并为一个顶部交互原子提交，因为会话切换器、更多菜单与相关回归测试共享同一 header 结构

### Step 3: 接入重命名与删除当前会话交互

**Files:** `src/components/ai/ChatPanel.tsx`, `src/stores/aiStore.ts`, `src/components/ai/__tests__/ChatPanel.test.tsx`, `src/stores/__tests__/aiStore.test.ts`
**Verification:** `npm test -- --run src/stores/__tests__/aiStore.test.ts src/components/ai/__tests__/ChatPanel.test.tsx`

Status: ✅ Done
Evidence: `npm test -- --run src/stores/__tests__/aiStore.test.ts src/components/ai/__tests__/ChatPanel.test.tsx` → 2 files, 12 tests passed
Deviations: 与 Step 2 合并实现并共用一条 UI commit，保持会话 header 交互为一个可回滚单元

### Step 4: 运行全量验证并完成控制面归档

**Files:** `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`, `docs/PLANS.md`, `docs/exec-plans/active/2026-04-22-ai-chat-multi-conversations.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml && npm test && npm run build`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml` → 74 passed; `npm test` → 38 files / 188 tests passed; `npm run build` → passed
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | `npm test -- --run src/stores/__tests__/aiStore.test.ts` | 多会话状态、当前会话切换、重命名、删除与本地持久化已落到 store |
| 2 | ✅ | `npm test -- --run src/components/ai/__tests__/ChatPanel.test.tsx` | 顶部会话切换、新建会话与当前会话标题展示已接入 |
| 3 | ✅ | `npm test -- --run src/stores/__tests__/aiStore.test.ts src/components/ai/__tests__/ChatPanel.test.tsx` | 当前会话重命名、删除与删除后的回退逻辑已接入 |
| 4 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml && npm test && npm run build` | 架构文档与观测文档已同步到多会话 AI 面板现实 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 使用 Zustand `persist` 做本地会话持久化 | 需要在不引入原生新命令的前提下保留历史会话 | 手写 `localStorage` 副作用、改 native settings schema | `persist` 与现有 store 架构最贴合，改动最小 |
| 将 Step 2 / Step 3 合并为同一原子 UI 变更 | 顶部会话切换器与更多菜单共享 `ChatPanel` 顶部结构和同一组交互测试 | 按文件再切碎提交 | 合并后更易回滚，也避免 header 层出现半完成状态 |

## Completion Summary

<!-- Fill in when archiving the plan -->

Completed: 2026-04-22
Duration: 4 steps
All acceptance criteria: PASS

Summary: 为 AI 右侧面板引入了本地持久化的多会话系统。状态层从单一 `messages` 数组升级为 `conversations + activeConversationId`，并通过 Zustand `persist` 保存历史会话与当前选中项；界面顶部改为会话切换器、新建会话按钮和 `...` 菜单，支持重命名与删除当前会话；原有 AI 流式输出、停止生成、当前文档上下文与 `@` 引用文档能力继续工作。控制面文档也同步更新为新的运行时形态与验证基线。

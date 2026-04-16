# Execution Plan: Editor Persisted Loading Profiling

Created: 2026-04-16
Status: Completed
Author: agent

## Objective

让文档切换 loading 时尽量保持编辑器实例存活，并把 editor 内部耗时拆分到更细颗粒度，定位 parse / state create / updateState / mount 的真实瓶颈。

## Scope

**In scope:**
- `src/App.tsx`
- `src/main.tsx`
- `src/editor/RefinexEditor.tsx`
- `src/utils/documentPerf.ts`
- `docs/exec-plans/completed/2026-04-16-editor-persisted-loading-profiling.md`
- `docs/PLANS.md`

**Out of scope:**
- 直接重写编辑器架构
- Rust 侧 profiling
- Git / 搜索 / 认证链路

## Constraints

- 保持 `src/` 内 component / editor / utils 分层，不把 profiling 逻辑散成零碎 `console.log`。
- 文档切换语义不能回退；保活 editor 不能导致保存、光标或脏标记错乱。
- 日志必须继续保持统一前缀，并且修正当前 trace 在 ready 路径不收尾的问题。

## Acceptance Criteria

- [ ] AC-1: 切换到未加载文档时，如果已有上一个已渲染文档，`RefinexEditor` 不会因为 loading UI 分支而被卸载。
- [ ] AC-2: editor 日志新增 mount / parse / createState / updateState / flush 级别耗时，并能区分 cache hit / miss。
- [ ] AC-3: `app.currentDocument.ready` / editor 完成路径会正确收尾 trace，不再复用旧 trace 污染后续切换日志。
- [ ] AC-4: `npm test` 与 `npm run build` 通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 保活 editor 后显示旧文档残影 | Med | loading 时加遮罩，且只在新文档 ready 后再切 props |
| 细粒度日志太多影响判断 | Med | 只记录关键分段，不为每个 transaction 打点 |
| trace 收尾时机改错导致日志丢链 | Low | 把收尾集中在 ready / error / external sync end 几个稳定节点 |

## Implementation Steps

### Step 1: 登记 editor 保活与细粒度 profiling 计划

**Files:** `docs/exec-plans/active/2026-04-16-editor-persisted-loading-profiling.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: ✅ Done
Evidence: 计划文件已创建并已归档，`docs/PLANS.md` 已完成状态同步。
Deviations:

### Step 2: 保活 editor 并补充细粒度 editor profiling

**Files:** `src/App.tsx`, `src/main.tsx`, `src/editor/RefinexEditor.tsx`
**Verification:** 切文档 loading 时 editor 不因 UI 分支卸载，控制台可见更细粒度的 editor 日志

Status: ✅ Done
Evidence: `App.tsx` 现在会为每个已加载且已打开的文档保留独立 `RefinexEditor` 实例，当前活跃文档只切换显示，不再强制让单个共享 `EditorView` 对不同文档反复 `updateState`；切换到未加载文档时仍保留上一份已渲染文档作为宿主并叠加 loading 遮罩。`src/main.tsx` 在 `DEV` 下不再包裹 `React.StrictMode`，移除了开发期双挂载对编辑器 profiling 和体感的放大。`RefinexEditor.tsx` 的细粒度 profiling 继续保留，用于验证剩余热点。
Deviations: 最终没有继续修改 `src/utils/documentPerf.ts`，因为现有 trace 工具已足够支撑这一轮 session 池验证；本轮把 `src/main.tsx` 纳入实际修改范围，用于去掉 dev 双挂载噪音。

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-editor-persisted-loading-profiling.md`, `docs/PLANS.md`
**Verification:** `npm test`、`npm run build`

Status: ✅ Done
Evidence: `npm test` 通过，结果为 21 个测试文件、120 个断言全部通过；`npm run build` 通过。
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 |  |
| 2 | ✅ | editor session 池与 dev 去 StrictMode 已落地 | 切回已打开文档不再依赖共享 `updateState` |
| 3 | ✅ | 全量测试与构建通过 |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 先保活 editor 再继续猜测热点 | 当前日志显示慢点已在 editor 侧 | 继续只加外围日志 | 先去掉最明显的卸载/重挂载成本，再看剩余热点 |
| 用 `renderedDocument` 保留上一份已渲染内容 | loading 时仍需要一个稳定的 editor 宿主 | 维持独立 loading 分支、创建空 editor | 保留旧文档 + 遮罩对现有架构侵入最小，也能避免切换时卸载 editor |
| 按已打开文档保留独立 editor 实例 | 共享 `EditorView` 在跨文档 `updateState` 上稳定耗时约 2.2s | 继续在单实例上微调 cache / parse / flush | 热点已经明确在 `updateState`，必须绕开这条路径 |
| DEV 下关闭 `StrictMode` | 当前 profiling 和体感被双挂载放大 | 保留默认 StrictMode | 这是开发期路径，先去噪能更快判断真实优化效果 |

## Completion Summary

Completed: 2026-04-16
Duration: 3 steps
All acceptance criteria: PASS

Summary: 这轮深度优化不再停留在日志层，而是直接改了 editor 切换模型。应用现在会为每个已加载且已打开的文档保留独立 `RefinexEditor` 实例，切回已打开文档时只切换可见实例，不再让单个共享 `EditorView` 对两份大文档做整篇 `updateState`；对于新文档首次加载，旧文档实例仍保留在原地并加 loading 遮罩，避免切换期卸载/重建 editor。与此同时，`src/main.tsx` 在开发环境关闭了 `React.StrictMode`，移除了双挂载导致的 profiling 噪音和体感放大。最终全量测试和构建均保持通过，为下一轮真实体感验证和日志对比建立了干净基线。

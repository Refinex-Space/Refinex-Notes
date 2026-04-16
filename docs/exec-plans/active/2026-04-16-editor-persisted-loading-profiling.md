# Execution Plan: Editor Persisted Loading Profiling

Created: 2026-04-16
Status: Active
Author: agent

## Objective

让文档切换 loading 时尽量保持编辑器实例存活，并把 editor 内部耗时拆分到更细颗粒度，定位 parse / state create / updateState / mount 的真实瓶颈。

## Scope

**In scope:**
- `src/App.tsx`
- `src/editor/RefinexEditor.tsx`
- `src/utils/documentPerf.ts`
- `docs/exec-plans/active/2026-04-16-editor-persisted-loading-profiling.md`
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

Status: 🔄 In progress
Evidence:
Deviations:

### Step 2: 保活 editor 并补充细粒度 editor profiling

**Files:** `src/App.tsx`, `src/editor/RefinexEditor.tsx`, `src/utils/documentPerf.ts`
**Verification:** 切文档 loading 时 editor 不因 UI 分支卸载，控制台可见更细粒度的 editor 日志

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-editor-persisted-loading-profiling.md`, `docs/PLANS.md`
**Verification:** `npm test`、`npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | 🔄 | 计划文件正在创建并登记 |  |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 先保活 editor 再继续猜测热点 | 当前日志显示慢点已在 editor 侧 | 继续只加外围日志 | 先去掉最明显的卸载/重挂载成本，再看剩余热点 |

## Completion Summary

Completed:
Duration: 3 steps
All acceptance criteria: PASS / FAIL

Summary:

# Execution Plan: Document Open Perf Logging

Created: 2026-04-16
Status: Active
Author: agent

## Objective

为文档打开与切换主链路补充可串联的耗时日志，便于基于调试控制台输出定位真实瓶颈。

## Scope

**In scope:**
- `src/utils/`
- `src/services/fileService.ts`
- `src/stores/noteStore.ts`
- `src/App.tsx`
- `src/editor/RefinexEditor.tsx`
- `src/components/sidebar/FileTree.tsx`
- `src/components/editor/TabBar.tsx`

**Out of scope:**
- 直接继续做性能优化
- Rust 原生侧 profiling / tracing 基建
- Git / 搜索 / 认证链路日志

## Constraints

- 日志必须能通过统一前缀和 trace id 串起一次“点击 -> 打开 -> 渲染”的完整路径。
- 不把日志散落成无结构 `console.log`；输出字段要稳定、便于复制回传分析。
- 不改变现有打开/切换语义，只增加观测能力。

## Acceptance Criteria

- [ ] AC-1: 点击打开/切换文档时，前端控制台会输出统一前缀的结构化日志，至少覆盖 `openFile` 开始、读盘开始/结束、store 落盘、编辑器同步完成。
- [ ] AC-2: 日志带有稳定 trace id，可区分同一路径的重复点击与并发打开请求，并能标识 cache hit / pending reuse / fresh read。
- [ ] AC-3: `npm test` 与 `npm run build` 通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 日志过多淹没有效信号 | Med | 统一前缀、只打关键节点、字段结构化 |
| 为了打点改坏打开路径 | Low | 仅做旁路观测，不改核心行为 |
| 打点本身引入明显额外开销 | Low | 只用轻量 `performance.now()` 与 `console.info()` |

## Implementation Steps

### Step 1: 登记性能日志计划

**Files:** `docs/exec-plans/active/2026-04-16-document-open-perf-logging.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: 🔄 In progress
Evidence: 计划文件已创建，`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations:

### Step 2: 为文档打开链路补齐结构化耗时日志

**Files:** `src/utils/*`, `src/services/fileService.ts`, `src/stores/noteStore.ts`, `src/App.tsx`, `src/editor/RefinexEditor.tsx`
**Verification:** 运行时可看到带 trace id 的统一日志，覆盖主链路关键节点

Status: ✅ Done
Evidence: 新增 `src/utils/documentPerf.ts` 统一维护 trace id、source hint 与结构化日志；`noteStore.openFile`、`fileService.readFile`、`App`、`RefinexEditor` 已补齐主链路日志；`FileTree` / `TabBar` / 搜索结果入口会写入 source hint，控制台可区分 `file-tree`、`tab-bar`、`search-result`。
Deviations: 相比初始计划，额外补了 `FileTree.tsx` 与 `TabBar.tsx` 两个入口文件，用于记录打开来源，否则同一 `openFile()` 无法区分目录点击和 Tab 切换。

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-document-open-perf-logging.md`, `docs/PLANS.md`
**Verification:** `npm test`、`npm run build`

Status: ✅ Done
Evidence: `npm test` 通过，结果为 21 个测试文件、120 个断言全部通过；`npm run build` 通过。
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 |  |
| 2 | ✅ | 主链路统一日志与 trace id 已落地 | 额外补了入口 source hint |
| 3 | ✅ | 全量测试与构建通过 |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 优先做前端链路日志而不是原生 tracing | 用户会先回传调试控制台日志 | 直接上 Rust tracing | 先用最低摩擦的观测方式拿到第一批证据 |
| 用 source hint 记录触发入口 | `openFile()` 本身不知道是文件树还是 Tab 切换触发 | 修改 `openFile()` API 向上层传 source | source hint 对现有调用面入侵更小 |

## Completion Summary

Completed: 2026-04-16
Duration: 3 steps
All acceptance criteria: PASS

Summary: 本次工作没有继续猜测性能瓶颈，而是先把文档打开/切换链路的前端耗时观测补齐。现在调试控制台会输出统一前缀 `[perf:doc]` 的结构化日志，覆盖 `noteStore.openFile` 起点、`fileService.readFile` 的 Tauri 调用耗时、`App` 感知到当前文档 ready、以及 `RefinexEditor` 外部同步完成等关键节点；同一次打开会用 trace id 串起来，并通过 source hint 标识触发来源是文件树、Tab 还是搜索结果。这样用户回传控制台日志后，可以直接判断耗时主要落在读盘、store 状态切换，还是编辑器建态。

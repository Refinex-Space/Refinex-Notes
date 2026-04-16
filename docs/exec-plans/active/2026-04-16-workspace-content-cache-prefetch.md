# Execution Plan: Workspace Content Cache Prefetch

Created: 2026-04-16
Status: Active
Author: agent

## Objective

为工作区建立持久化 Markdown 内容缓存与前端预取链路，把未打开文档尽量转成 cache hit，从而把首次点击的体感继续压向 `<50ms`。

## Scope

**In scope:**
- `src-tauri/src/db.rs`
- `src-tauri/src/commands/files.rs`
- `src/types/notes.ts`
- `src/services/fileService.ts`
- `src/stores/noteStore.ts`
- `src/components/sidebar/FileTree.tsx`
- `src/stores/__tests__/workspace-state.test.ts`
- `docs/exec-plans/active/2026-04-16-workspace-content-cache-prefetch.md`
- `docs/PLANS.md`

**Out of scope:**
- 进一步重写 editor 渲染策略
- 非 Markdown 文件的内容缓存
- 搜索 / Git / 认证链路

## Constraints

- 缓存必须遵守 `src/` 与 `src-tauri/` 边界：前端只通过 service / IPC 调原生缓存能力。
- 内容缓存不能破坏正确性；文件修改后必须能根据 mtime 失效并刷新。
- 预取不能把 UI 交互改坏，且不应阻塞点击主路径。

## Acceptance Criteria

- [ ] AC-1: 原生 SQLite 拥有工作区级 Markdown 内容缓存，`read_file` 优先查缓存，未命中时读盘并回填缓存。
- [ ] AC-2: 工作区打开后会后台预热 Markdown 内容缓存；前端文件树 hover 时会触发文档预取。
- [ ] AC-3: `openFile()` 能复用预取结果，使被预取过的文档点击时直接命中内存缓存路径。
- [ ] AC-4: `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test`、`npm run build` 通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 缓存表增长过快 | Med | 仅缓存 Markdown，相同 `(workspace,path)` upsert 覆盖 |
| 文件修改后读到旧内容 | Med | 用文件 mtime 做缓存版本校验 |
| 预取把前端内存顶高 | Med | 只在 hover / 打开路径存入 store，后续再根据数据看是否需要 LRU |

## Implementation Steps

### Step 1: 登记工作区内容缓存与预取计划

**Files:** `docs/exec-plans/active/2026-04-16-workspace-content-cache-prefetch.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: 🔄 In progress
Evidence:
Deviations:

### Step 2: 增加原生工作区内容缓存与后台预热

**Files:** `src-tauri/src/db.rs`, `src-tauri/src/commands/files.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 增加前端文档预取链路

**Files:** `src/types/notes.ts`, `src/services/fileService.ts`, `src/stores/noteStore.ts`, `src/components/sidebar/FileTree.tsx`, `src/stores/__tests__/workspace-state.test.ts`
**Verification:** `npm test`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-workspace-content-cache-prefetch.md`, `docs/PLANS.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test`、`npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | 🔄 | 计划文件正在创建并登记 |  |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |
| 4 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 从“点击后优化”转向“点击前预热” | 当前未缓存文档仍受真实 IO 下限约束 | 继续压榨单次 read_file | 要逼近 `<50ms`，只能把更多文档提前转成 cache hit |

## Completion Summary

Completed:
Duration: 4 steps
All acceptance criteria: PASS / FAIL

Summary:

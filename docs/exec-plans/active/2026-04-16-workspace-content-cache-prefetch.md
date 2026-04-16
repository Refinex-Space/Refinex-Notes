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
Evidence: 计划文件已创建，`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations:

### Step 2: 增加原生工作区内容缓存与后台预热

**Files:** `src-tauri/src/db.rs`, `src-tauri/src/commands/files.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ✅ Done
Evidence: `src-tauri/src/db.rs` 新增 `file_content_cache` 表与读写删除辅助函数；`src-tauri/src/commands/files.rs` 的 `read_file` 现在会根据 `(workspace_path, path, modified)` 优先命中缓存，未命中时读盘并回填缓存；`open_workspace` 还会后台预热工作区内 Markdown 内容缓存。`cargo test --manifest-path src-tauri/Cargo.toml` 通过。
Deviations:

### Step 3: 增加前端文档预取链路

**Files:** `src/types/notes.ts`, `src/services/fileService.ts`, `src/stores/noteStore.ts`, `src/components/sidebar/FileTree.tsx`, `src/stores/__tests__/workspace-state.test.ts`
**Verification:** `npm test`

Status: ✅ Done
Evidence: `src/stores/noteStore.ts` 新增 `prefetchFile()`，会在不切换当前标签的前提下预热目标文档内容；`src/components/sidebar/FileTree.tsx` 在 Markdown 行 hover 时触发预取；`workspace-state.test.ts` 新增回归测试验证预取不会抢当前文件。`npm test` 通过。
Deviations:

### Step 4: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-workspace-content-cache-prefetch.md`, `docs/PLANS.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test`、`npm run build`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml` 通过，结果为 37 个原生测试全部通过；`npm test` 通过，结果为 21 个测试文件、121 个断言全部通过；`npm run build` 通过。
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 |  |
| 2 | ✅ | 原生内容缓存与后台预热已落地 | 按 `(workspace,path,mtime)` 校验缓存 |
| 3 | ✅ | 文件树 hover 预取已落地 | 预取不会抢当前标签 |
| 4 | ✅ | 原生测试、前端测试和构建均通过 |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 从“点击后优化”转向“点击前预热” | 当前未缓存文档仍受真实 IO 下限约束 | 继续压榨单次 read_file | 要逼近 `<50ms`，只能把更多文档提前转成 cache hit |
| 缓存键加入 `workspace_path + path + modified` | 必须兼顾多工作区与文件失效正确性 | 只按 path 缓存、只按 mtime 缓存 | 三元组能同时保证作用域和失效 |

## Completion Summary

Completed: 2026-04-16
Duration: 4 steps
All acceptance criteria: PASS

Summary: 本轮把首次打开文档的优化重点从“点击后读盘”转成了“点击前准备好”。原生侧新增了 `file_content_cache` 持久化表，`read_file` 现在会根据工作区路径、相对路径和文件修改时间优先命中缓存，未命中时再读盘并回填；工作区打开时还会后台预热全部 Markdown 内容缓存。前端侧则新增了 `prefetchFile()`，文件树 hover 时会提前把文档内容拉进 store，使用户真正点击时更容易直接命中内存缓存路径。最终原生测试、前端测试和构建均保持通过，为下一轮继续对比首次打开时延提供了新的缓存层基线。

# Execution Plan: Phase 6 Search

Created: 2026-04-15
Status: Active
Author: agent

## Objective

为工作区落地 Tantivy 全文搜索与 Nucleo 文件名模糊搜索，并将其接入原生命令、文件监听、侧栏搜索面板和命令面板。

## Scope

**In scope:**
- `src-tauri/Cargo.toml`
- `src-tauri/src/search/`
- `src-tauri/src/commands/search.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/state.rs`
- `src-tauri/src/commands/files.rs`
- `src-tauri/src/watcher.rs`
- `src/services/searchService.ts`
- `src/components/sidebar/SearchPanel.tsx`
- `src/components/CommandPalette.tsx`
- `src/components/app-shell-utils.ts`
- `src/App.tsx`
- 搜索相关前后端类型与测试
- 必要的 Harness 控制面文档

**Out of scope:**
- 复杂中文分词优化与自定义 tokenizer
- 跨工作区搜索、搜索历史、搜索收藏
- 搜索结果虚拟列表与大规模性能压测基建
- AI 语义搜索或向量索引

## Constraints

- 原生搜索能力必须落在 `src-tauri/src/search/`，并通过 `src-tauri/src/commands/search.rs` 暴露，不新增平行搜索层。
- 前端只能通过 `src/services/searchService.ts` 调搜索命令，组件层不直接 `invoke`。
- 搜索索引要与现有工作区打开/文件监听链路协同，而不是新增另一套文件监控路径。
- Markdown 内容进入全文索引前必须剥离语法；不把原始 Markdown token 直接送入 body 字段。
- 点击搜索结果的跳转优先做“打开文件 + 定位到首个匹配文本/标题”的可交付实现；若当前编辑器没有精确 offset API，则明确记录跳转策略而不虚假承诺字符级定位。

## Acceptance Criteria

- [ ] AC-1: `src-tauri` 内实现 Tantivy schema、索引构建/增量更新、全文搜索、Nucleo 文件名模糊搜索，并通过 Rust 测试覆盖核心索引与排序路径。
- [ ] AC-2: 工作区打开后会自动建立搜索索引，文件变更后监听链路会触发增量索引更新。
- [ ] AC-3: `search_files(query)` 与 `search_fulltext(query)` Tauri commands 已注册；短查询走文件名模糊搜索，长查询可返回全文结果并含片段/snippet。
- [ ] AC-4: `SearchPanel` 可展示搜索输入与结果列表，长查询时合并文件名与全文结果；点击结果可打开对应文件并触发跳转。
- [ ] AC-5: `CommandPalette` 文件搜索改为使用原生 fuzzy search 结果；`cargo test --manifest-path src-tauri/Cargo.toml`、`npm test -- --run`、`npm run build` 在完成后保持通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| `tantivy` 的索引 writer/reader 生命周期与 Tauri 全局状态并发不匹配 | Med | 在 `AppState` 中集中持有搜索上下文并通过互斥保护 writer/reader reload |
| `comrak` 剥离 Markdown 语法时可能保留多余空白或漏掉代码块内容 | Med | 用 AST 遍历做可控纯文本提取，并在测试中覆盖标题/列表/代码块样例 |
| 当前编辑器缺少精确命中 offset 跳转 API | Med | 先落“打开文件 + 定位到首个命中文本/标题”的近似跳转，并在计划与 UI 中明确策略 |
| 命令面板和搜索面板都接搜索服务，容易重复查询 | Low | 将搜索 service 设计为可复用接口，必要时前端做轻量 debounce 与结果复用 |

## Implementation Steps

### Step 1: 引入搜索依赖与原生搜索域模型

**Files:** `src-tauri/Cargo.toml`, `src-tauri/src/search/mod.rs`, `src-tauri/src/search/fuzzy.rs`, `src-tauri/src/state.rs`, `src-tauri/src/lib.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml search::`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml search::` 通过，新增 5 个搜索域测试（Markdown 纯文本提取、tags 提取、Tantivy 构建/搜索/增量更新、Nucleo 排序、空查询）全部通过。
Deviations: 第 1 步同时补录了 `Cargo.lock` 作为依赖引入的可复现快照；搜索索引先以内存 `tantivy::Index::create_in_ram` 交付，避免本轮把任务扩大成索引持久化设计。

### Step 2: 接入索引构建、增量更新与搜索命令

**Files:** `src-tauri/src/search/mod.rs`, `src-tauri/src/search/indexer.rs`, `src-tauri/src/commands/search.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/commands/files.rs`, `src-tauri/src/watcher.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml search:: tests::`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml search::` 通过，`search::indexer` 的 rebuild/fallback 规则与 `commands::search` 模块已进入编译和测试；`open_workspace` 现在会建索引，`watcher` flush 时会触发搜索索引更新。
Deviations: 目录级或空路径事件不做“猜测式增量更新”，统一安全回退为整库重建，优先保证索引正确性。

### Step 3: 实现前端搜索 service 与 SearchPanel

**Files:** `src/services/searchService.ts`, `src/components/sidebar/SearchPanel.tsx`, `src/App.tsx`
**Verification:** `npm test -- --run src/components/sidebar/__tests__/SearchPanel.test.tsx`

Status: ✅ Done
Evidence: `npm test -- --run src/components/sidebar/__tests__/SearchPanel.test.tsx` 通过，覆盖结果合并、高亮和空态文案；额外 `npm run build` 通过，确认 `App.tsx` 的搜索跳转接线已进入构建面。
Deviations: 第 3 步额外触及 `src/types/search.ts`、`src/types/index.ts` 和 `src/components/app-shell-utils.ts`，用于承载搜索结果类型与首个命中文本定位 helper。

### Step 4: 用搜索结果驱动命令面板与跳转辅助

**Files:** `src/components/CommandPalette.tsx`, `src/components/app-shell-utils.ts`, `src/types/`, `src/components/__tests__/CommandPalette.test.tsx`
**Verification:** `npm test -- --run src/components/__tests__/CommandPalette.test.tsx`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 5: 全量验证并更新控制面

**Files:** `docs/PLANS.md`, `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`, `docs/exec-plans/active/2026-04-15-phase6-search.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml && npm test -- --run && npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml search::` 通过，5 个搜索域测试通过 | 搜索依赖、全文/模糊搜索基础能力与 AppState 持有位已建立 |
| 2 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml search::` 通过，8 个搜索相关测试通过 | 原生索引器、监听器更新与搜索命令已接通 |
| 3 | ✅ | SearchPanel focused tests 通过，`npm run build` 通过 | 搜索 service、搜索面板和点击结果跳转链路已完成 |
| 4 | ⬜ | | |
| 5 | ⬜ | | |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 搜索结果跳转优先做首个命中文本定位 | 现有编辑器暴露了标题跳转，但未直接暴露任意 offset 定位 API | 先扩展完整原生到编辑器字符级映射接口 | 在当前任务范围内先交付稳定可用的跳转体验，避免把搜索任务扩大成编辑器底层改造 |
| 搜索索引先以内存 Tantivy 构建 | 需求要求打开工作区自动建索引与增量更新，但未要求磁盘持久化 | 在工作区目录下维护持久化索引 | 先满足查询时延和增量更新目标，减少索引目录生命周期与兼容性复杂度 |
| 目录级 watcher 事件统一回退整库重建 | `notify` 对 rename/dir 事件不保证总能给出每个受影响文件 | 为目录事件实现复杂的递归 diff | 在现有任务范围内优先保证索引正确性，文件级变更仍走增量更新 |
| 搜索跳转先定位首个命中文本 | 搜索结果还未携带字符级 offset | 扩展原生结果返回精确位置 | 先复用现有编辑器 `TextSelection` 能力交付稳定跳转，再视需求升级精确命中位置 |

## Completion Summary

Completed:
Duration: 5 steps
All acceptance criteria: PASS / FAIL

Summary:

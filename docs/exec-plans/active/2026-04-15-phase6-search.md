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

Status: ⬜ Not started
Evidence:
Deviations:

### Step 2: 接入索引构建、增量更新与搜索命令

**Files:** `src-tauri/src/search/mod.rs`, `src-tauri/src/search/indexer.rs`, `src-tauri/src/commands/search.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/commands/files.rs`, `src-tauri/src/watcher.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml search:: tests::`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 实现前端搜索 service 与 SearchPanel

**Files:** `src/services/searchService.ts`, `src/components/sidebar/SearchPanel.tsx`, `src/App.tsx`
**Verification:** `npm test -- --run src/components/sidebar/__tests__/SearchPanel.test.tsx`

Status: ⬜ Not started
Evidence:
Deviations:

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
| 1 | ⬜ | | |
| 2 | ⬜ | | |
| 3 | ⬜ | | |
| 4 | ⬜ | | |
| 5 | ⬜ | | |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 搜索结果跳转优先做首个命中文本定位 | 现有编辑器暴露了标题跳转，但未直接暴露任意 offset 定位 API | 先扩展完整原生到编辑器字符级映射接口 | 在当前任务范围内先交付稳定可用的跳转体验，避免把搜索任务扩大成编辑器底层改造 |

## Completion Summary

Completed:
Duration: 5 steps
All acceptance criteria: PASS / FAIL

Summary:

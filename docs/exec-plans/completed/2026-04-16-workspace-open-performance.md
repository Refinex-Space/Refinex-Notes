# Execution Plan: Workspace Open Performance

Created: 2026-04-16
Status: Active
Author: agent

## Objective

将工作区切换/打开重构为“首屏秒开、后台补全”的路径，并修复移除当前活跃工作区时未正确清理打开文档和工作区状态的问题。

## Scope

**In scope:**
- `src-tauri/src/commands/files.rs`
- `src-tauri/src/search/indexer.rs`
- `src-tauri/src/lib.rs`
- `src/services/fileService.ts`
- `src/stores/noteStore.ts`
- `src/types/notes.ts`
- `src/components/sidebar/FileTree.tsx`
- `src/components/sidebar/WorkspaceSwitcher.tsx`
- `src/stores/__tests__/workspace-state.test.ts`
- `src/components/sidebar/__tests__/FileTree.test.tsx`
- `src/components/sidebar/__tests__/WorkspaceSwitcher.test.tsx`

**Out of scope:**
- 编辑器正文与 Tab 交互
- Git / auth / search ranking 语义
- 当前已知的 `DocumentOutlineDock` 测试漂移

## Constraints

- 遵守 `src/` 与 `src-tauri/` 的边界，前端通过 service/IPC 与原生交互。
- 优先把重任务从首返回路径上挪开：允许后台索引与按需目录展开，但不允许工作区打开仍然同步等待全仓递归扫描完成。
- 不引入新的并行架构或第三方依赖；在现有 store / command / watcher / search indexer 上增量演化。

## Acceptance Criteria

- [ ] AC-1: 工作区打开命令不再同步等待全仓递归扫描与搜索索引重建；首返回只包含可立即渲染的浅层工作区树。
- [ ] AC-2: 前端文件树支持目录按需展开，工作区切换时能立刻显示工作区外壳与首层内容；同会话内重新切回已打开工作区时优先命中缓存快照。
- [ ] AC-3: 移除最近工作区时，如果被移除项是当前活跃工作区，前端和原生状态会正确关闭工作区并清空已打开文件/当前文档。
- [ ] AC-4: 相关测试与构建通过；全量 `npm test` 若失败，失败仍仅限于已知 `DocumentOutlineDock` 断言漂移。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 浅扫描导致目录节点没有足够信息支持展开 | Med | 为 `FileNode` 增加 `hasChildren` / `isLoaded` 元数据，前端按需补树 |
| 后台索引未完成时搜索命令报错 | Med | 搜索命令在索引未就绪时返回空结果而非错误，避免 UI 阻塞 |
| 当前活跃工作区被移除时原生 watcher/search 仍残留 | Med | 增加显式 `close_workspace` 命令同步清理原生状态 |
| 文件树 merge 子树逻辑错误导致展开后重复/丢节点 | Med | 在 store 层引入纯函数 merge，并用测试锁住 |

## Implementation Steps

### Step 1: 登记工作区性能优化计划

**Files:** `docs/exec-plans/active/2026-04-16-workspace-open-performance.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: ✅ Done
Evidence: 新计划文件已创建，`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations:

### Step 2: 去阻塞原生工作区打开路径

**Files:** `src-tauri/src/commands/files.rs`, `src-tauri/src/search/indexer.rs`, `src-tauri/src/lib.rs`
**Verification:** 原生测试通过；`open_workspace` 首返回使用浅扫描；搜索索引重建转为后台路径

Status: ✅ Done
Evidence: `open_workspace` 已改为 `scan_directory_tree_with_depth(..., Some(1))` 浅扫描首返回；新增 `close_workspace` 命令；搜索索引改为后台 `schedule_workspace_index_rebuild`，并在未就绪时安全返回空结果；`cargo test --manifest-path src-tauri/Cargo.toml` 通过，结果为 37 个原生测试全部通过。
Deviations: 通过在 `AppState` 中保存 `app_handle` 实现后台索引完成事件，不额外引入新的原生服务层。

### Step 3: 增加前端按需目录展开与工作区快照切换

**Files:** `src/types/notes.ts`, `src/services/fileService.ts`, `src/stores/noteStore.ts`, `src/components/sidebar/FileTree.tsx`, `src/components/sidebar/__tests__/FileTree.test.tsx`, `src/stores/__tests__/workspace-state.test.ts`
**Verification:** store / FileTree 测试覆盖目录懒加载与工作区切换缓存

Status: ✅ Done
Evidence: `FileNode` 新增 `hasChildren / isLoaded`；`noteStore` 新增 `isWorkspaceLoading / loadingDirectories / workspaceSnapshots / loadDirectory`；工作区切换支持浅树快照命中与目录懒加载；`FileTree` 会在目录展开时按需加载子树；相关 Vitest 通过。
Deviations: 工作区快照目前只缓存浅树结构，不缓存文档正文；正文仍由现有文档缓存路径负责。

### Step 4: 修复活跃工作区移除状态清理

**Files:** `src/components/sidebar/WorkspaceSwitcher.tsx`, `src/stores/noteStore.ts`, `src/services/fileService.ts`, `src/components/sidebar/__tests__/WorkspaceSwitcher.test.tsx`, `src/stores/__tests__/workspace-state.test.ts`
**Verification:** 移除当前工作区后，工作区与打开文档状态被清空，相关测试通过

Status: ✅ Done
Evidence: `removeRecentWorkspace()` 现在在移除当前活跃工作区时会调用 `closeWorkspace()`、重置 editor store，并清空当前工作区、已打开文档和缓存快照；相关 store / switcher 测试通过。
Deviations:

### Step 5: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-workspace-open-performance.md`, `docs/PLANS.md`
**Verification:** 相关测试、`cargo test --manifest-path src-tauri/Cargo.toml`、`npm run build`

Status: ✅ Done
Evidence: `npx vitest run src/stores/__tests__/workspace-state.test.ts src/components/sidebar/__tests__/FileTree.test.tsx src/components/sidebar/__tests__/WorkspaceSwitcher.test.tsx src/components/sidebar/__tests__/sidebar-utils.test.ts` 通过，结果为 4 个测试文件、17 个断言全部通过；`npm test` 通过，结果为 21 个测试文件、116 个断言全部通过；`npm run build` 通过；`cargo test --manifest-path src-tauri/Cargo.toml` 通过。
Deviations: 全量前端测试阻塞已不存在，因为此前的 `DocumentOutlineDock` 测试漂移已在后续性能优化中顺带修复。

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 |  |
| 2 | ✅ | 原生浅扫描首返回 + 后台索引已落地 | `open_workspace` 不再同步等待全仓扫描和索引 |
| 3 | ✅ | 前端支持懒加载目录与工作区浅树快照 | 切换可立刻看到工作区壳层 |
| 4 | ✅ | 移除当前工作区时会正确清空状态 | 修复活跃目录移除 bug |
| 5 | ✅ | 相关测试、全量测试、构建、原生测试全通过 | 计划可归档 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 工作区打开采用“浅扫描立即返回 + 按需展开 + 后台索引” | 大仓库同步递归扫描和索引重建会阻塞首屏 | 仅做 memo/cache、仅加 loading | 真正的瓶颈在同步首路径，必须改执行模型 |
| 同会话缓存最近工作区浅树快照 | 用户反复切工作区时需要主观秒开 | 只依赖原生命令浅扫描 | 命中缓存时可以连浅扫描往返都省掉 |
| 搜索索引未就绪时返回空结果而非错误 | 首屏秒开优先级高于搜索即时可用 | 继续在打开工作区时同步构建索引 | 避免因索引未就绪把整个切换路径拖慢或报错 |

## Completion Summary

Completed: 2026-04-16
Duration: 5 steps
All acceptance criteria: PASS

Summary: 本次工作把左上角工作区切换/打开从同步全量扫描路径改造成了“浅扫描立即返回、目录按需展开、搜索索引后台补建”的模型。Rust 侧 `open_workspace` 现在首返回只做一层目录扫描，同时 watcher 仍可立即建立，搜索索引在后台线程异步重建；前端 `noteStore` 则新增工作区浅树快照缓存和目录懒加载能力，使同会话内切回最近工作区时可以主观秒开，并在展开目录时再按需补树。与此同时，移除当前活跃工作区时会显式关闭 native workspace 状态、重置 editor store 并清空打开文档，修复了此前的活跃目录移除 bug。最终相关测试、全量前端测试、构建和原生测试全部通过。

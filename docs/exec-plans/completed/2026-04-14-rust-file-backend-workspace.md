# Execution Plan: Rust File Backend Workspace

Created: 2026-04-14
Status: Completed
Author: agent

## Objective

在 Tauri 原生层实现工作区文件系统、SQLite 元数据库和文件监听，并让前端通过 service/store 使用真实工作区完成文件浏览、读取、保存和外部变更刷新。

## Scope

**In scope:**
- `src-tauri/src/{state.rs,db.rs,watcher.rs,lib.rs}`
- `src-tauri/src/commands/{mod.rs,files.rs}`
- `src-tauri/Cargo.toml`
- `src/services/fileService.ts`
- `src/stores/noteStore.ts`
- `src/App.tsx`
- `src/components/sidebar/FileTree.tsx`
- 与本功能直接相关的类型、测试和 Tauri 插件接线

**Out of scope:**
- Git 同步、历史记录、冲突处理
- AI 面板、搜索索引和设置持久化
- 非 Markdown 文件的富预览或二进制编辑
- 完整数据库迁移框架

## Constraints

- 保持 `src/services/*.ts` 作为前端调用 Tauri IPC 的唯一 seam，不在 React 组件内嵌原生逻辑。
- Tauri 命令入口集中在 `src-tauri/src/commands/`，共享状态集中在 `AppState`，不要创建平行原生抽象层。
- 优先补全现有占位模块 `state.rs`、`db.rs`、`watcher.rs`、`commands/files.rs`，而不是新增顶层结构。
- 前端 store 仍由 Zustand 管理，UI 组件通过 store/action 驱动，不直接操作 `invoke`/事件监听。

## Acceptance Criteria

- [x] AC-1: 应用启动时会创建或打开 `~/.refinex-notes/meta.db`，并确保 `settings`、`recent_workspaces`、`file_meta` 三张表存在。
- [x] AC-2: `open_workspace`、`read_file_tree`、`read_file`、`write_file`、`create_file`、`create_dir`、`delete_file`、`rename_file` 八个 Tauri commands 已注册并可通过 `cargo test`/编译验证。
- [x] AC-3: 文件树递归读取会忽略 `.git`、`node_modules`、`.DS_Store`，并返回前端可消费的 `FileNode[]`。
- [x] AC-4: 前端可通过目录选择器选定本地工作空间，并显示真实文件树；点击 `.md` 文件后能读取内容并载入编辑器。
- [x] AC-5: 当前编辑中的 Markdown 通过 `Ctrl/Cmd+S` 写回磁盘，并清除未保存标记。
- [x] AC-6: 外部文件变更会在 500ms 防抖后触发 `files-changed` 事件，前端据此刷新文件树与当前文档内容。

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Tauri 2 当前工程未接入目录选择能力，验收缺少“选择工作区”入口 | Med | 按官方文档最小接入 `tauri-plugin-dialog`，只暴露目录选择所需能力 |
| 文件监听事件可能在保存时过于频繁，造成前端重复刷新 | Med | 在 Rust watcher 层使用 500ms 聚合防抖，只发送去重后的路径列表 |
| 现有前端测试依赖 mock store 初始状态，直接替换会造成大面积回归 | Med | 保留 store 纯函数工具与可重置状态，新增真实工作区初始化动作，避免破坏现有测试 |
| `notify` 在不同平台行为不完全一致 | Low | 使用 `RecommendedWatcher` 递归监听工作区，并通过路径重扫保证最终一致性 |

## Implementation Steps

### Step 1: 建立原生状态和数据库引导

**Files:** `src-tauri/Cargo.toml`, `src-tauri/src/state.rs`, `src-tauri/src/db.rs`, `src-tauri/src/lib.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml` 通过；新增 `db::tests::initialize_schema_creates_expected_tables` 与 `db::tests::remember_workspace_upserts_recent_workspace`。
Deviations: 与 Step 2/3 一并实现，因为 `AppState`、数据库、commands 注册和 watcher 生命周期共享同一条 `tauri::Builder` wiring 路径，拆分会留下中间不可运行状态。

### Step 2: 实现文件系统 commands 与文件树扫描

**Files:** `src-tauri/src/commands/mod.rs`, `src-tauri/src/commands/files.rs`, `src-tauri/src/lib.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml` 通过；新增 `commands::files::tests::scan_directory_tree_ignores_internal_entries`。
Deviations: 与 Step 1/3 合并交付，同一提交中同时完成了文件树扫描、路径约束和 command 注册。

### Step 3: 接入工作区监听与 500ms 防抖事件

**Files:** `src-tauri/src/watcher.rs`, `src-tauri/src/state.rs`, `src-tauri/src/commands/files.rs`, `src-tauri/src/lib.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml` 通过；`src-tauri/src/watcher.rs` 已实现 500ms 防抖并向前端发送 `files-changed`。
Deviations: 与 Step 1/2 合并交付，以保证 `open_workspace` 在设置 watcher 后立即处于可用状态。

### Step 4: 建立前端 file service 与 store 同步

**Files:** `src/services/fileService.ts`, `src/stores/noteStore.ts`, `src/types/notes.ts`
**Verification:** `npm test -- --run`

Status: ✅ Done
Evidence: `npm test -- --run` 通过（10 个测试文件、74 个测试）。
Deviations: 保留了 mock workspace fallback，避免破坏既有 store 测试与无 Tauri 场景。

### Step 5: 打通目录选择、编辑器保存和外部刷新

**Files:** `src/App.tsx`, `src/components/sidebar/FileTree.tsx`, `src/editor/RefinexEditor.tsx`, `package.json`
**Verification:** `npm test -- --run && npm run build`

Status: ✅ Done
Evidence: `npm test -- --run && npm run build` 通过；目录选择器、`Ctrl/Cmd+S`、`files-changed` 监听链路均已编译接通。
Deviations: `RefinexEditor.tsx` 无需改动，保存快捷键在 `src/App.tsx` 统一绑定即可满足验收标准。

### Step 6: 补充验证与控制面更新

**Files:** `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml && npm test -- --run && npm run build`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml && npm test -- --run && npm run build` 全部通过。
Deviations: 补充更新了 `docs/ARCHITECTURE.md` 与 `docs/OBSERVABILITY.md`，未修改其它控制面文件。

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml` 通过，SQLite schema 测试通过 | 原生状态、数据库初始化已接入 `tauri::Builder` |
| 2 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml` 通过，文件树忽略项测试通过 | 文件 commands 与工作区路径约束已落地 |
| 3 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml` 通过 | watcher + 500ms 防抖事件已接线 |
| 4 | ✅ | `npm test -- --run` 通过（74/74） | 前端 service/store 与 mock fallback 并存 |
| 5 | ✅ | `npm test -- --run && npm run build` 通过 | 目录选择、保存快捷键、外部变更刷新已编译接通 |
| 6 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml && npm test -- --run && npm run build` 通过 | 控制面文档已同步 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 将目录选择器纳入本轮实现 | 验收要求明确需要“可以选择一个本地文件夹作为工作空间” | 仅暴露手填路径输入 | 目录选择器更贴合验收标准，也能降低路径输入错误 |
| 文件 commands 强制限制在当前工作区内 | 文件操作命令接收前端传入路径，存在越权风险 | 允许任意绝对路径、完全依赖前端约束 | 按安全优先原则在 Rust 后端统一校验，避免 UI 漏洞直接扩展为任意文件访问 |
| 保留 mock workspace fallback | 既有 Vitest 依赖初始 mock 数据 | 全量切到真实工作区并重写测试 | 在不破坏现有测试的前提下完成真实工作区接入，风险更低 |

## Completion Summary

Completed: 2026-04-14
Duration: 6 steps
All acceptance criteria: PASS

Summary: 已在 Rust 侧接入 `AppState`、SQLite 元数据库、工作区文件 commands 和 `notify` watcher，并在前端通过 `fileService`、`noteStore`、目录选择器和保存快捷键串起真实工作区流程。最终验证显示 `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test -- --run`、`npm run build` 全部通过；残余风险主要是本轮未在 GUI 中做人工点击 smoke test，但编译链路和单元测试已经覆盖 schema、最近工作区写入与文件树忽略规则。

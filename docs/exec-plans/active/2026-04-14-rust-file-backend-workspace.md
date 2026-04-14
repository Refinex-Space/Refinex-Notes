# Execution Plan: Rust File Backend Workspace

Created: 2026-04-14
Status: Active
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

- [ ] AC-1: 应用启动时会创建或打开 `~/.refinex-notes/meta.db`，并确保 `settings`、`recent_workspaces`、`file_meta` 三张表存在。
- [ ] AC-2: `open_workspace`、`read_file_tree`、`read_file`、`write_file`、`create_file`、`create_dir`、`delete_file`、`rename_file` 八个 Tauri commands 已注册并可通过 `cargo test`/编译验证。
- [ ] AC-3: 文件树递归读取会忽略 `.git`、`node_modules`、`.DS_Store`，并返回前端可消费的 `FileNode[]`。
- [ ] AC-4: 前端可通过目录选择器选定本地工作空间，并显示真实文件树；点击 `.md` 文件后能读取内容并载入编辑器。
- [ ] AC-5: 当前编辑中的 Markdown 通过 `Ctrl/Cmd+S` 写回磁盘，并清除未保存标记。
- [ ] AC-6: 外部文件变更会在 500ms 防抖后触发 `files-changed` 事件，前端据此刷新文件树与当前文档内容。

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

Status: ⬜ Not started
Evidence:
Deviations:

### Step 2: 实现文件系统 commands 与文件树扫描

**Files:** `src-tauri/src/commands/mod.rs`, `src-tauri/src/commands/files.rs`, `src-tauri/src/lib.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 接入工作区监听与 500ms 防抖事件

**Files:** `src-tauri/src/watcher.rs`, `src-tauri/src/state.rs`, `src-tauri/src/commands/files.rs`, `src-tauri/src/lib.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: 建立前端 file service 与 store 同步

**Files:** `src/services/fileService.ts`, `src/stores/noteStore.ts`, `src/types/notes.ts`
**Verification:** `npm test -- --run`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 5: 打通目录选择、编辑器保存和外部刷新

**Files:** `src/App.tsx`, `src/components/sidebar/FileTree.tsx`, `src/editor/RefinexEditor.tsx`, `package.json`
**Verification:** `npm test -- --run && npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 6: 补充验证与控制面更新

**Files:** `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml && npm test -- --run && npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ⬜ |  |  |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |
| 4 | ⬜ |  |  |
| 5 | ⬜ |  |  |
| 6 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 将目录选择器纳入本轮实现 | 验收要求明确需要“可以选择一个本地文件夹作为工作空间” | 仅暴露手填路径输入 | 目录选择器更贴合验收标准，也能降低路径输入错误 |

## Completion Summary

Completed:
Duration: <N> steps
All acceptance criteria: PASS / FAIL

Summary:

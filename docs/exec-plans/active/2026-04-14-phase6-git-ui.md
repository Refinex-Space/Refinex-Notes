# Execution Plan: Phase 6 Git UI

Created: 2026-04-14
Status: Active
Author: agent

## Objective

将已完成的原生 Git 能力接入 React 应用壳，交付可见、可操作的同步状态栏、Git 历史面板、仓库初始化/Clone 引导、文件树 Git 状态标记，以及完整的前端 Git store/service 集成。

## Scope

**In scope:**
- `src/components/git/SyncStatus.tsx`
- `src/components/git/HistoryPanel.tsx`
- `src/components/git/SetupPanel.tsx`
- `src/components/sidebar/FileTree.tsx`
- `src/components/layout/StatusBar.tsx`
- `src/App.tsx`
- `src/stores/gitStore.ts`
- `src/services/gitService.ts`
- `src/types/git.ts`
- 与上述 UI 接线直接相关的 Vitest 测试
- 必要的 Harness 控制面文档

**Out of scope:**
- Rust Git 引擎逻辑变更
- 冲突解决编辑器 / 三方合并 UI
- GitHub 仓库列表的新增原生命令或后端扩展
- 非 GitHub remote 管理与高级设置页

## Constraints

- 前端只能通过 `src/services/` 访问 Tauri Git commands 和事件，不在组件内直接调用 `invoke`。
- Git 前端状态统一收敛到 Zustand `gitStore`，组件保持展示与交互职责。
- 复用现有 `StatusBar` / `AppLayout` / 侧栏骨架，不引入平行布局结构。
- 遵循当前模块约束：浏览器 UI 留在 `src/`，不为本轮 UI 需求回写 Rust 域逻辑。
- 由于当前未暴露 GitHub 仓库列表接口，`SetupPanel` 以“已登录身份提示 + remote URL 输入/clone + init 引导”为可交付基线。

## Acceptance Criteria

- [ ] AC-1: `gitService` 封装 Tauri Git commands 与 `git-sync-status` 事件监听，`gitStore` 提供实际可调用的 init/clone/status/history/sync actions，并有 Vitest 覆盖核心状态更新逻辑。
- [ ] AC-2: 状态栏左侧显示实时 Git 同步状态，悬停 tooltip 呈现详细信息，点击 popover 提供“立即同步/查看历史/设置”快捷操作。
- [ ] AC-3: 文件树从真实 `gitStore` 状态读取 Git 标记，文件名颜色按 added/modified/deleted/untracked 呈现。
- [ ] AC-4: 右面板可在 SetupPanel 与 HistoryPanel 间切换；未初始化仓库时显示 setup 引导，已初始化且有当前文件时显示当前文件 commit 历史，并支持查看某条 commit 的只读文档内容。
- [ ] AC-5: `npm test -- --run` 与 `npm run build` 保持通过，不劣化当前基线。

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| 现有原生层没有“列 GitHub 仓库”接口 | High | 在计划中明确降级为 URL 驱动的 setup 引导，并显示 GitHub 登录身份作为上下文 |
| Git 同步状态与文件树状态来源不同步 | Med | 让 `gitStore` 成为唯一前端 Git 状态源，并在工作区刷新后统一重建文件状态映射 |
| 历史面板需要读旧版本文档内容，但原生层未暴露 file-at-commit API | Med | 先使用 commit diff 只读预览作为历史详情的交付基线，并在文案中明确为历史快照视图 |
| UI 接线牵动 `App.tsx` 壳层较多，容易回归布局 | Med | 追加 `AppLayout` / `FileTree` / `gitStore` focused tests，并用 `npm run build` 做类型约束兜底 |

## Implementation Steps

### Step 1: 扩展 Git 前端类型与服务契约

**Files:** `src/types/git.ts`, `src/services/gitService.ts`, `src/stores/gitStore.ts`
**Verification:** `npm run build`

Status: ✅ Done
Evidence: `npm run build` 通过，新的 Git 类型模型、Tauri service 封装与编译适配后的 `gitStore` 均已纳入构建。
Deviations: 新类型落地后，原占位 `gitStore` 已无法通过 TypeScript 检查，因此本步额外加入 `src/stores/gitStore.ts` 的最小编译适配，真实行为留在第 2 步实现。

### Step 2: 实现 gitStore 状态管理与测试

**Files:** `src/stores/gitStore.ts`, `src/stores/__tests__/gitStore.test.ts`
**Verification:** `npm test -- --run src/stores/__tests__/gitStore.test.ts`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 实现 SyncStatus 与 SetupPanel

**Files:** `src/components/git/SyncStatus.tsx`, `src/components/git/SetupPanel.tsx`, `src/components/layout/StatusBar.tsx`
**Verification:** `npm test -- --run src/components/git/__tests__/SyncStatus.test.tsx`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: 集成 HistoryPanel、FileTree 和应用壳

**Files:** `src/components/git/HistoryPanel.tsx`, `src/components/sidebar/FileTree.tsx`, `src/App.tsx`, `src/components/sidebar/__tests__/FileTree.test.tsx`
**Verification:** `npm test -- --run src/components/git/__tests__/HistoryPanel.test.tsx src/components/sidebar/__tests__/FileTree.test.tsx`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 5: 全量验证并更新控制面

**Files:** `docs/PLANS.md`, `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`, `docs/exec-plans/active/2026-04-14-phase6-git-ui.md`
**Verification:** `npm test -- --run && npm run build && cargo test --manifest-path src-tauri/Cargo.toml`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | `npm run build` 通过 | Git 类型模型、service 契约和 store 编译适配已完成 |
| 2 | ⬜ | | |
| 3 | ⬜ | | |
| 4 | ⬜ | | |
| 5 | ⬜ | | |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| SetupPanel 以 URL clone 为交付基线 | 当前无 GitHub repo list 前端/原生接口 | 在本轮追加后端 repo-list 命令 | 遵循已确认范围，先完成前端 UI 主路径与已存在原生能力接线 |
| 第 1 步包含 `gitStore` 编译适配 | 新的 Git 状态模型导致旧占位 store 类型失效 | 将类型改动延后到 store 实现时再做 | 尽早让类型与服务契约进入稳定编译面，避免后续 UI 改动建立在失配模型之上 |

## Completion Summary

Completed:
Duration: 5 steps
All acceptance criteria: PASS / FAIL

Summary:

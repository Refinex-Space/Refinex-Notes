# Execution Plan: Editor Open Switch Performance

Created: 2026-04-16
Status: Active
Author: agent

## Objective

把左侧点击 `.md` 文件打开右侧编辑器，以及顶部 Tab 间文档切换，优化到已加载文档近乎瞬切、首次打开大 Markdown 也尽量无感的路径，同时保持当前编辑功能完整。

## Scope

**In scope:**
- `src/stores/noteStore.ts`
- `src/editor/RefinexEditor.tsx`
- `src/App.tsx`
- `src/stores/__tests__/workspace-state.test.ts`
- `src/editor/__tests__/RefinexEditor-utils.test.ts`

**Out of scope:**
- 工作区秒开优化（已暂存为 `codex-wip-workspace-open-performance`）
- `DocumentOutlineDock` 既有测试漂移
- Git / 搜索 / 认证逻辑

## Constraints

- 保持 `src/` 内 store / editor / component 分层，不把磁盘 IO、编辑器状态和 UI 事件杂糅。
- 不通过删功能换性能；解析、序列化、toolbar、slash menu、光标与受控同步都必须保留。
- 优先处理真实热点：重复磁盘读取、编辑器 remount、无必要的全量序列化比较、重复 Markdown 解析。

## Acceptance Criteria

- [ ] AC-1: 已加载过的文档再次点击或通过 Tab 切换时，不再重复走磁盘读取路径，切换直接命中文档缓存。
- [ ] AC-2: 文档切换时不再通过 `key={currentDocument.path}` 重建整个 `RefinexEditor`，编辑器实例保持存活。
- [ ] AC-3: `RefinexEditor` 在外部 `value` 变化时不再依赖对当前整份文档做序列化比较来判断是否更新，并引入有限大小的解析缓存。
- [ ] AC-4: 相关测试与 `npm run build` 通过；全量 `npm test` 若失败，失败仍仅限于既有 `DocumentOutlineDock` 断言漂移。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 去掉 remount 后残留上一个文档的 selection / overlay 状态 | Med | 切文档时显式刷新 editor state、cursor 和 overlay version |
| 直接命中文档缓存导致外部文件变化不可见 | Med | 缓存仅针对已在内存中的文档；外部变化仍由 `refreshWorkspace` 覆盖 |
| 解析缓存无限增长 | Low | 使用固定上限的 LRU 风格缓存 |
| 用 ref 代替序列化比较后出现漏更新 | Med | 补回归测试锁住“相同值跳过 / 新值更新”行为 |

## Implementation Steps

### Step 1: 登记编辑器打开/切换性能计划

**Files:** `docs/exec-plans/active/2026-04-16-editor-open-switch-performance.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: ✅ Done
Evidence: 新计划文件已创建，`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations: 与已暂停的 `Workspace Open Performance` 在 `noteStore.ts` 上有路径交叉，但当前工作树已通过 `git stash` 清空，互不混写。

### Step 2: 消除重复磁盘读取与切换抖动

**Files:** `src/stores/noteStore.ts`, `src/stores/__tests__/workspace-state.test.ts`
**Verification:** store 测试覆盖已加载文档重复打开的缓存命中路径

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 让编辑器实例保持存活并引入解析缓存

**Files:** `src/editor/RefinexEditor.tsx`, `src/App.tsx`, `src/editor/__tests__/RefinexEditor-utils.test.ts`
**Verification:** 编辑器相关测试通过，代码不再使用 `key={currentDocument.path}`，且存在有限解析缓存

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-editor-open-switch-performance.md`, `docs/PLANS.md`
**Verification:** 相关测试、`npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 | 与 stash 中的工作区优化任务解耦 |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |
| 4 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 先处理文档打开和 Tab 切换主链路 | 这是比工作区秒开更核心的交互瓶颈 | 继续上一个任务 | 用户明确提升优先级，且两者应拆开优化 |
| 优先保活单个 `EditorView` | 当前架构只有一个主编辑器视图 | 每个 Tab 维护独立编辑器实例池 | 保活单实例收益大、风险可控，先拿主要性能红利 |

## Completion Summary

Completed:
Duration: 4 steps
All acceptance criteria: PASS / FAIL

Summary:

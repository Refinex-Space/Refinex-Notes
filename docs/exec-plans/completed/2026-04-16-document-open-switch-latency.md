# Execution Plan: Document Open Switch Latency

Created: 2026-04-16
Status: Active
Author: agent

## Objective

把左侧目录打开文档和已打开文档切换优化到“点击后立即反馈、已加载文档近乎瞬切、大 Markdown 切换不再持续放大卡顿”。

## Scope

**In scope:**
- `src/stores/noteStore.ts`
- `src/types/notes.ts`
- `src/App.tsx`
- `src/editor/RefinexEditor.tsx`
- `src/stores/__tests__/workspace-state.test.ts`
- `src/editor/__tests__/RefinexEditor-utils.test.ts`

**Out of scope:**
- 工作区整体打开速度
- Git / 搜索 / 认证逻辑
- 视觉样式调整

## Constraints

- 保持 `src/` 内 store / service / editor / component 分层，不把原生 IO 逻辑塞进 React 组件。
- 不通过移除编辑器能力换性能；保存、切换、脏标记与受控同步必须保持正确。
- 优先处理真实热点：文档点击时的同步等待、切换前后的整文档 flush / parse 开销。

## Acceptance Criteria

- [ ] AC-1: 点击左侧未加载文档时，store 会立即切换 `currentFile` / `openFiles`，UI 可立刻进入目标文档加载态，而不是等待 `readFile()` 完成后才响应。
- [ ] AC-2: 对同一路径的重复打开请求会复用进行中的读取任务，不会因为快速连点或 Tab 切换重复触发多次 `readFile()`。
- [ ] AC-3: 编辑器切换外部文档时，只在当前文档确有待 flush 内容时才做同步序列化；对目标文档优先命中有限缓存，避免无意义的重复 parse。
- [ ] AC-4: 定向 Vitest、`npm test`、`npm run build` 均通过，且不引入新的原生测试失败。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 提前切到目标文档后出现空白闪动 | Med | 为打开中的文档提供显式 loading 状态，让 UI 渲染稳定占位而不是回退空态 |
| 复用进行中的读取任务后把旧结果写回错误文档 | Med | 以路径为 key 管理 pending promise，只在目标路径仍存在时提交结果 |
| 切换时跳过 flush 导致丢失未保存输入 | Med | 仅在确认无 pending markdown 时跳过；保留显式保存与卸载前 flush |
| 文档缓存增长带来内存负担 | Low | 使用固定上限的 LRU 风格缓存，并在 store 中只保留必要元数据 |

## Implementation Steps

### Step 1: 登记文档打开/切换延迟优化计划

**Files:** `docs/exec-plans/active/2026-04-16-document-open-switch-latency.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: ✅ Done
Evidence: 计划文件已创建，`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations:

### Step 2: 让文档点击立即切换并复用进行中的读取任务

**Files:** `src/stores/noteStore.ts`, `src/types/notes.ts`, `src/App.tsx`, `src/stores/__tests__/workspace-state.test.ts`
**Verification:** store 测试覆盖“立即切换 currentFile”和“重复打开只触发一次 readFile”

Status: ✅ Done
Evidence: `openFile()` 现在会先更新 `currentFile` / `openFiles` / `openingFiles`，未加载文档可立即进入目标加载态；同一路径重复打开会复用 store 内的进行中读盘 promise；`workspace-state.test.ts` 新增“立即切换”和“单次 readFile”回归测试并通过。
Deviations:

### Step 3: 收敛编辑器切换时的 flush / parse 成本

**Files:** `src/editor/RefinexEditor.tsx`, `src/editor/__tests__/RefinexEditor-utils.test.ts`
**Verification:** editor util 测试覆盖“无 pending 变更时跳过 flush”和缓存命中判断

Status: ✅ Done
Evidence: `RefinexEditor` 现在用 `shouldFlushBeforeExternalSync()` 避免无 pending markdown 时的切换前同步序列化，并为 `documentPath + value` 维护最近使用 `EditorState` 缓存；`RefinexEditor-utils.test.ts` 新增 flush 决策与缓存 key 回归测试并通过。
Deviations:

### Step 4: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-document-open-switch-latency.md`, `docs/PLANS.md`
**Verification:** 定向测试、`npm test`、`npm run build`

Status: ✅ Done
Evidence: `npx vitest run src/stores/__tests__/workspace-state.test.ts src/editor/__tests__/RefinexEditor-utils.test.ts` 通过，结果为 2 个测试文件、15 个断言全部通过；`cargo test --manifest-path src-tauri/Cargo.toml` 通过，结果为 37 个原生测试全部通过；`npm test` 通过，结果为 21 个测试文件、120 个断言全部通过；`npm run build` 通过。
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 |  |
| 2 | ✅ | 定向测试通过，点击路径已先切到目标文档 | 增加了 `openingFiles` 显式状态 |
| 3 | ✅ | 编辑器切换路径已加入按需 flush 和建态缓存 | 避免重复 parse / create state |
| 4 | ✅ | 定向测试、全量测试、构建、原生测试全部通过 | 无新增失败 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 先优化“点击后才开始等 IO”的路径 | 用户体感首先卡在点击无反馈 | 先继续做工作区或搜索优化 | 当前症状直接命中 `openFile()` 主路径 |
| 在 store 层管理 pending 读取任务 | 避免 UI 层自管重复请求 | 在组件层做防抖/节流 | 重复打开问题属于状态层责任，放在 store 更稳妥 |

Additional plan update: Step 2 需要同时修改 `src/types/notes.ts`，为“文档正在打开”状态补充显式类型字段，避免 UI 与 store 之间依赖隐式约定。

## Completion Summary

Completed: 2026-04-16
Duration: 4 steps
All acceptance criteria: PASS

Summary: 本次优化把“点击文档要等读盘完成才响应”的路径改成了先切目标文件、再异步补正文档内容，并在 store 层用 `openingFiles` 和按工作区隔离的进行中 promise 复用来避免重复读取。同一时间，编辑器切换逻辑新增了 `documentPath + value` 级别的最近使用 `EditorState` 缓存，并把切换前的同步 flush 收敛到“仅在确有 pending markdown 时”才发生，减少大 Markdown 来回切换时的重复序列化和建态成本。最终定向测试、全量前端测试、构建和原生测试均保持通过。

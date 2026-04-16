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

Status: 🔄 In progress
Evidence:
Deviations:

### Step 2: 让文档点击立即切换并复用进行中的读取任务

**Files:** `src/stores/noteStore.ts`, `src/types/notes.ts`, `src/App.tsx`, `src/stores/__tests__/workspace-state.test.ts`
**Verification:** store 测试覆盖“立即切换 currentFile”和“重复打开只触发一次 readFile”

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 收敛编辑器切换时的 flush / parse 成本

**Files:** `src/editor/RefinexEditor.tsx`, `src/editor/__tests__/RefinexEditor-utils.test.ts`
**Verification:** editor util 测试覆盖“无 pending 变更时跳过 flush”和缓存命中判断

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-document-open-switch-latency.md`, `docs/PLANS.md`
**Verification:** 定向测试、`npm test`、`npm run build`

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
| 先优化“点击后才开始等 IO”的路径 | 用户体感首先卡在点击无反馈 | 先继续做工作区或搜索优化 | 当前症状直接命中 `openFile()` 主路径 |
| 在 store 层管理 pending 读取任务 | 避免 UI 层自管重复请求 | 在组件层做防抖/节流 | 重复打开问题属于状态层责任，放在 store 更稳妥 |

Additional plan update: Step 2 需要同时修改 `src/types/notes.ts`，为“文档正在打开”状态补充显式类型字段，避免 UI 与 store 之间依赖隐式约定。

## Completion Summary

Completed:
Duration: 4 steps
All acceptance criteria: PASS / FAIL

Summary:

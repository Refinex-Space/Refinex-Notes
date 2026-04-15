# Execution Plan: Editor Extreme Performance

Created: 2026-04-16
Status: Active
Author: agent

## Objective

继续压榨大 `.md` 的编辑性能：把 `onChange` 路径里的整文档 Markdown 序列化改成延迟/空闲 flush，并让 outline / toolbar 等附属层尽量只跟可见区和真实交互变化更新。

## Scope

**In scope:**
- `src/editor/RefinexEditor.tsx`
- `src/editor/index.ts`
- `src/editor/__tests__/RefinexEditor-utils.test.ts`
- `src/components/editor/DocumentOutlineDock.tsx`
- `src/components/editor/__tests__/DocumentOutlineDock.test.tsx`
- `src/App.tsx`

**Out of scope:**
- 工作区秒开优化（仍在独立 active plan 中）
- Git / 搜索 / 认证逻辑
- 文件树与 workspace switcher 行为

## Constraints

- 不牺牲编辑器功能完整性；输入、保存、slash menu、toolbar、outline 导航都必须保留。
- 延迟序列化不能导致切文档或保存时丢失最新内容。
- 可见区驱动优先用于高频附属层，避免大文档下非必要的全文解析和全量 overlay 更新。

## Acceptance Criteria

- [ ] AC-1: `dispatchTransaction` 中的 Markdown 序列化不再对每个 docChanged 事务立即执行，而是延迟/空闲 flush。
- [ ] AC-2: 保存和切文档时会显式 flush 最新编辑器内容，保证不会因为延迟同步丢失改动。
- [ ] AC-3: `DocumentOutlineDock` 在运行时默认使用可见区 heading rail，只有展开时才做全文 heading 提取；相关测试覆盖可见区逻辑。
- [ ] AC-4: toolbar/overlay 刷新不再对每次普通输入都触发；相关测试、`npm test`、`npm run build` 全部通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 延迟 flush 导致保存到旧内容 | Med | 在保存快捷键和文档切换前显式同步 `EditorView` 当前状态 |
| 切文档时 pending change 还没回写 store | Med | 在外部 `value` 同步 effect 与 unmount 路径主动 flush |
| 可见区 rail 与全文 outline 状态不一致 | Low | 关闭态只负责 rail，展开态回退到全文 headings，职责明确 |
| `requestIdleCallback` 兼容性问题 | Low | 提供 `setTimeout` 回退路径 |

## Implementation Steps

### Step 1: 登记极致编辑器性能计划

**Files:** `docs/exec-plans/active/2026-04-16-editor-extreme-performance.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: ✅ Done
Evidence: 计划文件已创建并登记。
Deviations:

### Step 2: 延迟化 Markdown flush 并保底保存/切换正确性

**Files:** `src/editor/RefinexEditor.tsx`, `src/editor/index.ts`, `src/editor/__tests__/RefinexEditor-utils.test.ts`, `src/App.tsx`
**Verification:** editor util 测试覆盖外部同步/overlay 逻辑，保存路径显式 flush

Status: ✅ Done
Evidence: `RefinexEditor.tsx` 已加入 idle/debounce flush、显式 flush、overlay 刷新收敛；`App.tsx` 保存前序列化当前 `EditorView`；相关 util 测试已补充。
Deviations:

### Step 3: 将 outline 改为可见区驱动并修正测试

**Files:** `src/components/editor/DocumentOutlineDock.tsx`, `src/components/editor/__tests__/DocumentOutlineDock.test.tsx`, `src/App.tsx`
**Verification:** DocumentOutlineDock 测试覆盖 visible rail；全量前端测试通过

Status: ✅ Done
Evidence: outline 关闭态使用 DOM 可见区 heading rail，展开态才做全文 heading 提取；测试已覆盖可见区过滤，并恢复全量测试通过。
Deviations: 顺手补回了既有的 `当前文档标题导航` 可访问文本，从而修复了之前的测试漂移。

### Step 4: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-editor-extreme-performance.md`, `docs/PLANS.md`
**Verification:** 相关测试、`npm test`、`npm run build`

Status: ✅ Done
Evidence: `npx vitest run src/stores/__tests__/workspace-state.test.ts src/editor/__tests__/RefinexEditor-utils.test.ts src/components/editor/__tests__/TabBar.test.tsx src/components/editor/__tests__/DocumentOutlineDock.test.tsx` 通过，结果为 4 个测试文件、18 个断言全部通过；`npm test` 通过，结果为 21 个测试文件、116 个断言全部通过；`npm run build` 通过。
Deviations: 本轮顺手修复了原本漂移的 `DocumentOutlineDock` 测试断言，因为可见区驱动改造本身就覆盖了该组件。

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 |  |
| 2 | ✅ | idle flush + 显式 flush 已落地 |  |
| 3 | ✅ | visible rail + 测试修复已落地 |  |
| 4 | ✅ | 相关测试、全量前端测试与构建全部通过 | 无新增失败 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 用延迟/空闲 flush 替代事务内立即整文档序列化 | 大文档每次输入都同步序列化成本过高 | 继续保持同步、做完整增量 serializer | 延迟 flush 风险更低，收益显著，能快速落地 |
| 保存时直接从 `EditorView` 取最新 Markdown | store 内容在 flush 窗口内可能滞后 | 强制每次输入都同步 store | 保存是高价值路径，显式序列化一次更划算 |
| outline 关闭态用可见区 DOM headings | 全文解析在大文档下持续开销高 | 始终解析全文 markdown | 用户关闭面板时只需要 rail，不需要完整 heading 列表 |

## Completion Summary

Completed: 2026-04-16
Duration: 4 steps
All acceptance criteria: PASS

Summary: 本轮继续深入压榨大 Markdown 的编辑路径性能。`RefinexEditor` 不再在每个 `docChanged` 事务里同步整文档序列化，而是改为 idle/debounce flush，并在保存与外部文档切换前显式 flush，兼顾性能和正确性；同时 overlay 刷新只在 selection / stored marks / 可见选区相关事务上触发，减少普通输入时的附属层抖动。`DocumentOutlineDock` 进一步改成关闭态走可见区 DOM heading rail、展开态才做全文 heading 提取，避免大文档每次内容同步都做整篇 heading 提取。最终相关测试、全量前端测试和构建全部通过。

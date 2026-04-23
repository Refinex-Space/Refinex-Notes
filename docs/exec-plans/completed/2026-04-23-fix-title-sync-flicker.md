# Fix Plan: Fix Title Sync Flicker During New File Naming

Created: 2026-04-23
Completed: 2026-04-23
Status: Completed
Author: agent
Type: fix

## Bug Brief

**Symptom**: 在目录树新建文件后，右侧编辑器输入一级标题时，每键入一个字符界面都会闪一次空白，然后文件名再更新，输入被明显打断。  
**Expected**: 用户应能连续输入标题，编辑器保持稳定；文件名只在用户短暂停顿后平滑同步为标题内容。  
**Affected scope**: `src/App.tsx`, `src/stores/noteStore.ts`, `src/stores/editorStore.ts`  
**Severity**: Degraded  
**Type**: Regression  
**Assumptions**:
- 当前闪屏发生在新建文件后的标题编辑链路，普通文档编辑不需要同步改名
- 现有延迟 hydration 机制仍然保留，本次只修复标题同步时机和路径迁移时的编辑器稳定性

## Reproduction

1. 在左侧目录树右键某个目录并点击“新建文件”。
2. 右侧打开默认 `# Undefined` 模板并自动选中标题。
3. 连续输入标题文本。
4. 观察：每输入一个字符都会触发一次路径重命名，编辑器短暂显示空白或重新挂载，然后文件名更新。

Reproduction evidence:
- 代码证据：`src/App.tsx` 在 `RefinexEditor.onChange` 中每次输入都直接调用 `maybeAutoRenameFileFromTitle(...)`
- 机制证据：编辑器实例和 hydration 状态都按 `document.path` 追踪，路径频繁变更会触发重新挂载

## Root Cause

**Mechanism**: 文件名同步逻辑直接绑定在每次 `onChange` 上，只要 H1 发生变化就立刻调用 `renameFile`。由于 `RefinexEditor`、`hydratedEditorPaths` 和当前活动文档都以路径为 key，路径每次变化都会把当前编辑器实例拆掉再建，导致闪白和输入阻断。  
**Why it wasn't caught**: 现有测试覆盖了“能否自动改名”，但没有覆盖“输入过程中不能反复 remount”的交互稳定性。

## Fix

**Strategy**:
- 将标题驱动重命名从“每次输入立即执行”改为“用户停顿后再执行”
- 改名发生时同步迁移 hydration / focus 等本地状态，避免再次落回空白壳层
- 补充针对标题同步辅助函数和 store 路径迁移的回归保护

**Files**:
- `src/App.tsx`
- `src/components/__tests__/app-shell-utils.test.ts`
- `src/stores/__tests__/workspace-state.test.ts`
- `docs/PLANS.md`

**Risk**:
- 延迟改名需要正确处理连续输入、路径已变更和多次定时器覆盖
- 路径迁移如果漏同步 hydration 集合，仍可能在最终改名时闪一次

## Verification Plan

- `npm test`
- `npm run build`
- `python3 scripts/check_harness.py`

## Implementation Summary

### Step 1: 建立 fix plan 并锁定根因

**Status:** ✅ Done  
**Evidence:**
- 将问题收敛为“标题输入期间的即时重命名导致编辑器按路径反复重挂载”
- 根因定位到 `src/App.tsx` 中 `onChange -> maybeAutoRenameFileFromTitle(...)` 的即时调用链

### Step 2: 将标题同步改为停顿后提交并迁移 hydration 状态

**Status:** ✅ Done  
**Evidence:**
- `src/App.tsx` 新增 `TITLE_SYNC_DEBOUNCE_MS = 320`，标题改名改为 debounce 调度
- 新增 `replacePathInSet(...)`，在路径切换时同步迁移 `hydratedEditorPaths`
- 改名时同步迁移 `pendingFocusEditorPathRef`，避免落回空白预览壳层

### Step 3: 补充回归保护并验证

**Status:** ✅ Done  
**Evidence:**
- `src/__tests__/App.test.ts` 新增路径集合迁移测试，锁定 hydration 路径迁移行为
- `npm test` 通过：39 files / 201 tests
- `npm run build` 通过
- `python3 scripts/check_harness.py` 通过

## Verification

- [x] `npm test`
- [x] `npm run build`
- [x] `python3 scripts/check_harness.py`

## Completion Summary

Completed: 2026-04-23  
Root cause: 标题驱动文件名同步被绑定在每次输入事件上，导致文档路径每输入一个字符就变化一次；而编辑器实例和 hydration 状态都按路径追踪，所以连续输入时会反复 remount，表现为闪白和阻断。  
Fix: 将自动重命名改为用户停顿后再提交，并在路径变更时同步迁移已 hydrated 的编辑器路径和待聚焦路径，避免重新掉回空白壳层。  
Regression tests: `src/__tests__/App.test.ts`

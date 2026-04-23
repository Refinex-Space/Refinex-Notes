# Fix Plan: Fix New File Flow With Typora-Style Tree Rename

Created: 2026-04-23
Completed: 2026-04-23
Status: Completed
Author: agent
Type: fix

## Bug Brief

**Symptom**: 当前目录树“新建文件”依然不顺滑。即使前一版把正文标题自动同步到文件名，用户在编辑器里输入标题时仍会感知到创建/同步阶段的交互中断。  
**Expected**: 目录树右键“新建文件”后，应像 Typora 一样在目标目录末尾插入一个可编辑文件名行，用户直接输入文件名并按回车后才真正创建 `.md` 文档并打开右侧页面；正文内容编辑不再承担文件名同步职责。  
**Affected scope**: `src/components/sidebar/FileTree.tsx`, `src/stores/noteStore.ts`, `src/App.tsx`, `src/components/sidebar/sidebar-utils.ts`, `src/components/app-shell-utils.ts`, `src/stores/editorStore.ts`, `src/types/*`  
**Severity**: Degraded  
**Type**: Regression / UX model mismatch  
**Assumptions**:
- 本次以 Typora 式目录树创建交互为准，撤销正文标题驱动文件名自动同步
- 文件可在输入文件名并按回车后再真正创建并打开；失焦或 `Esc` 取消草稿创建
- 输入文件名时允许省略 `.md`，系统统一补齐

## Reproduction

1. 在目录树里右键某个目录并点击“新建文件”。
2. 当前实现会直接创建 `Undefined.md` 并打开右侧编辑器。
3. 用户继续在正文里修改标题，系统尝试再把标题同步为文件名。
4. 观察：文件创建和文件名确定分散在两处交互里，整体不如 Typora 的树内直接命名流畅。

Reproduction evidence:
- `src/components/sidebar/FileTree.tsx` 当前右键“新建文件”直接调用 `createFileInDirectory(...)`
- `src/App.tsx` 当前仍保留正文标题到路径的自动同步逻辑

## Root Cause

**Mechanism**: 当前模型把“确定文件名”放在正文编辑阶段，而不是目录树创建阶段。这样一来，目录树和编辑器共同参与一次文件创建事务，交互职责分裂，任何同步都可能打断输入。  
**Why it wasn't caught**: 之前的修复围绕“让创建链路闭环”展开，但没有验证“文件名输入是否应该发生在目录树而不是正文编辑器”这一更上层的交互模型。

## Fix

**Strategy**:
- 将目录树“新建文件”改为插入一个末尾草稿行，直接在树中编辑文件名
- 回车时才创建最终 Markdown 文件并自动补 `.md`
- 删除正文标题驱动路径自动同步逻辑以及相关 editor 请求态
- 为路径规范化和目录树创建链路补回归测试

**Files**:
- `src/components/sidebar/FileTree.tsx`
- `src/components/sidebar/sidebar-utils.ts`
- `src/components/sidebar/__tests__/sidebar-utils.test.ts`
- `src/stores/noteStore.ts`
- `src/stores/__tests__/workspace-state.test.ts`
- `src/App.tsx`
- `src/__tests__/App.test.ts`
- `src/components/app-shell-utils.ts`
- `src/components/__tests__/app-shell-utils.test.ts`
- `src/stores/editorStore.ts`
- `src/types/editor.ts`
- `src/types/notes.ts`
- `docs/PLANS.md`

**Risk**:
- 目录树草稿行需要保证在目标目录内稳定显示，尤其是目录原本处于折叠状态时
- 取消自动改名后，要避免遗留的 pending selection / rename helper 造成状态漂移

## Verification Plan

- `npm test`
- `npm run build`
- `python3 scripts/check_harness.py`

## Implementation Summary

### Step 1: 确认交互模型改为目录树内命名

**Status:** ✅ Done  
**Evidence:**
- 放弃正文标题驱动文件名自动同步
- 将创建职责收敛到目录树中的单一输入态

### Step 2: 重构目录树与 store 创建链路

**Status:** ✅ Done  
**Evidence:**
- `src/components/sidebar/FileTree.tsx` 新增目录树末尾草稿输入行，支持回车提交和 `Esc` / 失焦取消
- 折叠目录发起新建时会自动展开，保证输入行可见
- `src/stores/noteStore.ts` 的 `createFileInDirectory` 支持显式文件名，并自动补齐 `.md`
- `src/App.tsx` 删除正文标题自动改名链路，避免编辑器侧路径重命名

### Step 3: 补回归测试并验证

**Status:** ✅ Done  
**Evidence:**
- `src/components/sidebar/__tests__/FileTree.test.tsx` 新增目录树草稿输入与回车提交测试
- `src/stores/__tests__/workspace-state.test.ts` 新增可选 `.md` 扩展名归一化测试
- `src/components/__tests__/app-shell-utils.test.ts` 新增 Markdown basename 规范化测试
- `npm test` 通过：39 files / 195 tests
- `npm run build` 通过
- `python3 scripts/check_harness.py` 通过

## Verification

- [x] `npm test`
- [x] `npm run build`
- [x] `python3 scripts/check_harness.py`

## Completion Summary

Completed: 2026-04-23  
Root cause: 旧方案把“文件创建”和“文件名确定”拆到了目录树和正文编辑器两处，导致正文输入阶段仍需承担路径同步职责，交互天然不流畅。  
Fix: 将新建文件改为 Typora 式目录树内命名流。右键后只插入一个末尾输入行，用户输入文件名并回车后才真正创建并打开 `.md` 文档；正文侧不再自动改文件名。  
Regression tests: `src/components/sidebar/__tests__/FileTree.test.tsx`, `src/stores/__tests__/workspace-state.test.ts`, `src/components/__tests__/app-shell-utils.test.ts`

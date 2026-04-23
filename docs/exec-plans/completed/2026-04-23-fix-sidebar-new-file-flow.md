# Fix Plan: Fix Sidebar New File Flow

Created: 2026-04-23
Completed: 2026-04-23
Status: Completed
Author: agent
Type: fix

## Bug Brief

**Symptom**: 左侧目录树右键目录后点击“新建文件”没有任何反应，用户无法从目录树直接创建新文档。  
**Expected**: 右键目录后点击“新建文件”应立即在该目录下创建一个新的 Markdown 文档，文件以占位名出现在目录树末尾并自动在右侧打开；文档内容起始即为 H1 标题输入态，用户输入标题后文件名应自动同步。  
**Affected scope**: `src/components/sidebar/FileTree.tsx`, `src/stores/noteStore.ts`, `src/App.tsx`, `src/components/sidebar/sidebar-utils.ts`, `src/components/app-shell-utils.ts`  
**Severity**: Degraded  
**Type**: Regression  
**Assumptions**:
- 当前桌面运行环境是 Tauri WebView，`window.prompt` 不是可靠的新建文件交互
- 本次只修复“目录树新建文件”闭环，不顺手重做目录树其他右键项

## Reproduction

1. 打开任意工作区并在左侧目录树中右键一个目录。
2. 点击“新建文件”。
3. 观察：当前实现依赖 `window.prompt("新建文件路径", ...)` 先索取路径，桌面端实际交互中没有形成有效文件创建闭环，用户表现为“没有任何反应”。

Reproduction evidence:
- 代码证据：`src/components/sidebar/FileTree.tsx` 的新建文件项直接调用 `window.prompt(...)`
- 行为证据：真实工作区 `src/stores/noteStore.ts#createFile` 创建的是空文件，不会落 `# ` 模板，也没有标题驱动的文件名同步

## Root Cause

**Mechanism**: 目录树“新建文件”把路径输入这一步外包给 `window.prompt`，导致桌面端新建动作没有稳定的应用内交互链路；即使路径输入成功，真实工作区新建逻辑也只会创建空文件，没有实现 Notion 风格的标题起手和文件名自动同步。  
**Why it wasn't caught**: 现有测试只覆盖了 store 的通用 create/rename/delete 行为，没有覆盖目录树右键创建路径，也没有覆盖“新建文档立即进入 H1 标题编辑态”的交互。

## Fix

**Strategy**:
- 去掉目录树右键“新建文件”对 `window.prompt` 的依赖，直接在目标目录生成唯一的 `Undefined*.md`
- 统一 `createFile` 在真实工作区和 mock 工作区都写入标题模板内容，并立即打开
- 在编辑内容变更时提取唯一 H1，自动把文件名同步为标题文本
- 为新建文档注入初始标题选择态，让用户输入直接覆盖默认标题文本

**Files**:
- `src/components/sidebar/FileTree.tsx`
- `src/components/sidebar/sidebar-utils.ts`
- `src/components/app-shell-utils.ts`
- `src/stores/editorStore.ts`
- `src/stores/noteStore.ts`
- `src/types/editor.ts`
- `src/types/notes.ts`
- `src/App.tsx`
- `src/components/__tests__/app-shell-utils.test.ts`
- `src/components/sidebar/__tests__/sidebar-utils.test.ts`
- `src/stores/__tests__/workspace-state.test.ts`

**Risk**:
- 自动重命名会触发频繁路径变更，需要同步 editor store 的 dirty / activeTab / 待选择路径
- 新建文件立即进入编辑态会和现有延迟 hydration 机制冲突，需要显式请求立即 hydration

## Implementation Summary

### Step 1: 建立 fix plan

**Status:** ✅ Done  
**Evidence:** 已创建 fix plan 并登记到 `docs/PLANS.md`

### Step 2: 修复目录树新建文件闭环

**Status:** ✅ Done  
**Evidence:**
- `FileTree` 右键“新建文件”不再使用 `window.prompt`，改为直接调用 store 动作
- `noteStore.createFileInDirectory` 会在目标目录生成唯一 `Undefined*.md`
- `noteStore.createFile` 在真实工作区和 mock 工作区都写入 `# <文件名>\n\n`
- 占位文件在树排序中被压到同级文件末尾，符合“新建后出现在下方”的交互预期

### Step 3: 接入 H1 驱动重命名与初始标题选择

**Status:** ✅ Done  
**Evidence:**
- `App` 在编辑器 `onChange` 中提取唯一 H1，并自动把文件名同步为标题
- `editorStore` 增加 `pendingTitleSelectionPath`，新建文件会立即进入 hydrated editor，并选中默认标题文本
- `noteStore.renameFile` 会同步 editor store 的 active tab、dirty set 和待选择路径，避免标题改名后状态漂移

### Step 4: 回归测试与验证

**Status:** ✅ Done  
**Evidence:**
- `src/components/__tests__/app-shell-utils.test.ts` 新增标题同步路径与 H1 选择范围测试
- `src/components/sidebar/__tests__/sidebar-utils.test.ts` 更新默认新建文件名断言
- `src/stores/__tests__/workspace-state.test.ts` 新增目录内 `Undefined*.md` 创建与 editor store 路径同步测试
- `npm test` 通过：39 files / 199 tests
- `npm run build` 通过
- `python3 scripts/check_harness.py` 通过

## Verification

- [x] `npm test`
- [x] `npm run build`
- [x] `python3 scripts/check_harness.py`

## Completion Summary

Completed: 2026-04-23  
Root cause: 目录树新建文件依赖 `window.prompt`，而真实工作区创建逻辑又只会创建空文件，导致桌面端没有稳定的新建文档交互闭环。  
Fix: 目录树右键新建文件改为直接创建唯一 `Undefined*.md`，新文档自动写入 H1 模板、立即进入标题编辑态，并在用户编辑唯一 H1 时自动同步文件名。  
Regression tests: `src/components/__tests__/app-shell-utils.test.ts`, `src/components/sidebar/__tests__/sidebar-utils.test.ts`, `src/stores/__tests__/workspace-state.test.ts`

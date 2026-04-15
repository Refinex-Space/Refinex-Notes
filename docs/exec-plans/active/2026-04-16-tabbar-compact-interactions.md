# Execution Plan: TabBar Compact Interactions

Created: 2026-04-16
Status: Active
Author: agent

## Objective

将顶部文档 Tab 改造成更紧凑、低噪音的工作区轨道，并补齐顺滑切换、拖拽排序与右键批量关闭交互。

## Scope

**In scope:**
- `src/components/editor/TabBar.tsx`
- `src/components/ui/tabs.tsx`
- `src/stores/noteStore.ts`
- `src/types/notes.ts`
- `src/stores/__tests__/workspace-state.test.ts`
- `src/components/layout/AppLayout.tsx`
- `src/components/layout/__tests__/AppLayout.test.tsx`
- `src/components/editor/__tests__/TabBar.test.tsx`

**Out of scope:**
- 编辑器正文与文档渲染逻辑
- 左侧文件树、右侧面板与全局主题系统
- 与本任务无关的 `DocumentOutlineDock` 现有未提交改动

## Constraints

- 遵守 `src/AGENTS.md`，在既有 `components/ui`、`components/editor`、`stores` 分层内增量实现，不引入新的并行架构。
- 维持当前 Calm product UI 方向：Tab 轨道不是主视觉焦点，正文区域优先。
- 优先使用现有 Radix/Tailwind/ContextMenu 组合；拖拽使用浏览器原生 DnD 即可，不引入额外依赖。

## Acceptance Criteria

- [ ] AC-1: 顶部 Tab 轨道视觉高度和标签内边距明显收紧，激活态与 hover 保持低噪音，正文仍是主视觉。
- [ ] AC-2: Tab 支持拖拽排序，并在拖拽目标处提供清晰但克制的占位/插入反馈。
- [ ] AC-3: 右键某个 Tab 时可选择关闭全部、关闭其他、关闭左侧、关闭右侧，并正确更新当前打开文件状态。
- [ ] AC-4: 与本任务相关的测试和构建继续通过；若全量 `npm test` 失败，失败原因必须明确归因到工作树中与本任务无关的现有改动。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 拖拽排序只改组件局部状态，刷新后顺序不稳定 | Med | 把排序能力下沉到 `noteStore`，由 store 持有 `openFiles` 顺序 |
| 右键菜单批量关闭后 `currentFile` / `activeTab` 不一致 | Med | 统一通过 store 动作更新 `currentFile`，组件在操作后同步 `activeTab` |
| 压缩高度过度影响关闭按钮命中面积 | Med | 保持 close affordance 可点击面积，减少外层 chrome 而不是把图标压得过小 |
| 全量测试被无关脏改动打断导致无法宣称完成 | High | 记录相关基线；优先跑相关测试和构建，并在计划中保留对无关阻塞的说明 |

## Implementation Steps

### Step 1: 登记 TabBar 重构计划

**Files:** `docs/exec-plans/active/2026-04-16-tabbar-compact-interactions.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: ✅ Done
Evidence: 新计划文件已创建，`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations:

### Step 2: 扩展 tab 状态动作

**Files:** `src/types/notes.ts`, `src/stores/noteStore.ts`, `src/stores/__tests__/workspace-state.test.ts`
**Verification:** store 测试覆盖拖拽排序与批量关闭场景

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 重构紧凑 Tab 轨道与交互

**Files:** `src/components/editor/TabBar.tsx`, `src/components/ui/tabs.tsx`, `src/components/layout/AppLayout.tsx`, `src/components/layout/__tests__/AppLayout.test.tsx`, `src/components/editor/__tests__/TabBar.test.tsx`
**Verification:** Tab 静态渲染与布局测试通过，代码具备拖拽反馈与右键菜单入口

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: 完成相关验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-tabbar-compact-interactions.md`, `docs/PLANS.md`
**Verification:** 相关 Vitest 用例与 `npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 | 方向锁定为 A4 / B3 / C2 / D1 |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |
| 4 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 采用技术型、密集、轻动效的紧凑标签轨道 | 用户明确要求低视觉冲突与更紧凑 | 浏览器式高强调标签、IDE 极弱边界 | 当前产品更适合低噪音、高密度工作区控件 |
| 拖拽排序使用原生 DnD | 仅需桌面环境下的 Tab 轨道排序 | 引入第三方拖拽库 | 原生方案足够，依赖和风险更低 |

## Completion Summary

Completed:
Duration: 4 steps
All acceptance criteria: PASS / FAIL

Summary:

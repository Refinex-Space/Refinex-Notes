# Execution Plan: Sidebar Tree Density

Created: 2026-04-16
Status: Active
Author: agent

## Objective

收紧左侧边栏文件树中目录项与文档项的垂直间距，让列表更紧凑，同时保持既有交互、层级缩进和视觉语言不变。

## Scope

**In scope:**
- `src/components/sidebar/FileTree.tsx`
- `src/components/sidebar/__tests__/FileTree.test.tsx`

**Out of scope:**
- `src/components/layout/AppLayout.tsx` 的面板骨架与宽度逻辑
- 侧边栏字体、图标体系、层级缩进算法和 Git 状态语义

## Constraints

- 遵守 `src/AGENTS.md` 的前端边界，在 `src/components/sidebar/` 内做最小改动。
- 保持 `src/components/ui/` 既有 Accordion / ContextMenu 组合方式，不引入新的并行抽象。
- 不把文件树展示逻辑下沉到 store 或 service；本次仅调整展示密度和对应验证。

## Acceptance Criteria

- [ ] AC-1: `src/components/sidebar/FileTree.tsx` 中树节点的垂直内边距、行高或节点间距被收紧，目录与文件列表在视觉上比当前更紧凑。
- [ ] AC-2: 目录折叠默认行为、文件节点渲染和空状态文案保持不变，相关 Vitest 用例继续通过。
- [ ] AC-3: `npm test` 与 `npm run build` 在改动后继续通过，且不需要调整整体布局组件。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 间距压缩过度导致点击热区偏小 | Med | 保留按钮高度与圆角，只收紧垂直节奏，不压缩到低于当前图标尺寸 |
| Accordion 内容区的额外 spacing 被遗漏，视觉改善不明显 | Med | 同步检查根节点容器、目录触发器和子节点容器三个层级 |
| 纯样式改动缺少回归锚点 | Low | 增加静态 markup 断言，锁定关键 class 组合 |

## Implementation Steps

### Step 1: 记录并登记侧边栏密度调整计划

**Files:** `docs/exec-plans/active/2026-04-16-sidebar-tree-density.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: ✅ Done
Evidence: 新计划文件已创建，`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations:

### Step 2: 收紧文件树节点纵向节奏

**Files:** `src/components/sidebar/FileTree.tsx`
**Verification:** 静态代码检查确认根节点容器、目录触发器、文件按钮与子节点容器的纵向 spacing 被收紧

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 补充回归断言并验证前端基线

**Files:** `src/components/sidebar/__tests__/FileTree.test.tsx`
**Verification:** `npm test`、`npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 | 无 |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 仅调整 `FileTree.tsx` 与对应测试 | 用户反馈集中在左侧树节点密度 | 改 `AppLayout.tsx`、改全局 token | 问题落点在树节点局部 spacing，最小改动即可解决 |

## Completion Summary

Completed:
Duration: 3 steps
All acceptance criteria: PASS / FAIL

Summary:

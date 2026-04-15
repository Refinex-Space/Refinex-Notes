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

- [x] AC-1: `src/components/sidebar/FileTree.tsx` 中树节点的垂直内边距、行高或节点间距被收紧，目录与文件列表在视觉上比当前更紧凑。
- [x] AC-2: 目录折叠默认行为、文件节点渲染和空状态文案保持不变，相关 Vitest 用例继续通过。
- [x] AC-3: `npm test` 与 `npm run build` 在改动后继续通过，且不需要调整整体布局组件。

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

Status: ✅ Done
Evidence: `FileTreeNodes` 根容器由 `space-y-px` 调整为 `space-y-0.5`；目录触发器与文件按钮均由 `py-1.5 leading-5` 调整为 `py-1 leading-[1.1rem]`；目录内容容器由 `space-y-px pt-0.5` 调整为 `space-y-0 pt-px`。
Deviations: 测试断言与样式调整一起进入实现提交，Step 3 仅保留验证和证据记录。

### Step 3: 补充回归断言并验证前端基线

**Files:** `src/components/sidebar/__tests__/FileTree.test.tsx`
**Verification:** `npm test`、`npm run build`

Status: ✅ Done
Evidence: `npm test` 通过，结果为 20 个测试文件、107 个断言全部通过；`npm run build` 通过，Vite 生产构建成功。
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 | 无 |
| 2 | ✅ | `FileTree.tsx` 四处纵向 spacing 已收紧 | 保持缩进、图标与交互不变 |
| 3 | ✅ | `npm test` 20/20 文件通过，`npm run build` 成功 | 新增紧凑样式静态断言 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 仅调整 `FileTree.tsx` 与对应测试 | 用户反馈集中在左侧树节点密度 | 改 `AppLayout.tsx`、改全局 token | 问题落点在树节点局部 spacing，最小改动即可解决 |
| 维持 Accordion 默认交互，仅覆盖树节点局部 class | `AccordionTrigger` 自带较宽松基础样式 | 改 ui 层 Accordion 基础组件 | 基础组件会影响其他面板，局部覆盖更安全 |

## Completion Summary

Completed: 2026-04-16
Duration: 3 steps
All acceptance criteria: PASS

Summary: 本次工作只收紧了左侧文件树的局部纵向节奏，没有改动面板骨架或层级缩进。实现上压缩了目录 trigger、文件按钮、子节点容器和根节点容器的 spacing，并补充了静态回归断言。最终前端测试与生产构建均保持通过，满足用户对列表更紧凑的目标。

# Execution Plan: Sidebar Action Icons

Created: 2026-04-15
Completed: 2026-04-15
Status: Completed
Author: agent

## Objective

将左侧边栏顶部的“打开项目”和“搜索项目”从大面积文字卡片收敛为右上角双图标动作区，并通过 Radix Tooltip 提供悬浮说明，让侧栏层级更接近专业桌面应用的导航结构。

## Scope

**In scope:**
- `src/App.tsx`
- `src/components/sidebar/SearchPanel.tsx`
- `src/components/sidebar/__tests__/SearchPanel.test.tsx`
- `docs/PLANS.md`
- 本执行计划文档

**Out of scope:**
- 右侧 Git 面板样式或交互重构
- 搜索弹窗内部结果布局的大范围视觉重做
- 文件树、Outline 面板的数据结构调整

## Constraints

- 侧栏动作必须复用现有 `src/components/ui/tooltip.tsx` 的 Radix Tooltip 封装，不新增平行提示组件。
- 搜索能力仍只能经由 `SearchPanel` 与 `searchService` 进入，不把搜索弹窗逻辑内联回 `App.tsx`。
- 改动应遵循现有产品 UI 约束：减少卡片化、减少装饰性 chrome、维持清晰层级和可访问性。

## Acceptance Criteria

- [x] AC-1: 左侧边栏顶部不再展示“打开项目”“搜索项目”两张文字卡片，而是收敛为右上角两个图标按钮。
- [x] AC-2: 两个图标按钮 hover 时都会通过 Radix Tooltip 显示作用说明，且按钮本身具备可访问的 `aria-label`。
- [x] AC-3: `SearchPanel` 只负责搜索弹窗与结果逻辑，可接受外部自定义 trigger。
- [x] AC-4: `npm test` 与 `npm run build` 在改造后保持通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Dialog trigger 与 Tooltip 叠加后破坏按钮语义 | Med | 使用 Radix 官方推荐的 `asChild` 组合方式，并保留原生 `button` 作为最终触发元素 |
| 移除搜索卡片后文件树头部层级失衡 | Low | 保留侧栏顶部项目元信息，搜索与打开项目仅作为 action zone 收敛到右上角 |
| SearchPanel 测试仍依赖旧卡片文案 | Low | 将测试改为验证自定义 trigger 渲染和辅助函数行为，而不是旧视觉文案 |

## Implementation Steps

### Step 1: 建立控制面计划并锁定改造范围

**Files:** `docs/exec-plans/completed/2026-04-15-sidebar-action-icons.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` 已登记

Status: ✅ Done
Evidence: 新增执行计划并完成归档，`docs/PLANS.md` 已反映该任务完成状态。

### Step 2: 重构侧栏顶部为图标动作区

**Files:** `src/App.tsx`, `src/components/sidebar/SearchPanel.tsx`
**Verification:** `npm run build`

Status: ✅ Done
Evidence: 左侧边栏顶部改为项目元信息 + 右上角双图标动作区；`SearchPanel` 支持外部 trigger 并内建 Tooltip 组合，`npm run build` 通过。
Deviations: `SearchPanel` 额外内聚了 `TooltipProvider`，避免组件脱离外层 provider 时渲染失败。

### Step 3: 更新搜索触发器测试并完成回归验证

**Files:** `src/components/sidebar/__tests__/SearchPanel.test.tsx`
**Verification:** `npm test && npm run build`

Status: ✅ Done
Evidence: `npm test` 17/17 文件、94/94 用例通过；`npm run build` 通过，仅保留既有 chunk size warning。

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件已创建并归档 | 任务范围锁定在侧栏头部、搜索触发器和测试 |
| 2 | ✅ | `npm run build` 通过 | 大卡片入口已收敛为右上角图标动作区 |
| 3 | ✅ | `npm test` 94/94、`npm run build` 通过 | 修复了 SearchPanel 对外层 `TooltipProvider` 的隐式依赖 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 搜索入口改为外部传入 trigger | 需要把大卡片触发器收敛到侧栏头部图标区 | 在 `App.tsx` 内重写整套搜索弹窗 | 保持 `SearchPanel` 继续拥有搜索逻辑，只暴露触发器定制能力 |
| `SearchPanel` 内部补齐 `TooltipProvider` | 独立测试暴露出组件依赖外层 provider | 强制所有调用方自行包一层 provider | 让组件复用更稳健，避免隐藏依赖 |
| 侧栏顶部保留项目元信息、压缩动作为图标区 | 用户要求“两个图标，不要文字展示”，但侧栏仍需传达当前工作区状态 | 完全去掉项目说明或保留原大按钮文案 | 既压缩 chrome，又保留 3 秒可识别的导航上下文 |

## Completion Summary

Summary: 已完成左侧边栏动作区收敛。原先独立占位的“打开项目”“搜索项目”大卡片已移除，顶部改为项目元信息 + 右上角双图标按钮，两个入口都带有 Radix Tooltip 和 `aria-label`；`SearchPanel` 被改造成可复用的外部 trigger 模式，并通过组件内置 `TooltipProvider` 修复了独立渲染时报错的问题。验证结果为 `npm test` 94/94 通过、`npm run build` 通过。

# Execution Plan: Floating Outline Dock

Created: 2026-04-15
Completed: 2026-04-15
Status: Completed
Author: agent

## Objective

移除左侧边栏底部的 `Outline` 区块，并将活跃文档目录改为编辑区右侧中部的 Notion 风格悬浮 rail：默认只显示细小圆角横线，hover 或 focus 时从左侧浮出目录面板。

## Scope

**In scope:**
- `src/App.tsx`
- `src/components/editor/`
- `src/components/sidebar/__tests__/`
- `src/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/PLANS.md`
- 本执行计划文档

**Out of scope:**
- 左侧文件树结构或搜索弹窗内部重构
- 编辑器底层 schema / selection 行为调整
- 右侧 Git 面板布局变更

## Constraints

- 左侧栏不再承担活跃文档目录职责，目录必须只存在于编辑区右侧悬浮入口。
- 目录浮层需要保持键盘可访问，不能做成纯 hover 且不可 focus 的装饰元素。
- 不新增新的原生依赖；优先复用现有 React/Tailwind/Radix 基础设施。
- 实际运行结构变化后，控制面文档必须同步更新，不保留 `OutlinePanel` 仍在侧栏中的过时描述。

## Acceptance Criteria

- [x] AC-1: 左侧边栏不再渲染 `Outline` 区块。
- [x] AC-2: 当前文档有标题时，编辑区右侧中部出现细横线 rail；hover / focus 时浮出目录面板。
- [x] AC-3: 点击浮层目录项仍能跳转到对应标题。
- [x] AC-4: `npm test` 与 `npm run build` 保持通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| 悬浮浮层遮挡编辑区操作或难以 hover 进入 | Med | 用一个包含 trigger + panel 的 group 容器，默认紧贴右侧，panel 向左展开 |
| 纯视觉 rail 在没有标题时造成误导 | Low | 无标题时直接不渲染 dock |
| 控制面文档仍描述旧的 OutlinePanel 布局 | Med | 本次改动同步更新 `src/AGENTS.md` 和 `docs/ARCHITECTURE.md` |

## Implementation Steps

### Step 1: 创建计划并登记任务

**Files:** `docs/exec-plans/completed/2026-04-15-floating-outline-dock.md`, `docs/PLANS.md`
**Verification:** Active plan 已登记

Status: ✅ Done
Evidence: 执行计划已创建并完成归档，`docs/PLANS.md` 反映该任务已完成。

### Step 2: 实现编辑区悬浮目录 dock 并移除侧栏目录

**Files:** `src/App.tsx`, `src/components/editor/DocumentOutlineDock.tsx`
**Verification:** `npm run build`

Status: ✅ Done
Evidence: 侧栏 `Outline` 区块已删除；编辑区右侧新增中部 rail，hover / focus 时会浮出“阅读指引”目录面板；`npm run build` 通过。

### Step 3: 补充测试并同步控制面文档

**Files:** `src/components/editor/__tests__/DocumentOutlineDock.test.tsx`, `src/AGENTS.md`, `docs/ARCHITECTURE.md`
**Verification:** `npm test`

Status: ✅ Done
Evidence: 新增 `DocumentOutlineDock` 测试后，`npm test` 结果为 18/18 文件、97/97 用例通过；控制面文档已更新为浮动目录结构。

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件已创建并归档 | 本轮任务范围锁定为目录位置重构与控制面同步 |
| 2 | ✅ | `npm run build` 通过 | 目录从侧栏移到编辑区右侧悬浮 dock |
| 3 | ✅ | `npm test` 97/97 通过 | 新增 dock 测试并更新 `src/AGENTS.md`、`docs/ARCHITECTURE.md` |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 目录 dock 放在编辑区外层相对容器，而不是滚动内容内部 | 需要目录入口固定在可视区域右侧中部，不跟随正文滚动漂移 | 直接叠在滚动容器内 | 外层定位能让 rail 保持稳定位置，更接近 Notion 的使用感受 |
| 使用 group hover / focus-within 浮出目录，而不是 click-only popover | 用户明确要求 hover 浮层，且需要兼顾键盘可访问性 | 只做点击 Popover、或只做纯 CSS hover | `hover + focus-within` 同时满足鼠标与键盘场景 |
| 细横线 rail 对长目录做抽样压缩 | 标题很多时一比一渲染会让 rail 过高且噪声大 | 所有标题都渲染为 trigger 线条 | 保持右侧入口紧凑，同时浮层内仍展示完整目录 |

## Completion Summary

Summary: 已完成目录位置重构。左侧边栏底部 `Outline` 区块已删除，活跃文档目录改为编辑区右侧中部的悬浮 rail；默认显示为一列小圆角横线，hover 或 focus 时向左浮出“阅读指引”面板，点击目录项仍复用现有标题跳转逻辑。控制面文档已同步更新，验证结果为 `npm test` 97/97 通过、`npm run build` 通过。

# Feature Plan: Notion-Style Selection Toolbar

Created: 2026-04-23
Completed: 2026-04-23
Status: Completed
Author: agent
Type: feature

## Task Brief

**Objective**: 将编辑器选中文本后的浮动工具条重构为接近 Notion 的紧凑布局，统一按钮顺序、tooltip、分组层级与更多菜单形态，同时保留现有链接与 AI Skill 工作流。
**Scope**: `src/editor/ui/FloatingToolbar.tsx`、共享编辑器命令 helper、`SkillPicker` 触发器样式扩展、工具条 DOM 回归测试，以及 `docs/PLANS.md`
**Non-scope**: 不引入完整的数学公式渲染系统，不新增 native/Tauri 侧能力，不重写整个 Slash 菜单系统
**Constraints**:
- 复用现有 `SlashMenu` / `LinkPopover` / `SkillPicker` / `skillService` 机制，不新建平行浮层架构
- 保持 `src/editor/` 负责编辑器模型与 UI，避免把编辑器逻辑泄漏到页面组件
- diff 聚焦工具条、共享命令复用和回归测试
**Assumptions**:
- 本次优先解决“工具条的专业度、布局与密度”，而不是一次性补齐颜色/公式的完整 Markdown 持久化链路

## Acceptance Criteria

1. 选区工具条顺序调整为接近 Notion：转换成文本、文本颜色、加粗、斜体、下划线、添加链接、删除线、标记为代码、标记为公式、更多、技能
2. 工具条视觉收敛为更紧凑的单行分组样式：统一高度、按钮尺寸、分隔线、hover/active 态、tooltip 文案
3. `更多` 菜单视觉形态与现有 `/` 菜单一致，并复用已有块级命令执行逻辑
4. 现有可用动作（文本、加粗、斜体、链接、删除线、代码、技能）保持可用
5. 新增回归测试覆盖工具条顺序与 `更多` 菜单打开行为
6. `npm test`、`npm run build`、`python3 scripts/check_harness.py` 通过

## Implementation Summary

### Step 1: 登记执行计划

**Files:** `docs/exec-plans/active/2026-04-23-notion-selection-toolbar.md`, `docs/PLANS.md`
**Status:** ✅ Done
**Evidence:** 已建立 active plan，并登记到 `docs/PLANS.md`

### Step 2: 重构选区工具条与更多菜单

**Files:** `src/editor/ui/FloatingToolbar.tsx`, `src/editor/rich-ui.ts`, `src/components/ai/SkillPicker.tsx`
**Status:** ✅ Done
**Evidence:**
- `FloatingToolbar` 改为单行紧凑分组，按钮顺序与 Notion 描述一致
- 所有主动作都补上了 tooltip，`更多` 使用 `Command + Popover` 复用 Slash 菜单的视觉语言
- `executeSlashCommand` 允许在没有 slash trigger 的情况下直接执行块级命令，工具条三点菜单与 `/` 菜单走同一条执行链
- `SkillPicker` 增加触发器/内容样式扩展，允许在工具条中收敛成与主按钮同密度的“技能”入口
- 对当前尚未具备完整 Markdown 持久化语义的“文本颜色 / 下划线 / 公式”，提供了与 Notion 对齐的入口层级与明确状态说明，避免伪造已支持能力

### Step 3: 增加回归测试并完成验证

**Files:** `src/editor/__tests__/FloatingToolbar.test.tsx`
**Status:** ✅ Done
**Evidence:**
- 新增 DOM 回归测试，锁定工具条按钮顺序
- 新增 DOM 回归测试，锁定 `更多` 菜单会打开 slash 风格列表并调用共享命令执行器
- `npm test` 通过：39 test files / 193 tests
- `npm run build` 通过
- `python3 scripts/check_harness.py` 通过

## Risks And Decisions

| Decision | Reason | Alternative rejected |
| -------- | ------ | -------------------- |
| 颜色/下划线/公式这次只补入口与状态说明，不做半成品持久化 | 当前 Markdown 往返链路没有完整语义支持，硬做会导致“看起来能点，保存后丢失” | 直接做假按钮或临时 DOM 样式 |
| 让三点菜单复用 `executeSlashCommand` | 避免 Slash 菜单和工具条菜单后续分叉 | 在 `FloatingToolbar` 内再复制一套块级命令执行逻辑 |
| 通过 `SkillPicker` 样式扩展融入工具条 | 复用现有 Skill 数据流，减少行为回归面 | 另写一套仅供工具条使用的 Skill 弹层 |

## Verification

- [x] `npm test`
- [x] `npm run build`
- [x] `python3 scripts/check_harness.py`

## Completion Summary

Completed: 2026-04-23
Summary: 选区工具条已从原来的“5 个孤立图标 + AI 按钮”重构为更接近 Notion 的紧凑单排工具条：按钮顺序、分组、tooltip 和更多菜单层级都已收敛。三点菜单现在与 `/` 菜单共享同一命令执行链和视觉语言；技能入口也被压缩进同一工具条密度。对于当前编辑器尚未具备完整 Markdown 语义支持的颜色 / 下划线 / 公式，本次没有伪造成功能，而是保留与 Notion 一致的入口并给出明确状态说明。全量前端测试、构建和 Harness 校验均通过。

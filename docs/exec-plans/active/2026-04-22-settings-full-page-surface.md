# Execution Plan: Settings Full-Page Surface

Created: 2026-04-22
Status: Active
Author: agent

## Objective

把当前基于 `Dialog` 的设置面板改为应用壳层内的全页面设置视图，使设置成为工作区的一类主 surface，而不是悬浮模态。

## Scope

**In scope:**
- `src/App.tsx`
- `src/components/settings/SettingsDialog.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/components/CommandPalette.tsx`
- 与设置 surface 切换直接相关的前端测试
- `docs/ARCHITECTURE.md`
- `docs/OBSERVABILITY.md`
- `docs/PLANS.md`

**Out of scope:**
- 设置内容分区的重设计
- Rust settings / AI 配置协议变更
- 新增路由系统或独立窗口
- 新的设置 store / service

## Constraints

- 继续复用现有 `settingsStore` 和各设置分区组件，不创建并行设置体系
- 设置入口仍保留在现有标题栏按钮和命令面板中
- “全页面”限定为应用窗口内部的主内容切换，不打开新窗口
- 改动要以移除模态语义、切到壳层 surface 为主，不重写设置表单内容

## Acceptance Criteria

- [ ] AC-1: 点击标题栏设置按钮或命令面板“打开设置”时，不再出现 `Dialog` 模态，而是切换到应用内全页面设置视图
- [ ] AC-2: 设置视图保留现有左侧分类与右侧内容，关闭后返回工作区主视图
- [ ] AC-3: 设置视图中加载、保存、错误展示与原有 `settingsStore` 行为保持可用
- [ ] AC-4: `npm test -- --run` 与 `npm run build` 通过

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| 直接把设置内容塞进 `AppLayout` 可能破坏现有右侧面板和 tab 区布局 | Med | 在 `AppLayout` 增加明确的全页面 content seam，而不是在局部区域硬切 |
| 移除 `Dialog` 后设置加载时机可能丢失 | Med | 将“进入设置 surface 时触发 loadSettings”保留在设置容器组件内部 |
| 命令面板和标题栏入口若各自维护状态，容易再次分叉 | Low | 在 `App.tsx` 统一维护 surface 状态，两个入口只发同一个切换动作 |

## Implementation Steps

### Step 1: 建立全页面设置 surface 的执行计划与入口状态

**Files:** `docs/exec-plans/active/2026-04-22-settings-full-page-surface.md`, `docs/PLANS.md`
**Verification:** `git diff -- docs/PLANS.md docs/exec-plans/active/2026-04-22-settings-full-page-surface.md`

Status: ⏳ In Progress

### Step 2: 将壳层从 modal settings 切换为 app surface

**Files:** `src/App.tsx`, `src/components/layout/AppLayout.tsx`, `src/components/CommandPalette.tsx`
**Verification:** `npm test -- --run`

Status: ⏳ Pending

### Step 3: 去除设置页 Dialog 语义并保留现有设置交互

**Files:** `src/components/settings/SettingsDialog.tsx`, 与其相关测试文件
**Verification:** `npm test -- --run`; `npm run build`

Status: ⏳ Pending

### Step 4: 同步控制面并归档

**Files:** `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`, `docs/PLANS.md`, `docs/exec-plans/active/2026-04-22-settings-full-page-surface.md`
**Verification:** `npm test -- --run`; `npm run build`

Status: ⏳ Pending

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ⏳ | 待记录 | 新建计划并登记到 `docs/PLANS.md` |
| 2 | ⏳ | 待记录 | 壳层状态统一为 app-level settings surface |
| 3 | ⏳ | 待记录 | 设置容器移除 `Dialog` 语义 |
| 4 | ⏳ | 待记录 | 控制面同步并归档 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 保留 `SettingsDialog.tsx` 文件名但移除 Dialog 语义 | 当前仓库已在多处引用该组件 | 重命名为 `SettingsPage.tsx` 并同步大范围引用 | 先保持 diff 外科手术式，优先调整承载层而不是扩散重命名 |


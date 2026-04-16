# Execution Plan: Instant Preview Editor Hydration

Created: 2026-04-16
Status: Active
Author: agent

## Objective

把文档“打开可见时间”与“完整编辑器水合时间”拆开：先在 `<50ms` 内展示轻量预览，再后台或按交互水合 ProseMirror 编辑器。

## Scope

**In scope:**
- `src/App.tsx`
- `src/editor/RefinexEditor.tsx`
- `docs/exec-plans/active/2026-04-16-instant-preview-editor-hydration.md`
- `docs/PLANS.md`

**Out of scope:**
- 重写原生文件读取或内容缓存
- 全量 Markdown 预览引擎
- 非当前文档的批量 editor 预渲染

## Constraints

- 已打开文档的 editor 实例池仍要保留，切回不能回退。
- 当前文档首次打开时可以先展示轻量预览，但用户显式交互后必须能进入完整编辑态。
- 预览态不能误写文档内容，也不能破坏已有保存/脏标记逻辑。

## Acceptance Criteria

- [ ] AC-1: 未水合文档首次打开时，`app.currentDocument.ready` 对应的可见打开路径是轻量预览，而不是等待 `RefinexEditor` 完整挂载。
- [ ] AC-2: 当前文档在空闲时或用户显式激活时会进入完整编辑态；已打开文档切回继续维持当前近瞬切表现。
- [ ] AC-3: 首次打开缓存命中文档的日志应能稳定逼近 `<50ms`，并区分 `preview` 与 `editor` 模式。
- [ ] AC-4: `npm test` 与 `npm run build` 通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 预览态与编辑态切换闪烁 | Med | 保持同一文档容器，水合后无缝替换内容 |
| 用户点击后 editor 仍未及时 focus | Med | 记录待聚焦路径，水合完成后自动 focus |
| 预览态统计和 outline 仍拖慢打开 | Med | 预览态下跳过或延迟 wordCount / outline 等附属计算 |

## Implementation Steps

### Step 1: 登记即时预览 + 延迟水合计划

**Files:** `docs/exec-plans/active/2026-04-16-instant-preview-editor-hydration.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: 🔄 In progress
Evidence:
Deviations:

### Step 2: 为当前文档增加预览先开与 editor 延迟水合

**Files:** `src/App.tsx`
**Verification:** 首次打开缓存命中文档时先显示预览，editor 在后续空闲或交互时再水合

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-instant-preview-editor-hydration.md`, `docs/PLANS.md`
**Verification:** `npm test`、`npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | 🔄 | 计划文件正在创建并登记 |  |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 用“两阶段打开”满足 `<50ms` 目标 | 当前同步 editor 挂载本身已接近 50ms 预算上限 | 继续压榨 editor mount 微成本 | 要稳进 `<50ms`，必须把“可见打开”和“完整编辑器水合”拆开 |

## Completion Summary

Completed:
Duration: 3 steps
All acceptance criteria: PASS / FAIL

Summary:

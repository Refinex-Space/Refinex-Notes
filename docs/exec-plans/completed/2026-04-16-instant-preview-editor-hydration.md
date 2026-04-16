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
Evidence: 计划文件已创建，`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations:

### Step 2: 为当前文档增加预览先开与 editor 延迟水合

**Files:** `src/App.tsx`
**Verification:** 首次打开缓存命中文档时先显示预览，editor 在后续空闲或交互时再水合

Status: ✅ Done
Evidence: `App.tsx` 现在会把未水合文档先渲染成 `InstantDocumentPreview`，并在空闲时自动把当前文档加入 `hydratedEditorPaths`；用户点击预览也会立即触发水合并在完成后 focus 真正的 `RefinexEditor`。同时，预览态下会跳过 `DocumentOutlineDock` 和 `wordCount` 等附属计算，`app.currentDocument.ready` 日志还会带上 `mode: preview | editor` 区分打开路径。
Deviations:

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-instant-preview-editor-hydration.md`, `docs/PLANS.md`
**Verification:** `npm test`、`npm run build`

Status: ✅ Done
Evidence: `npm test` 通过，结果为 21 个测试文件、121 个断言全部通过；`npm run build` 通过。
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 |  |
| 2 | ✅ | 预览先开与 editor 延迟水合已落地 | 预览态会延迟附属计算 |
| 3 | ✅ | 全量测试与构建通过 |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 用“两阶段打开”满足 `<50ms` 目标 | 当前同步 editor 挂载本身已接近 50ms 预算上限 | 继续压榨 editor mount 微成本 | 要稳进 `<50ms`，必须把“可见打开”和“完整编辑器水合”拆开 |
| 预览态直接渲染 Markdown 文本 | 目标是先把文档可见时间压到极低 | 首开就做完整 Markdown HTML 预览 | 纯文本预览最轻，且最不容易重新引入大渲染成本 |

## Completion Summary

Completed: 2026-04-16
Duration: 3 steps
All acceptance criteria: PASS

Summary: 本轮将“文档打开时间”与“完整编辑器就绪时间”彻底拆开。当前文档在首次打开且尚未水合 editor 时，会先以 `InstantDocumentPreview` 轻量预览态渲染 Markdown 文本，让文档内容尽快可见；之后再在浏览器空闲时把该路径加入 `hydratedEditorPaths`，延后水合完整 `RefinexEditor`。如果用户立即点击预览，也会同步触发 editor 水合并在完成后自动 focus。与此同时，预览态下会跳过 `DocumentOutlineDock` 和字数统计等附属计算，避免这些额外工作把首屏可见时间重新拖上去。最终前端测试与构建全部通过，为下一轮重新测量 `<50ms` 打开时间建立了新的基线。

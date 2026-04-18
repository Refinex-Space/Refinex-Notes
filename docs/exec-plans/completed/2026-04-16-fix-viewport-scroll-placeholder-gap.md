# Fix Plan: Fix Viewport Scroll Placeholder Gap

Created: 2026-04-16
Status: Completed
Author: agent
Type: fix

## Bug Brief

**Symptom**: 长 Markdown 在快速滚动时，会短暂看到样式退化的 shell / 摘要态，列表、表格等块会在可视区里闪成占位内容，用户能明显感知“等待真实内容补渲染”的中间状态。
**Expected**: 文档一旦打开完成，快速滚动时应保持稳定的真实内容呈现；可视区内不应再出现明显的 shell 占位、样式空白或等待渲染中间态。
**Severity**: Degraded
**Type**: Regression

### Reproduction

1. 打开一篇足够长、含段落 / 列表 / 表格的 Markdown 文档。
2. 进入编辑态并快速上下滚动。
3. 观察新进入视口的区域会先出现 shell 摘要态，再在停滚后切回 live DOM。

Reproduction evidence:
- 用户报告说明“快速滚动时会看到样式短暂空白”。
- `src/editor/plugins/viewport-blocks.ts` 当前在 `scroll` 时将 `isScrollSettling` 置为 `true`，并直接阻止 `scheduleMeasure()` 执行；直到 `VIEWPORT_SCROLL_SETTLE_DELAY_MS = 140` 结束后才重新测量热区。
- 这意味着滚动期间新进入视口的块不会及时加入 live 集合，而会继续停留在 shell 态；`ViewportContainerBlockView` 对列表/表格容器的 shell 还是单行摘要，占位感最强。

## Root Cause

**Mechanism**: 为了修掉 earlier scroll jitter，viewport plugin 在滚动期间冻结了 hotzone 更新。冻结本身避免了频繁 live/shell 来回切换，但副作用是“即将进入和刚进入视口的内容”也无法及时提升为 live DOM，只能以退化 shell 形态短暂出现在用户眼前。
**Introduced by**: `Fix Viewport Scroll Jitter` 中引入的 scroll-settle freeze 策略。
**Why it wasn't caught**: 现有测试覆盖了“滚动时要 debounce 测量”，但没有覆盖“滚动中可视区内容不能继续停留在 shell 态”这一用户体验约束。

## Hypothesis Log

### Hypothesis #1: 主要问题不是 shell 高度估算，而是滚动期间完全冻结热区，导致新进入视口的块来不及变成 live

Prediction: 如果滚动期间不再完全冻结热区，而是对当前视口使用更大的预热 margin 进行持续测量，那么进入视口前后的块会更早保持 live，用户不再看到明显的占位中间态；停滚后再收缩回常规 margin 即可兼顾性能。
Experiment: 检查 `viewport-blocks.ts` 的 `handleScroll` / `scheduleMeasure` 路径，以及 `ViewportContainerBlockView` 的 shell 表现。
Result: 代码确认滚动期间完全不测量；列表/表格容器 shell 为单行摘要，占位退化明显。
Conclusion: CONFIRMED

## Fix

**Strategy**: 取消“滚动期间完全冻结热区”的策略，改为“滚动中用更大的 viewport margin 持续预热 live 集合，停滚后再收缩回常规 margin”；补充回归测试，锁定“快速滚动时即将进入视口的块也会被纳入 live 覆盖”的行为。
**Files**: `src/editor/plugins/viewport-blocks.ts`, `src/editor/__tests__/viewport-blocks.test.ts`, `docs/PLANS.md`, `docs/exec-plans/active/2026-04-16-fix-viewport-scroll-placeholder-gap.md`
**Risk**: 中低。更大的 live 覆盖范围会提高滚动期间的 DOM 保活量，但范围仍受 viewport buffer 约束；主要风险是过大 buffer 反向影响大文档性能，需要用定向测试和全量前端测试兜底。

### Steps

#### Step 1: 登记 fix plan

**Files:** `docs/exec-plans/active/2026-04-16-fix-viewport-scroll-placeholder-gap.md`, `docs/PLANS.md`
**Verification:** 计划文件存在，`docs/PLANS.md` Active Plans 已登记

Status: ✅ Done
Evidence: 已创建 fix plan 并登记 Active Plans。
Deviations:

#### Step 2: 调整滚动中的 viewport 热区策略

**Files:** `src/editor/plugins/viewport-blocks.ts`
**Verification:** 滚动中不再完全冻结热区；使用更大 buffer 提前纳入即将进入视口的块

Status: ✅ Done
Evidence: `viewport-blocks.ts` 不再在滚动期间完全冻结热区，而是改为在滚动中使用更大的 measurement margin 持续测量；新进入视口前后的块会更早进入 live 覆盖范围，停滚后再收缩回常规 margin。
Deviations:

#### Step 3: 增加回归测试并验证

**Files:** `src/editor/__tests__/viewport-blocks.test.ts`
**Verification:** 新测试通过，且 `npm test`、`npm run build` 通过

Status: ✅ Done
Evidence: `src/editor/__tests__/viewport-blocks.test.ts` 新增 “uses a larger scroll buffer so upcoming blocks are promoted before users see shell placeholders” 回归测试；`npx vitest run src/editor/__tests__/viewport-blocks.test.ts` 通过（1 文件 / 7 断言）；`npm test` 通过（23 文件 / 131 测试）；`npm run build` 通过。
Deviations:

## Verification

- [x] Reproduction evidence addressed
- [x] Regression test added and passes
- [x] Relevant tests pass
- [x] Build passes
- [x] Diff reviewed — only fix-related changes present in touched files

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| Reproduce | ✅ | 用户症状 + 当前 scroll freeze 代码路径已确认 |  |
| Root cause | ✅ | 滚动期间 hotzone 完全冻结 | earlier jitter fix 的副作用 |
| Fix | ✅ | 滚动中改为大 buffer 持续测量 | 停滚后再收缩到常规 live 集合 |
| Verify | ✅ | `npm test`、`npm run build`、`python3 scripts/check_harness.py` 通过 |  |
| Regression | ✅ | 新增 scroll buffer 回归测试 |  |

## Completion Summary

Completed: 2026-04-16
Root cause: earlier scroll-jitter 修复把滚动期热区完全冻结，导致新进入视口的块在 140ms settle 窗口内继续停留在 shell 摘要态，用户会直接看到占位中间态。
Fix: 滚动中改用更大的 viewport measurement margin 持续预热 live 集合，让即将进入视口的块提前转为 live；停滚后再收缩回常规 margin，兼顾稳定性和性能。
Regression test: `src/editor/__tests__/viewport-blocks.test.ts`
All verification criteria: PASS

Summary: 这次修复不是继续拉长 debounce，而是把策略从“滚动中冻结热区”改成“滚动中扩大 live 预热范围”。此前的 freeze 方案确实减轻了 shell/live 高频切换带来的 jitter，但副作用是新进入视口的区域也被卡在 shell 态里，列表/表格容器还会退化成单行摘要，用户就会看到明显的等待渲染中间态。现在 viewport plugin 会在滚动时用更大的 measurement margin 持续跟随当前视口，把即将进入和刚离开视口的块都保活为 live DOM；等滚动停稳后，再收缩回常规 margin，避免 live 集合无限膨胀。定向回归测试、全量前端测试、构建和 Harness 校验均通过。

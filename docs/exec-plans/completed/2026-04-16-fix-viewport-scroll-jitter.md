# Execution Plan: Fix Viewport Scroll Jitter

Created: 2026-04-16
Status: Completed
Author: agent

## Bug Brief

| Field | Detail |
| --- | --- |
| Symptom | 打开长篇 Markdown/博客后快速上下滚动时，视口内容会明显上下抖动，滚动体感不稳定。 |
| Expected | 快速滚动期间，滚动位置应稳定，不应因为新内容进入视口就触发明显的高度跳变。 |
| Reproduction | 1. 打开一篇足够长、包含多个段落/列表/表格的 Markdown 文档。 2. 进入编辑态。 3. 快速上下滚动。 4. 观察到 viewport skeleton 切换 live DOM 时，窗口会反复上下抖动。 |
| Affected scope | `src/editor/plugins/viewport-blocks.ts`、`src/editor/node-views/*Viewport*.ts`、`src/editor/editor.css`、`src/editor/__tests__/viewport-blocks.test.ts` |
| Severity | Degraded |
| Type | Regression |

## Objective

让长文档在快速滚动时保持稳定：滚动过程中不再即时触发 viewport block 的 live/shell 切换，避免 DOM 高度变化导致的 scroll jitter。

## Scope

**In scope:**
- `src/editor/plugins/viewport-blocks.ts`
- `src/editor/__tests__/viewport-blocks.test.ts`
- `docs/exec-plans/active/2026-04-16-fix-viewport-scroll-jitter.md`
- `docs/PLANS.md`

**Out of scope:**
- 重写 viewport skeleton 的整体架构
- 为所有 block 建立像素级精确高度缓存
- 变更桌面壳或原生窗口行为

## Root Cause Hypothesis

当前 `viewportBlocksPlugin` 在每次 `scroll` 事件上用 `requestAnimationFrame` 立即重算热区并派发 decorations。用户快速滚动时，块会在壳层和真实 `contentDOM` 之间频繁切换；壳层 `min-height` 只是粗估值，和真实块高度不完全一致，触发浏览器滚动锚点反复校正，表现为视图上下抖动。

## Acceptance Criteria

- [ ] AC-1: 快速滚动期间，不会在每一帧都触发 viewport block 的即时 live/shell 切换。
- [ ] AC-2: 滚动停止后，视口附近 block 仍会恢复为 live DOM，编辑能力不回退。
- [ ] AC-3: 新增回归测试、`npm test`、`npm run build` 通过。

## Implementation Steps

### Step 1: 登记 fix plan

**Files:** `docs/exec-plans/active/2026-04-16-fix-viewport-scroll-jitter.md`, `docs/PLANS.md`  
**Verification:** 计划文件存在且 Active Plans 已登记

Status: ✅ Done
Evidence: 新增 fix plan，记录了滚动抖动的 bug brief、根因假设、修复范围与验收条件；`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations:

### Step 2: 调整滚动期间的 viewport 测量策略

**Files:** `src/editor/plugins/viewport-blocks.ts`  
**Verification:** scroll 中不即时切换热区，停稳后再更新

Status: ✅ Done
Evidence: `viewportBlocksPlugin` 现在不再在每次 `scroll` 事件上立刻 dispatch 新 decorations，而是进入 `VIEWPORT_SCROLL_SETTLE_DELAY_MS=140` 的 settle 窗口；只有滚动停稳后才重新测量热区。插件同时补上了 scroll 容器 listener 的绑定/解绑管理，避免容器切换后残留旧 listener。
Deviations:

### Step 3: 增加回归测试并验证

**Files:** `src/editor/__tests__/viewport-blocks.test.ts`  
**Verification:** 定向测试、`npm test`、`npm run build`

Status: ✅ Done
Evidence: 新增 `debounces viewport measurement until scrolling settles` 回归测试，验证重复 scroll 会重置 settle timer，只有最后一次滚动结束后才触发测量；`npx vitest run src/editor/__tests__/viewport-blocks.test.ts` 通过（1 文件 / 5 断言）；`npm test` 通过（22 文件 / 127 断言）；`npm run build` 通过。
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | fix plan 与 `docs/PLANS.md` 已登记 |  |
| 2 | ✅ | scroll 期间暂停 viewport live/shell 切换 | 减少高度变化触发的滚动锚点抖动 |
| 3 | ✅ | 定向测试、全量测试、构建均通过 |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 优先做 scroll settle debounce | 用户投诉的是“快速滚动时抖动” | 继续调壳层估算高度、增加像素级高度缓存 | 先直接阻断滚动中的 DOM 高度切换，改动最小、命中症状最直接 |
| 把 debounce 抽成可测试 helper | 需要给 fix 加回归保护 | 只在插件类内部写计时逻辑 | 抽出 helper 后可用 fake timers 做稳定断言，降低 UI 手工回归依赖 |

## Completion Summary

Completed: 2026-04-16
Duration: 3 steps
All acceptance criteria: PASS

Summary: 这次修复没有重做 viewport skeleton，而是把问题点收敛到 `scroll` 触发链路本身。此前每次滚动都会在下一帧立刻重算热区并切换 live/shell，粗估高度与真实高度不一致时就会造成滚动锚点反复校正。现在插件会在滚动期间冻结当前热区，只有最后一次滚动结束并经过 140ms settle 窗口后才重新测量并切换节点，从而避免快速上下滚动时持续改写 DOM 高度。相关回归测试、全量前端测试和构建均已通过。

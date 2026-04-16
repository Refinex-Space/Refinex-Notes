# Execution Plan: Delayed Auto Hydration

Created: 2026-04-16
Status: Completed
Author: agent

## Objective

恢复单击打开后的自动进入编辑能力，但把 editor 水合改成延迟且可取消，避免打开后立刻触发第二段主线程卡顿。

## Scope

**In scope:**
- `src/App.tsx`
- `docs/exec-plans/completed/2026-04-16-delayed-auto-hydration.md`
- `docs/PLANS.md`

**Out of scope:**
- 原生读盘与缓存
- 已打开文档实例池
- 更大范围的 editor 架构重写

## Constraints

- 继续保持 `app.currentDocument.ready` 的快速预览路径。
- 自动水合必须可取消；如果用户快速切换到别的文档，旧任务不能继续触发。
- 用户仍可通过显式点击预览立刻进入编辑。

## Acceptance Criteria

- [ ] AC-1: 单击打开文档后，预览会先在 `<50ms` 内显示，随后在延迟窗口后自动进入编辑态，无需第二次点击。
- [ ] AC-2: 如果用户在延迟窗口内切走当前文档，之前排队的自动水合会被取消。
- [ ] AC-3: `npm test` 与 `npm run build` 通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 自动水合延迟过短又重新引入卡顿 | Med | 使用更长的延迟窗口，并在文档切换时取消 |
| 延迟过长让用户觉得“怎么还没变成编辑器” | Med | 保留显式点击预览立即进入编辑的路径 |

## Implementation Steps

### Step 1: 登记延迟自动水合计划

**Files:** `docs/exec-plans/active/2026-04-16-delayed-auto-hydration.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: ✅ Done
Evidence: 计划文件已创建并已归档，`docs/PLANS.md` 已完成状态同步。
Deviations:

### Step 2: 改为延迟且可取消的自动水合

**Files:** `src/App.tsx`
**Verification:** 打开后先预览，再延迟自动进入编辑；快速切换可取消

Status: ✅ Done
Evidence: `App.tsx` 现在会在当前文档首次打开后先进入快速预览态，并通过 `AUTO_EDITOR_HYDRATION_DELAY_MS` 延迟窗口安排自动 editor 水合；如果用户在窗口内切走，旧文档的 `setTimeout` 会被清理，不再继续启动 editor。预览页仍保留点击立即进入编辑的路径，因此用户不需要二次点击才能完成自动进入编辑。
Deviations:

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-delayed-auto-hydration.md`, `docs/PLANS.md`
**Verification:** `npm test`、`npm run build`

Status: ✅ Done
Evidence: `npm test` 通过，结果为 21 个测试文件、121 个断言全部通过；`npm run build` 通过。
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 |  |
| 2 | ✅ | 延迟且可取消的自动水合已落地 | 仍保留显式点击立即进入编辑 |
| 3 | ✅ | 全量测试与构建通过 |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 用延迟自动水合替代手动点击-only | 手动二次点击属于交互退步 | 保持纯手动、恢复立即自动水合 | 需要同时保住 `<50ms` 可见打开和单击后自动进入编辑 |
| 延迟窗口设为固定时长且可取消 | 需要避免打开后立即再来一段主线程重活 | 立即空闲水合、完全不自动水合 | 固定窗口最容易控制和取消，也最容易观察体感变化 |

## Completion Summary

Completed: 2026-04-16
Duration: 3 steps
All acceptance criteria: PASS

Summary: 本轮修正了上一版“必须二次点击才进入编辑”的交互退步。当前文档在首次打开后仍会先走快速预览路径，保证 `app.currentDocument.ready` 能保持在 `<50ms` 区间；但与纯手动版本不同的是，系统现在会在一个固定的延迟窗口后自动开始 editor 水合，并在用户快速切换到别的文档时取消旧任务，避免刚打开就立刻触发第二段主线程负载。与此同时，预览页面仍保留显式点击立即进入编辑的路径，因此交互上重新回到单击打开、随后自动进入编辑的模式。

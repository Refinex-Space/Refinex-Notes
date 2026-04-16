# Execution Plan: Delayed Auto Hydration

Created: 2026-04-16
Status: Active
Author: agent

## Objective

恢复单击打开后的自动进入编辑能力，但把 editor 水合改成延迟且可取消，避免打开后立刻触发第二段主线程卡顿。

## Scope

**In scope:**
- `src/App.tsx`
- `docs/exec-plans/active/2026-04-16-delayed-auto-hydration.md`
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

Status: 🔄 In progress
Evidence:
Deviations:

### Step 2: 改为延迟且可取消的自动水合

**Files:** `src/App.tsx`
**Verification:** 打开后先预览，再延迟自动进入编辑；快速切换可取消

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-delayed-auto-hydration.md`, `docs/PLANS.md`
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
| 用延迟自动水合替代手动点击-only | 手动二次点击属于交互退步 | 保持纯手动、恢复立即自动水合 | 需要同时保住 `<50ms` 可见打开和单击后自动进入编辑 |

## Completion Summary

Completed:
Duration: 3 steps
All acceptance criteria: PASS / FAIL

Summary:

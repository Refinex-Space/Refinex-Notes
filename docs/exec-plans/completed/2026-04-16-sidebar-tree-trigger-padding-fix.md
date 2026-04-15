# Execution Plan: Sidebar Tree Trigger Padding Fix

Created: 2026-04-16
Status: Active

## Objective

修正左侧文件树目录项仍被 `AccordionTrigger` 基础 `py-3` 撑大的问题，确保目录项使用预期的紧凑间距。

## Acceptance Criteria

- [x] AC-1: 目录节点的 trigger class 对 `py-3` 形成可靠覆盖，DOM 不再只依赖普通 `py-1`。
- [x] AC-2: 相关文件树测试与 `npm run build` 继续通过；全量 `npm test` 若失败，失败原因必须明确为本次改动之外的既有工作树变更。

## Steps

1. 在 `src/components/sidebar/FileTree.tsx` 对目录 trigger 的冲突 utility 改为强制覆盖 → verify: diff 显示改用 `!` utility。
2. 更新 `src/components/sidebar/__tests__/FileTree.test.tsx` 回归断言并跑验证 → verify: `npm test`、`npm run build`。

## Completion Summary

Completed: 2026-04-16
All acceptance criteria: PASS

Summary: 目录节点改为使用 `!py-1`、`!text-[13px]`、`!leading-[1.1rem]` 等强制覆盖 utility，避免共享 `AccordionTrigger` 基类中的 `py-3` 再次撑大高度。定向文件树测试 4/4 通过，`npm run build` 通过。全量 `npm test` 仍被用户工作树中的 `src/components/editor/DocumentOutlineDock.tsx` 既有未提交改动触发的 `DocumentOutlineDock.test.tsx` 失败阻塞，本次修复未修改该区域。

# Execution Plan: Sidebar Tree Trigger Padding Fix

Created: 2026-04-16
Status: Active

## Objective

修正左侧文件树目录项仍被 `AccordionTrigger` 基础 `py-3` 撑大的问题，确保目录项使用预期的紧凑间距。

## Acceptance Criteria

- [ ] AC-1: 目录节点的 trigger class 对 `py-3` 形成可靠覆盖，DOM 不再只依赖普通 `py-1`。
- [ ] AC-2: `npm test` 与 `npm run build` 继续通过。

## Steps

1. 在 `src/components/sidebar/FileTree.tsx` 对目录 trigger 的冲突 utility 改为强制覆盖 → verify: diff 显示改用 `!` utility。
2. 更新 `src/components/sidebar/__tests__/FileTree.test.tsx` 回归断言并跑验证 → verify: `npm test`、`npm run build`。

## Completion Summary

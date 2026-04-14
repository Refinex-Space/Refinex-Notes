# Execution Plan: Inline Code Cursor Fix

Created: 2026-04-14
Status: Active
Author: agent

## Objective

修复点击含 inline code 的 Markdown 笔记时 `RefinexEditor` 挂载阶段的 `RangeError`。

## Acceptance Criteria

- [ ] AC-1: `RefinexEditor` 在加载包含 inline code（如 `` `**text**` ``）的 Markdown 时不再抛出 `Index out of range`。
- [ ] AC-2: 为该回归增加单元测试，`npm test -- --run` 通过。
- [ ] AC-3: `npm run build` 通过。

## Steps

1. 为 inline-code 挂载路径补回归测试
   verify: `npm test -- --run`
2. 调整游标位置计算，避免对非法范围做全局 `textBetween`
   verify: `npm test -- --run && npm run build`

## Completion Summary

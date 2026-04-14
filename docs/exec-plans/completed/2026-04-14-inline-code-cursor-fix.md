# Execution Plan: Inline Code Cursor Fix

Created: 2026-04-14
Status: Completed
Author: agent

## Objective

修复点击含 inline code 的 Markdown 笔记时 `RefinexEditor` 挂载阶段的 `RangeError`。

## Acceptance Criteria

- [x] AC-1: `RefinexEditor` 在加载包含 inline code（如 `` `**text**` ``）的 Markdown 时不再抛出 `Index out of range`。
- [x] AC-2: 为该回归增加单元测试，`npm test -- --run` 通过。
- [x] AC-3: `npm run build` 通过。

## Steps

1. 为 inline-code 挂载路径补回归测试
   verify: `npm test -- --run`
   status: ✅ Done
   evidence: `src/editor/__tests__/RefinexEditor-utils.test.ts` 新增 “starts with inline code” 回归测试，单文件测试通过。
2. 调整游标位置计算，避免对非法范围做全局 `textBetween`
   verify: `npm test -- --run && npm run build`
   status: ✅ Done
   evidence: `src/editor/RefinexEditor.tsx` 对 `getCursorPosition` 增加 try/fallback 路径；全量前端测试 75/75 通过，`npm run build` 通过。

## Completion Summary

Completed: 2026-04-14
All acceptance criteria: PASS

Summary: 已将 `RefinexEditor` 的游标位置计算改为“优先沿用原逻辑，遇到 inline code 边界异常时退回到 textblock 级安全计算”，从而修复点击含 inline code 的 Markdown 文件时的挂载崩溃，并补充了对应回归测试。

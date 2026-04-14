# Execution Plan: Inline Code Editor Hardening

Created: 2026-04-14
Status: Completed
Author: agent

## Objective

修复打开含 inline code 的 Markdown 文件时编辑器仍会在真实界面报错的问题，并收紧 `RefinexEditor` 的切文档生命周期与异常边界。

## Acceptance Criteria

- [x] AC-1: 切换到包含 inline code 的文档时不再抛出 React passive effect / commit phase 错误。
- [x] AC-2: `RefinexEditor` 在切换文档时会使用新的编辑器实例或等价的安全状态重建路径。
- [x] AC-3: `npm test -- --run` 与 `npm run build` 通过。

## Steps

1. 强化 `RefinexEditor` 的切文档与异常安全路径
   verify: `npm test -- --run`
   status: ✅ Done
   evidence: `src/App.tsx` 为 `RefinexEditor` 增加 `key={currentDocument.path}`；`src/editor/RefinexEditor.tsx` 对游标上报与序列化增加安全 helper。
2. 运行完整前端验证并归档
   verify: `npm test -- --run && npm run build`
   status: ✅ Done
   evidence: `npm test -- --run` 通过（75/75），`npm run build` 通过。

## Completion Summary

Completed: 2026-04-14
All acceptance criteria: PASS

Summary: 这轮修复将 `RefinexEditor` 从“复用旧编辑器实例 + 直接在 effect 中调用高风险 ProseMirror API”改为“切文档重建实例 + 所有游标/序列化路径走安全包装”，用于消除真实界面中仍然出现的 inline-code 边界异常。

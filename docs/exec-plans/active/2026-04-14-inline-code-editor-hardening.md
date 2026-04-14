# Execution Plan: Inline Code Editor Hardening

Created: 2026-04-14
Status: Active
Author: agent

## Objective

修复打开含 inline code 的 Markdown 文件时编辑器仍会在真实界面报错的问题，并收紧 `RefinexEditor` 的切文档生命周期与异常边界。

## Acceptance Criteria

- [ ] AC-1: 切换到包含 inline code 的文档时不再抛出 React passive effect / commit phase 错误。
- [ ] AC-2: `RefinexEditor` 在切换文档时会使用新的编辑器实例或等价的安全状态重建路径。
- [ ] AC-3: `npm test -- --run` 与 `npm run build` 通过。

## Steps

1. 强化 `RefinexEditor` 的切文档与异常安全路径
   verify: `npm test -- --run`
2. 运行完整前端验证并归档
   verify: `npm test -- --run && npm run build`

## Completion Summary

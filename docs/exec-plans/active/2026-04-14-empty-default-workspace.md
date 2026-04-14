# Execution Plan: Empty Default Workspace

Created: 2026-04-14
Status: Active
Author: agent

## Objective

移除生产代码中的示例工作区测试数据，让应用在未打开任何本地目录时显示空状态。

## Acceptance Criteria

- [ ] AC-1: `src/stores/noteStore.ts` 与 `src/stores/editorStore.ts` 默认初始状态不再包含 `Archive`、`Daily`、`Inbox/Welcome.md` 等示例数据。
- [ ] AC-2: 未打开工作区时 UI 文案反映“空状态/未打开工作区”，不再提示内置 mock 工作区。
- [ ] AC-3: 相关 Vitest 用例改为在测试内自行注入测试数据，`npm test -- --run` 通过。

## Steps

1. 清空默认 store 初始状态并修正文案
   verify: `npm test -- --run`
2. 把 workspace store 测试改为显式注入测试数据
   verify: `npm test -- --run && npm run build`

## Completion Summary

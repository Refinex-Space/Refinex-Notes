# Execution Plan: Empty Default Workspace

Created: 2026-04-14
Status: Completed
Author: agent

## Objective

移除生产代码中的示例工作区测试数据，让应用在未打开任何本地目录时显示空状态。

## Acceptance Criteria

- [x] AC-1: `src/stores/noteStore.ts` 与 `src/stores/editorStore.ts` 默认初始状态不再包含 `Archive`、`Daily`、`Inbox/Welcome.md` 等示例数据。
- [x] AC-2: 未打开工作区时 UI 文案反映“空状态/未打开工作区”，不再提示内置 mock 工作区。
- [x] AC-3: 相关 Vitest 用例改为在测试内自行注入测试数据，`npm test -- --run` 通过。

## Steps

1. 清空默认 store 初始状态并修正文案
   verify: `npm test -- --run`
   status: ✅ Done
   evidence: `src/stores/noteStore.ts` 默认状态改为空集合，`src/stores/editorStore.ts` 默认 `activeTab` 改为 `null`，`src/App.tsx` 不再显示“内置 mock 工作区”。
2. 把 workspace store 测试改为显式注入测试数据
   verify: `npm test -- --run && npm run build`
   status: ✅ Done
   evidence: `src/stores/__tests__/workspace-state.test.ts` 新增 `seedWorkspaceState()`，测试数据完全下沉到测试文件；`npm test -- --run`、`npm run build`、`cargo test --manifest-path src-tauri/Cargo.toml` 全部通过。

## Completion Summary

Completed: 2026-04-14
All acceptance criteria: PASS

Summary: 生产代码中的示例目录与示例文档已删除，应用在未打开本地工作区时恢复为空状态；为保持测试覆盖，store 用例改为在测试中显式构造文档树，而不再依赖生产默认数据。

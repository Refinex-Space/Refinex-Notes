# Execution Plan: Async Read Lazy CodeBlock

Created: 2026-04-16
Status: Active
Author: agent

## Objective

把首次打开大 Markdown 的主链路改成“原生读文件不阻塞 UI + 代码块按需激活 CodeMirror”，显著压低首次打开的等待时间。

## Scope

**In scope:**
- `src-tauri/src/commands/files.rs`
- `src/editor/node-views/CodeBlockView.tsx`
- `src/editor/editor.css`
- `src/editor/__tests__/code-block-view.test.ts`
- `docs/exec-plans/active/2026-04-16-async-read-lazy-codeblock.md`
- `docs/PLANS.md`

**Out of scope:**
- 全量重写 editor 架构
- 搜索 / Git / 认证链路
- 非 code block 节点的懒加载

## Constraints

- 遵守 `src/` 与 `src-tauri/` 边界：前端只通过 service/IPC 调原生命令。
- 保持现有代码块编辑能力，不能通过去掉语言选择或内容编辑来换性能。
- 原生文件读取要改成不阻塞 UI 的路径，并保留工作区路径校验。

## Acceptance Criteria

- [ ] AC-1: `read_file` 走异步/后台读取路径，前端点击文档后 loading UI 能在文件读取完成前立即出现。
- [ ] AC-2: code block 默认使用轻量预览壳，只有用户激活某个代码块时才初始化对应 CodeMirror 实例。
- [ ] AC-3: 已打开文档切回保持现有近瞬切表现，首次打开含大量代码块的文档主观明显更快。
- [ ] AC-4: `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test`、`npm run build` 通过。

## Risk Notes

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| 异步读取打破当前 IPC 类型签名 | Med | 保持命令名不变，仅改实现为 `async fn` + `spawn_blocking` |
| 代码块懒激活后编辑体验退化 | Med | 单个代码块一旦激活就保持 CodeMirror 实例，不反复销毁 |
| 预览壳与真实编辑器内容不同步 | Low | `update()` 同时同步预览文本和激活态编辑器文本 |

## Implementation Steps

### Step 1: 登记异步读取 + 代码块懒激活计划

**Files:** `docs/exec-plans/active/2026-04-16-async-read-lazy-codeblock.md`, `docs/PLANS.md`
**Verification:** 计划文件存在且 `docs/PLANS.md` Active Plans 已登记

Status: 🔄 In progress
Evidence:
Deviations:

### Step 2: 把原生 read_file 改成后台异步读取

**Files:** `src-tauri/src/commands/files.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 让 code block 按需激活 CodeMirror

**Files:** `src/editor/node-views/CodeBlockView.tsx`, `src/editor/editor.css`, `src/editor/__tests__/code-block-view.test.ts`
**Verification:** `npm test` 中相关测试通过，代码块仍可编辑且默认不立即实装 CodeMirror

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-async-read-lazy-codeblock.md`, `docs/PLANS.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test`、`npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | 🔄 | 计划文件正在创建并登记 |  |
| 2 | ⬜ |  |  |
| 3 | ⬜ |  |  |
| 4 | ⬜ |  |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 同时动原生读取与 code block 节点视图 | 日志显示首次打开同时受读盘与首次渲染拖累 | 只改其中一侧 | 两个热点叠加在首次打开链路上，必须一起收敛 |

## Completion Summary

Completed:
Duration: 4 steps
All acceptance criteria: PASS / FAIL

Summary:

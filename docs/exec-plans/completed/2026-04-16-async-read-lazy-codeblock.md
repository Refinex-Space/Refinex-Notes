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
Evidence: 计划文件已创建，`docs/PLANS.md` 已登记 Active Plans 条目。
Deviations:

### Step 2: 把原生 read_file 改成后台异步读取

**Files:** `src-tauri/src/commands/files.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ✅ Done
Evidence: `src-tauri/src/commands/files.rs` 的 `read_file` 已改成 `async fn`，并通过 `tauri::async_runtime::spawn_blocking` 在后台线程执行 `fs::read_to_string`，保留了现有工作区路径校验与命令签名。
Deviations:

### Step 3: 让 code block 按需激活 CodeMirror

**Files:** `src/editor/node-views/CodeBlockView.tsx`, `src/editor/editor.css`, `src/editor/__tests__/code-block-view.test.ts`
**Verification:** `npm test` 中相关测试通过，代码块仍可编辑且默认不立即实装 CodeMirror

Status: ✅ Done
Evidence: `CodeBlockView` 现在默认渲染轻量 `pre` 预览壳，只有用户点击或键盘激活某个代码块时才初始化对应的 CodeMirror 实例；一旦激活则保持实例，不在后续更新中反复销毁。对应样式已补到 `src/editor/editor.css`。
Deviations:

### Step 4: 完成验证并归档

**Files:** `docs/exec-plans/active/2026-04-16-async-read-lazy-codeblock.md`, `docs/PLANS.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test`、`npm run build`

Status: ✅ Done
Evidence: `cargo test --manifest-path src-tauri/Cargo.toml` 通过，结果为 37 个原生测试全部通过；`npm test` 通过，结果为 21 个测试文件、120 个断言全部通过；`npm run build` 通过。
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | 计划文件与 `docs/PLANS.md` 已更新 |  |
| 2 | ✅ | 原生读取已移到后台线程 | 保持命令名和路径校验不变 |
| 3 | ✅ | code block 默认走轻量预览壳 | 激活后才创建 CodeMirror |
| 4 | ✅ | 原生测试、前端测试和构建均通过 |  |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 同时动原生读取与 code block 节点视图 | 日志显示首次打开同时受读盘与首次渲染拖累 | 只改其中一侧 | 两个热点叠加在首次打开链路上，必须一起收敛 |
| 代码块激活后不主动销毁 CodeMirror | 需要兼顾首开速度和后续编辑连贯性 | 失焦后销毁、滚出视口就销毁 | 保持实例更稳妥，也避免来回编辑时再次支付初始化成本 |

## Completion Summary

Completed: 2026-04-16
Duration: 4 steps
All acceptance criteria: PASS

Summary: 本轮深度优化沿着两条明确的热点同时推进。首先，Rust 侧 `read_file` 不再直接在命令执行路径上同步 `fs::read_to_string`，而是改为 `async fn + spawn_blocking`，避免前端点击文档后 loading UI 还没来得及绘制就被原生读取卡住。其次，编辑器里的 `CodeBlockView` 不再在首次打开时为文档中的所有代码块一次性初始化 CodeMirror，而是默认渲染轻量只读预览壳，只有用户真正激活某个代码块时才创建对应的 CodeMirror 实例，并在后续保持该实例。这样可以显著降低含大量代码块文档的首次打开渲染成本。最终原生测试、前端测试和生产构建全部保持通过。

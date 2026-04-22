# Execution Plan: Skill System And Editor AI Insert

Created: 2026-04-22
Status: Active
Author: agent

## Objective

在现有 AI 面板与 ProseMirror 编辑器之上，落地仓库内置 Skill 系统，并让 AI 输出可按 Skill 的 `outputMode` 直接流式写入编辑器或回退到聊天面板。

## Scope

**In scope:**
- `skills/*.md`
- `src/components/ai/SkillPicker.tsx`
- `src/editor/commands/ai-insert.ts`
- `src/editor/ui/FloatingToolbar.tsx`
- `src/editor/ui/SlashMenu.tsx`
- `src/editor/plugins/slash-menu.ts`
- `src/editor/rich-ui.ts`
- `src/editor/RefinexEditor.tsx`
- 可能新增 `src/services/skillService.ts`
- 可能新增 `src/types/skill.ts`
- 可能新增 `src/editor/plugins/ai-write-highlight.ts`
- 编辑器右键菜单接入点
- 与 Skill / editor AI insert 直接相关的 Vitest 测试
- `docs/ARCHITECTURE.md`
- `docs/OBSERVABILITY.md`

**Out of scope:**
- Rust AI provider 层扩容
- 用户自定义 Skill 管理界面
- 远程 Skill registry / 外部 Skill 同步
- token 预算管理
- 多文档 AI 会话持久化
- 重写整个 Slash 命令系统

## Constraints

- AI 请求必须继续只走现有 Rust/Tauri AI command，不允许前端直连 Provider API
- Skill 真源必须来自仓库根目录 `skills/` 文件，不在 React 组件内维护分散运行时常量
- 编辑器写入必须兼容 ProseMirror history，确保 Undo 可撤销
- 写入完成后的 Markdown 结构修正必须复用现有 `inline-sync`
- 优先扩展现有 `FloatingToolbar`、`SlashMenu`、ContextMenu，而不是引入新的编辑器浮层系统

## Acceptance Criteria

- [ ] AC-1: 根目录 `skills/` 提供 8 个内置 Skill 文件，含 YAML frontmatter 与 Markdown body，并可被前端统一解析
- [ ] AC-2: 选中文本时，编辑器浮动工具栏可显示 AI 入口并列出可执行 Skill
- [ ] AC-3: 编辑器支持 `/ai-xxx` Skill 触发与右键菜单 AI 子菜单
- [ ] AC-4: `replace-selection`、`insert-at-cursor`、`new-document`、`chat-response` 四种 `outputMode` 都有明确执行路径
- [ ] AC-5: AI 输出能流式写入编辑器，并在写入期间显示高亮反馈，完成后渐隐
- [ ] AC-6: AI 写入完成后触发 `inline-sync` 风格的结构修正，并且 Undo 能撤销 AI 写入
- [ ] AC-7: `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test -- --run`、`npm run build` 保持通过

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Skill 定义散落在 TS 常量与 Markdown 文件两份真源 | Med | 只从 `skills/*.md` 解析目录，UI 与执行层都消费统一结构 |
| 流式写入逐 token dispatch 导致 ProseMirror selection 漂移或撤销链破碎 | High | 在 `ai-insert` 里集中管理插入锚点、使用单条事务链路并补回 selection |
| `new-document` 模式和现有 `noteStore` / workspace 文件流不一致 | Med | 复用 `noteStore.createFile/openFile/updateFileContent`，不新增平行文件写入层 |
| Slash AI 命令改造破坏既有 bare slash 菜单 | Med | 保持现有 `/` 命令兼容，仅扩展 AI skill 查询分支并用测试锁定 |
| 写入高亮与 inline-sync 相互干扰造成闪烁 | Med | 将高亮实现为独立 plugin state / decoration，并在完成后单向清理 |

## Implementation Steps

### Step 1: 落地内置 Skill 文件、类型与解析服务

**Files:** `skills/*.md`, `src/types/skill.ts`, `src/services/skillService.ts`, `src/components/ai/SkillPicker.tsx`
**Verification:** `npm test -- --run`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 2: 实现 editor AI stream insert 与写入高亮

**Files:** `src/editor/commands/ai-insert.ts`, `src/editor/RefinexEditor.tsx`, `src/editor/plugins/ai-write-highlight.ts`, `src/editor/index.ts`
**Verification:** `npm test -- --run`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 3: 接入 FloatingToolbar、SlashMenu 与编辑器右键菜单

**Files:** `src/editor/ui/FloatingToolbar.tsx`, `src/editor/ui/SlashMenu.tsx`, `src/editor/plugins/slash-menu.ts`, `src/editor/rich-ui.ts`, 编辑器右键菜单接入文件
**Verification:** `npm test -- --run`; `npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

### Step 4: 增补测试、同步控制面并完成整体验证

**Files:** 相关 `src/**/__tests__/`, `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`, `docs/PLANS.md`, `docs/exec-plans/active/2026-04-22-skill-editor-ai-insert.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`; `npm test -- --run`; `npm run build`

Status: ⬜ Not started
Evidence:
Deviations:

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ⬜ |  | 待建立 Skill 文件真源与解析服务 |
| 2 | ⬜ |  | 待建立 editor AI insert 与写入高亮 |
| 3 | ⬜ |  | 待接入工具栏、slash 和右键菜单入口 |
| 4 | ⬜ |  | 待补测试、同步控制面并完成归档验证 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| Skill 真源落在仓库 `skills/*.md` | 任务要求内置 Skill 文件且需避免后续漂移 | 把 Skill 目录硬编码进组件或 store | 让 Skill 能被统一解析、测试和演进，避免多份常量源 |
| AI 写入以 editor command + plugin 实现 | 现有 `RefinexEditor` 已有 `dispatchTransaction` 与 plugin 体系 | 在组件层直接 `view.dispatch` 零散拼接 | 将插入逻辑、高亮反馈、完成清理集中到 editor domain |
| `chat-response` 复用现有 AI 面板链路 | 已有 `aiStore` / `ChatPanel` 流式会话系统 | 为 Skill 另起一套聊天结果状态 | 避免重复实现 AI 流式状态机 |
| `new-document` 复用 `noteStore` 文件能力 | 现有工作区文件创建/打开/更新路径已存在 | 直接在 editor command 内写文件 | 保持文件 IO 仍然经 store/service seam 流动 |

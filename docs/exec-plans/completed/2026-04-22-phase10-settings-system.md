# Execution Plan: Phase 10 Settings System

Created: 2026-04-22
Status: Active
Author: agent

## Objective

在现有应用 shell 内落地完整设置系统，使主题、编辑器偏好、Git 同步偏好、AI Provider 配置与 API Key 存储都通过 Rust 原生真源统一读写，并由全屏设置面板承载交互。

## Scope

**In scope:**
- `src/App.tsx`
- `src/components/settings/SettingsDialog.tsx`
- `src/components/settings/GeneralSettings.tsx`
- `src/components/settings/EditorSettings.tsx`
- `src/components/settings/AIProviderConfig.tsx`
- `src/components/settings/GitSettings.tsx`
- `src/components/settings/ShortcutSettings.tsx`
- `src/components/settings/AccountSettings.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/slider.tsx`
- `src/stores/settingsStore.ts`
- `src/services/settingsService.ts`
- `src/stores/aiStore.ts`
- `src/types/settings.ts`
- `src-tauri/src/commands/settings.rs`
- `src-tauri/src/commands/ai.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/db.rs`
- `src-tauri/src/ai/mod.rs`
- 与设置系统 / AI Provider 配置直接相关的前后端测试
- `docs/ARCHITECTURE.md`
- `docs/OBSERVABILITY.md`
- `docs/PLANS.md`

**Out of scope:**
- 完整快捷键重绑定系统
- 远端模型目录动态刷新
- GitHub 之外的账户体系扩展
- 全量主题 token 重设计
- 新的 onboarding 或独立设置页面路由

## Constraints

- 设置持久化必须遵循 `settingsStore -> service -> Tauri command -> SQLite/keyring`
- API Key 只允许存入操作系统 keyring，不写入 SQLite，不回传前端明文
- Provider 与模型目录仍以原生层为真源，前端只编辑和消费原生返回结果
- 继续复用现有 `src/components/ui/`、`src/services/`、`src/stores/` 和 `src-tauri/src/commands/` 接缝，不创建并行设置体系
- 主题模式需要升级为 `light | dark | system`，并由设置真源驱动应用壳层
- 当前工作区自动恢复逻辑必须受“启动时打开上次工作区”设置控制

## Acceptance Criteria

- [ ] AC-1: 设置按钮与命令面板都能打开全屏 `SettingsDialog`，左侧分类和右侧内容可以正常切换
- [ ] AC-2: 通用、编辑器、Git、账户设置均可通过原生 settings command 持久化；重启后主题与核心偏好保持生效
- [ ] AC-3: AI Provider 配置面板支持内置 Provider、自定义 OpenAI-compatible Provider、默认 Provider/Model、模型目录编辑，以及启用/禁用状态保存
- [ ] AC-4: API Key 通过原生 keyring 写入并在测试连接时使用；SQLite 与前端状态中不持久保存明文 API Key
- [ ] AC-5: “测试连接”会通过 Rust `ai_test_connection` 发起真实最小联网请求，能验证当前 Provider API Key 与模型有效性
- [ ] AC-6: 关闭“启动时打开上次工作区”后，应用启动不再自动恢复最近工作区；打开后恢复现有行为
- [ ] AC-7: AI 面板的 Provider / Model 读取结果会反映设置页保存后的原生最新配置
- [ ] AC-8: `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test -- --run`、`npm run build` 均通过

## Risk Notes

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| 设置 schema 一次性扩展过大，前后端字段容易漂移 | Med | 先定义原生 typed settings 结构和命令，再让前端严格消费同名字段 |
| API Key 编辑流程容易误把明文落进 SQLite 或日志 | Med | 明确拆分 provider 元数据与 keyring 写入命令，序列化结构不含 `apiKey` |
| `ai_test_connection` 真实联网后，不同 Provider 最小请求格式差异增加复杂度 | Med | 复用现有 provider 客户端，仅新增最小同步探活方法，并从 Anthropic / OpenAI-compatible 两类抽象切入 |
| 全屏设置弹窗可能与现有 App shell theme / Dialog 样式冲突 | Low | 复用现有 Dialog wrapper，仅扩展全屏布局与设置专用分栏内容 |

## Implementation Steps

### Step 1: 定义原生 settings 协议与 AI Provider 配置写路径

**Files:** `src-tauri/src/commands/settings.rs`, `src-tauri/src/commands/ai.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/db.rs`, `src-tauri/src/ai/mod.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: ✅ Done
Evidence:
- `src-tauri/src/commands/settings.rs` 已落地 typed settings schema、`load_settings` / `save_settings` / `read_setting` / `write_setting`
- `src-tauri/src/commands/ai.rs` 已新增 provider settings 读写、runtime provider 过滤、真实 `ai_test_connection` 联网探活路径
- `src-tauri/src/ai/mod.rs` 已扩展 `enabled`、自定义 OpenAI-compatible provider、builtin provider presets 与 API key keyring helper
- `src-tauri/src/ai/providers.rs` 已补最小探活请求体
- `cargo test --manifest-path src-tauri/Cargo.toml` 通过（74 passed）
Deviations:
- `ai_test_connection` 从原计划里的配置校验语义升级为真实最小联网请求，先在原生层完成以避免设置页自己探活第三方 API

### Step 2: 接入前端 settings service/store 与应用壳层主题恢复逻辑

**Files:** `src/services/settingsService.ts`, `src/stores/settingsStore.ts`, `src/types/settings.ts`, `src/App.tsx`, `src/stores/aiStore.ts`
**Verification:** `npm test -- --run`

Status: ✅ Done
Evidence:
- `src/services/settingsService.ts` 已封装 `load_settings` / `save_settings` / `ai_list_provider_settings` / `ai_save_provider_settings` / `ai_test_connection`
- `src/stores/settingsStore.ts` 已落地设置草稿、AI Provider 草稿、模型目录编辑、keyring draft、保存与测试连接动作
- `src/App.tsx` 已改为由 `settingsStore` 驱动主题模式与“启动时打开上次工作区”逻辑
- `src/components/ai/ChatPanel.tsx` 已对齐 settings 中的默认 Provider / Model
- `npm test -- --run` 通过（35 files, 166 tests）
Deviations:
- AI 面板默认选择在前端 `ChatPanel` 接 settings 真源，而不是把 settings 依赖下沉到 `aiStore`，以避免 stores 之间形成循环依赖

### Step 3: 实现全屏设置面板与 AI Provider 配置 UI

**Files:** `src/components/settings/SettingsDialog.tsx`, `src/components/settings/GeneralSettings.tsx`, `src/components/settings/EditorSettings.tsx`, `src/components/settings/AIProviderConfig.tsx`, `src/components/settings/GitSettings.tsx`, `src/components/settings/ShortcutSettings.tsx`, `src/components/settings/AccountSettings.tsx`, `src/components/ui/switch.tsx`, `src/components/ui/slider.tsx`
**Verification:** `npm test -- --run`; `npm run build`

Status: ✅ Done
Evidence:
- `src/components/settings/SettingsDialog.tsx` 已实现全屏设置模态与左侧分类导航
- `src/components/settings/GeneralSettings.tsx`、`EditorSettings.tsx`、`GitSettings.tsx`、`ShortcutSettings.tsx`、`AccountSettings.tsx` 已接 settings/auth store
- `src/components/settings/AIProviderConfig.tsx` 已支持 Provider 卡片、API Key 输入、模型目录编辑、自定义 Provider 和测试连接按钮
- `src/components/ui/switch.tsx` 与 `src/components/ui/slider.tsx` 已补齐 Radix wrapper，并已安装对应依赖
- `npm run build` 通过
Deviations:
- 快捷键分类当前先展示默认映射与扩展入口，完整快捷键重绑定继续保留在后续子任务范围内

### Step 4: 同步控制面并完成整体验证

**Files:** `docs/ARCHITECTURE.md`, `docs/OBSERVABILITY.md`, `docs/PLANS.md`, `docs/exec-plans/active/2026-04-22-phase10-settings-system.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`; `npm test -- --run`; `npm run build`

Status: ✅ Done
Evidence:
- `docs/ARCHITECTURE.md` 已同步设置系统、前端 settings seam、原生 settings/AI 配置命令边界
- `docs/OBSERVABILITY.md` 已更新验证命令统计到 74 Rust tests / 166 Vitest assertions
- `cargo test --manifest-path src-tauri/Cargo.toml`、`npm test -- --run`、`npm run build` 已通过
Deviations:
- `npm run build` 仍保留既有 Tailwind `duration-[120ms]` 歧义告警和 bundle 体积告警，本轮未扩展处理

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| 1 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml` | 原生 settings / AI 配置协议已落地 |
| 2 | ✅ | `npm test -- --run` | 前端 settings service/store 与应用壳层接通 |
| 3 | ✅ | `npm run build` | 全屏设置面板与 AI Provider 配置 UI 已落地 |
| 4 | ✅ | `cargo test --manifest-path src-tauri/Cargo.toml`; `npm test -- --run`; `npm run build` | 控制面同步完成，计划可归档 |

## Decision Log

| Decision | Context | Alternatives Considered | Rationale |
| -------- | ------- | ----------------------- | --------- |
| 快捷键分类本轮先做设置入口和只读说明，不实现完整自定义绑定 | 用户目标含“快捷键自定义”，但当前仓库尚无统一 keymap 配置层 | 同轮补齐完整快捷键重绑定 | 先保证设置系统闭环和 AI Provider 配置交付，避免把范围扩成第二条大线 |
| 自定义 Provider 先限定为 OpenAI-compatible | 现有 Rust provider 层只有 OpenAI-compatible 与 Anthropic 两类协议 | 支持任意自定义协议 | 保持运行时边界清晰，复用现有原生 provider 抽象 |

## Completion Summary

Completed: 2026-04-22
Duration: 4 steps
All acceptance criteria: PASS

Summary:
- Rust 原生层已补齐 typed settings schema、AI Provider settings 读写、keyring API key 存储和真实最小联网 `ai_test_connection`
- 前端已落地 `settingsService` / `settingsStore`、全屏 `SettingsDialog`、完整设置分区和 AI Provider 配置界面
- 应用主题与“启动时打开上次工作区”现在由 settings 真源驱动，AI 面板默认 Provider / Model 会跟随设置结果更新

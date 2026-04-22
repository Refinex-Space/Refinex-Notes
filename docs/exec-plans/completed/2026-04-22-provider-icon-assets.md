# Execution Plan: Provider Icon Assets

Created: 2026-04-22
Completed: 2026-04-22
Status: Completed
Author: agent

## Objective

把用户提供的 AI Provider SVG 图标纳入项目静态资源，并在设置页 `AIProviderConfig` 的 Provider 类型标签前展示对应图标。

## Scope

**In scope:**
- `src/components/settings/AIProviderConfig.tsx`
- `src/assets/provider-icons/*`
- `docs/PLANS.md`

**Out of scope:**
- AI Provider 配置逻辑改造
- 新的图标设计或 SVG 内容修改
- 其它页面的 Provider 图标接入

## Constraints

- 保持 diff 外科手术式，只接入现有资源与当前设置页
- 图标映射应集中定义，不把文件名判断散落到 JSX
- 自定义 Provider 不强行复用错误品牌图标；没有图标时允许优雅回退

## Acceptance Criteria

- [x] AC-1: `/Users/refinex/Downloads/icons` 中的 Provider SVG 已复制到项目内合适位置
- [x] AC-2: `AIProviderConfig` 在 Provider 类型标签前显示对应图标
- [x] AC-3: `npm test -- --run` 与 `npm run build` 通过

## Implementation Steps

### Step 1: 登记计划并准备 Provider 图标资源目录

**Files:** `docs/exec-plans/active/2026-04-22-provider-icon-assets.md`, `docs/PLANS.md`, `src/assets/provider-icons/*`
**Verification:** `ls src/assets/provider-icons`

Status: ✅ Done
Evidence:
- `src/assets/provider-icons/` 已新增 `claude.svg`、`deepseek.svg`、`kimi.svg`、`minimax.svg`、`openai.svg`、`qwen.svg`、`zdotai.svg` 等资源文件
- `git commit -m "plan(harness): 新增 Provider 图标资源执行计划"` 已创建 checkpoint

### Step 2: 在 AIProviderConfig 中接入图标映射与展示

**Files:** `src/components/settings/AIProviderConfig.tsx`
**Verification:** `npm test -- --run`; `npm run build`

Status: ✅ Done
Evidence:
- `src/components/settings/AIProviderConfig.tsx` 已新增集中式 Provider 图标映射，并通过 `ProviderKindBadge` 在标签前渲染图标
- `npm test -- --run` 通过（35 files, 168 tests）
- `npm run build` 通过

## Completion Summary

Completed: 2026-04-22
All acceptance criteria: PASS

Summary:
- 用户提供的 Provider SVG 已复制到 `src/assets/provider-icons/`
- 设置页 `AIProviderConfig` 的 Provider 类型标签现在会在文本前显示对应供应商图标
- GLM 使用用户提供的 `zdotai.svg`，自定义 Provider 保持无品牌图标回退，避免错误品牌映射

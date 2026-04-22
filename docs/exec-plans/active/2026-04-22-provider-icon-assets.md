# Execution Plan: Provider Icon Assets

Created: 2026-04-22
Status: Active
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

- [ ] AC-1: `/Users/refinex/Downloads/icons` 中的 Provider SVG 已复制到项目内合适位置
- [ ] AC-2: `AIProviderConfig` 在 Provider 类型标签前显示对应图标
- [ ] AC-3: `npm test -- --run` 与 `npm run build` 通过

## Implementation Steps

### Step 1: 登记计划并准备 Provider 图标资源目录

**Files:** `docs/exec-plans/active/2026-04-22-provider-icon-assets.md`, `docs/PLANS.md`, `src/assets/provider-icons/*`
**Verification:** `ls src/assets/provider-icons`

Status: ⏳ In Progress

### Step 2: 在 AIProviderConfig 中接入图标映射与展示

**Files:** `src/components/settings/AIProviderConfig.tsx`
**Verification:** `npm test -- --run`; `npm run build`

Status: ⏳ Pending

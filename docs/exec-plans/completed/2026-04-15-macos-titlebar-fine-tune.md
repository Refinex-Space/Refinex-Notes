# Execution Plan: macOS Titlebar Fine Tune

Created: 2026-04-15
Completed: 2026-04-15
Status: Completed
Author: agent

## Objective

继续微调 macOS overlay titlebar：让左侧边栏折叠图标抬到与红绿灯同一视觉中心线，并把右侧面板折叠图标明确固定回窗口右上角。

## Scope

**In scope:**
- `src/components/layout/AppLayout.tsx`
- `docs/PLANS.md`
- 本执行计划文档

**Out of scope:**
- Windows 标题栏布局
- macOS 红绿灯自身坐标再次调整

## Acceptance Criteria

- [x] AC-1: macOS 上左侧折叠图标不再明显偏下。
- [x] AC-2: 右侧面板折叠图标保持在窗口右上角，不会跑到左侧控制区。
- [x] AC-3: `npm run build` 保持通过。

## Implementation Steps

### Step 1: 登记计划

**Files:** `docs/exec-plans/completed/2026-04-15-macos-titlebar-fine-tune.md`, `docs/PLANS.md`
**Verification:** Active plan 已登记

Status: ✅ Done
Evidence: 计划文件已创建并归档，`docs/PLANS.md` 已反映任务完成状态。

### Step 2: 将 macOS titlebar 控件改成绝对定位微调

**Files:** `src/components/layout/AppLayout.tsx`
**Verification:** `npm run build`

Status: ✅ Done
Evidence: macOS titlebar 控件已改为绝对定位，左侧图标锚到 `left-[6.9rem] top-[0.72rem]`，右侧图标锚到 `right-4 top-[0.72rem]`；`npm run build` 通过。

## Completion Summary

Summary: 已完成 macOS titlebar 细调。此次不再用同一行的流式布局硬排两个图标，而是对 macOS 单独改成绝对定位：左侧折叠按钮按像素锚到红绿灯右侧并上移，右侧面板按钮固定回窗口右上角，从而分别解决“左按钮偏下”和“右按钮跑到左边”的问题。验证结果为 `npm run build` 通过。

# Execution Plan: Header TitleBar Refactor

**Objective:** 将顶部 Header 区域的样式和布局完全对齐到 `docs/design-docs/refinex-notes-prototype.html` 原型，包含左侧侧边栏折叠按钮和右侧六个功能按钮（搜索、AI、Git、大纲、主题、设置）的 TBtn 样式与功能实现。

**Started:** 2026-04-18

**Scope:**
- `src/components/layout/AppLayout.tsx` — 重构 header section，添加新 props，添加 searchOpen / activeRightPanel 内部状态
- `src/App.tsx` — 添加 outlineVisible 状态，传入新 props，添加 AiPanelPlaceholder 组件

**Non-scope:**
- AI 面板的实际 AI 功能（用占位符）
- 搜索栏的后端功能（显示 UI shell 即可）
- 右侧面板内容本身（已有 Git 面板保持不动）
- StatusBar、TabBar、侧边栏内部内容

**Constraints (from AGENTS.md):**
- 组件只通过 props/callback 与业务逻辑通信，不在 AppLayout 中嵌入 Git/AI 逻辑
- 原有 `AppLayoutProps` 兼容扩展，不破坏现有调用方

---

## Acceptance Criteria

1. macOS TitleBar 左侧：侧边栏切换按钮使用 `PanelLeft` 图标（16px），按钮尺寸 28×28px，圆角 6px；侧边栏展开时按钮高亮（accent 色 + bg-fg/[0.08]），折叠时静默（text-muted）
2. TitleBar 中央：显示当前文件名 + "— Refinex-Notes"，与原型字号、颜色一致
3. TitleBar 右侧：按顺序排列 Search/AI/Git/Outline/Theme/Settings 六个按钮，每个 28×28px 圆角 6px，激活状态使用 accent 色 + bg-fg/[0.08]
4. 点击 Search 按钮：在 Header 下方展开内联搜索栏（样式匹配原型）
5. 点击 AI 按钮：切换右侧面板为 AI 占位面板（"敬请期待"）
6. 点击 Git 按钮：切换右侧面板为 Git 面板（已有功能）
7. 点击 Outline 按钮：切换 DocumentOutlineDock 的可见性
8. 点击 Theme 按钮：切换亮/暗主题（已有功能，图标跟随主题）
9. 点击 Settings 按钮：打开设置对话框（已有功能）
10. `npm test` 和 `npm run build` 均通过

---

## Implementation Steps

### Step 1: 更新 AppLayoutProps 接口 + 添加内部状态 + 更新导入
- 文件: `src/components/layout/AppLayout.tsx`
- 添加 props: `activeTitle`, `aiPanel`, `theme`, `onThemeToggle`, `outlineVisible`, `onOutlineToggle`, `onSettingsClick`
- 添加内部 state: `searchOpen`, `activeRightPanel`
- 更新 lucide-react 导入：添加 `AlignLeft, GitBranch, Moon, PanelLeft, Search, Settings, Sparkles, Sun, X`
- 添加 `tbtnClass(active: boolean)` 工具函数

### Step 2: 重构 Header JSX（macOS + non-macOS）
- 文件: `src/components/layout/AppLayout.tsx`
- 左侧：`PanelLeft` 按钮，active 当 `!sidebarCollapsed`
- 中央：activeTitle + "— Refinex-Notes" 绝对居中，pointer-events-none
- 右侧：Search / AI / Git / Outline / Theme / Settings 六个按钮
- 搜索栏：在 header 下方条件渲染 searchOpen 内联搜索栏

### Step 3: 更新右侧面板逻辑（activeRightPanel 替换 rightPanelCollapsed）
- 文件: `src/components/layout/AppLayout.tsx`
- `rightPanelCollapsed` → `activeRightPanel === null`
- gridTemplateColumns 使用 activeRightPanel
- 右侧 Collapsible 使用 `open={activeRightPanel !== null}`
- 右侧面板内容：git → rightPanel，ai → aiPanel

### Step 4: 更新 App.tsx 传入新 props + 添加 AiPanelPlaceholder
- 文件: `src/App.tsx`
- 添加 `outlineVisible` state (默认 true)
- 添加 `AiPanelPlaceholder` 组件
- 更新 AppLayout 调用：传入 activeTitle, theme, onThemeToggle, outlineVisible, onOutlineToggle, onSettingsClick, aiPanel
- DocumentOutlineDock 渲染条件加 `&& outlineVisible`

---

## Risk Notes

- **macOS 拖拽区域**: `data-tauri-drag-region` 下的 absolute 按钮可以正常拦截点击，pointer-events-none 的 center div 不会干扰拖拽
- **rightPanelCollapsed 替换**: 原来没有外部消费 rightPanelCollapsed，替换为 activeRightPanel 安全
---

## Completion Summary

Completed: 2026-04-18
Steps completed: 4 steps
All acceptance criteria: PASS

Summary: 重构了 `AppLayout.tsx` 的 Header 区域，使其与原型完全对齐。添加了 `tbtnClass` 工具函数实现 TBtn 风格（28×28px、rounded-md、accent激活态），重写了 macOS 和非 macOS 两种标题栏布局（左侧 PanelLeft 侧边栏按钮、中央文件名标题、右侧 6 个功能按钮）。`rightPanelCollapsed` 替换为 `activeRightPanel: 'git' | 'ai' | null`，支持切换 Git/AI 面板。在 `App.tsx` 中添加了 `outlineVisible` 状态、`AiPanelPlaceholder` 组件，并将主题切换、设置、大纲开关等操作通过 props 传入 AppLayout。`npm run build` 和 131 个 Vitest 测试全部通过。

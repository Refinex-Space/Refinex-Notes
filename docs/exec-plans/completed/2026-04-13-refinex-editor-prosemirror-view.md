# RefinexEditor React 组件 + ProseMirror EditorView 集成

## Objective

将 `src/editor/RefinexEditor.tsx` 从占位 shell 升级为真实的 ProseMirror WYSIWYG 编辑器组件，支持 Markdown 输入/输出、undo/redo、onChange 回调，并配套完整 CSS 样式和 App.tsx 集成。

## Scope

- `src/editor/RefinexEditor.tsx` — 核心编辑器 React 组件（替换占位）
- `src/editor/editor.css` — ProseMirror 容器 + 内容样式（新建）
- `src/editor/index.ts` — editor 模块公共 API 导出（新建）
- `src/components/editor/RefinexEditor.tsx` — 更新为 re-export
- `src/components/editor/index.ts` — 保持现有 re-export
- `src/App.tsx` — 添加 `<RefinexEditor>` 预览 section

## Non-scope

- ProseMirror 插件（菜单栏、toolbar、协同编辑）
- inline-sync（实时双向绑定优化）
- Tauri IPC 文件读写
- 任何 store 变更

## Constraints

- `src/editor/` 托管编辑器 core；`src/components/editor/` 只做 re-export（AGENTS.md Key Patterns）
- React 组件通过 `parseMarkdown` / `serializeMarkdown` 与 Markdown 互转（使用上一阶段实现）
- 不向 `src/editor/` 引入 React 以外的 UI 依赖

## Acceptance Criteria

1. `<RefinexEditor value={md} />` 能正确渲染 Markdown 为格式化富文本
2. 用户可在编辑器中自由输入/删除文字
3. Undo（Ctrl/Cmd+Z）和 Redo（Ctrl/Cmd+Shift+Z）正常工作
4. `onChange(markdown)` 回调返回正确序列化的 Markdown 字符串
5. `npm run build` 通过（无 TypeScript 类型错误）
6. `npm test` 仍全部通过（20 tests）
7. 编辑器在 App.tsx 中可见（`npm run dev` 可见）

## Implementation Steps

### Step 1 — 创建 editor.css
- 新建 `src/editor/editor.css`
- 样式覆盖：`.ProseMirror`、h1-h6、blockquote、code、pre>code、hr、img、a、ul/ol、hard-break
- 暗色模式：`.dark .ProseMirror` 及对应元素
- **Verify**: CSS 文件存在，`npm run build` 通过

### Step 2 — 实现 RefinexEditor.tsx
- 在 `src/editor/RefinexEditor.tsx` 中实现完整组件
- useRef 持有 EditorView，useEffect 初始化/销毁
- 集成插件：history、keymap（历史快捷键 + baseKeymap）、dropcursor、gapcursor
- dispatchTransaction 时序列化并调用 onChange
- readOnly 通过 EditorView.updateState/editable 支持
- 导入 `./editor.css`
- **Verify**: `npm run build` 通过

### Step 3 — 创建 src/editor/index.ts
- 导出 `RefinexEditor`、`refinexSchema`、`parseMarkdown`、`serializeMarkdown`
- **Verify**: `npm run build` 通过

### Step 4 — 更新 src/components/editor/RefinexEditor.tsx
- 改为 re-export from `../../editor/RefinexEditor`
- **Verify**: `npm run build` 通过

### Step 5 — 集成到 App.tsx
- 在 App.tsx 中添加 `<RefinexEditor>` 预览 section
- 提供含丰富语法（标题/列表/代码/引用/表格等）的 testMarkdown 常量
- 用 `useState` 持有 markdown，在 `onChange` 时更新，用 `<pre>` 显示原始 Markdown
- **Verify**: `npm run dev` 页面可见编辑器

## Risk Notes

- ProseMirror EditorView 是命令性 API，需在 useEffect 内部完整管理生命周期以避免 double-mount（React StrictMode）
- `prosemirror-gapcursor` 可能需要额外 css；已在 editor.css 中内联处理
- EditorView 的 `editable` prop 需通过 `props.editable: () => !readOnly` 传递

## Completion Summary

**Completed**: 2026-04-13

All 5 implementation steps completed successfully:

| Step | Commit | Status |
|------|--------|--------|
| Step 1 — editor.css | `4311135` | ✅ |
| Step 2 — RefinexEditor.tsx | `622a179` | ✅ |
| Step 3 — src/editor/index.ts | `f990d8d` | ✅ |
| Step 4 — components re-export | `32aa860` | ✅ |
| Step 5 — App.tsx integration | `60e3f29` | ✅ |

**Acceptance Criteria**:
- ✅ `<RefinexEditor value={md} />` 正确渲染富文本
- ✅ 支持自由输入/删除
- ✅ Undo/Redo 快捷键集成
- ✅ `onChange` 回调返回序列化 Markdown
- ✅ `npm run build` 通过（零 TypeScript 错误）
- ✅ `npm test` 全部通过（20/20）
- ✅ App.tsx 包含双栏编辑器预览 section

# Refinex Notes Conplete Plans

> **项目**：Refinex-Notes — 超越 Typora 的 AI-Native Markdown 笔记软件
> **技术栈**：Tauri 2.0 + React 18 + Radix UI + Tailwind CSS + ProseMirror + markdown-it + git2-rs + Rust
> **配套文档**：`Refinex-Notes 完整技术架构文档.md`（完整技术架构）、`Refinex-Notes 自研编辑器可行性深度调研报告.md`（编辑器自研可行性调研）
> **使用方式**：按 Phase 顺序，将每个 Task 的代码框内容完整复制给 AI 编码助手执行

---

## Phase 0: 项目脚手架初始化

> 目标：从零创建 Tauri 2 + React + Vite + Tailwind CSS + Radix UI 项目骨架，确保 `cargo tauri dev` 能启动一个空白窗口。

### 0.1 创建 Tauri 2 + React + Vite 项目

```
/harness-feat

## 任务：初始化 Refinex-Notes 项目骨架

从零创建一个 Tauri 2.x + React 18 + TypeScript + Vite 项目。项目名为 `refinex-notes`。

### 具体步骤

1. 使用 `npm create tauri-app@latest refinex-notes -- --template react-ts` 创建项目（或手动等效操作）。
2. 确认 `src-tauri/Cargo.toml` 中 tauri 版本为 2.x（>=2.10）。
3. 确认 `src-tauri/tauri.conf.json` 中 `productName` 为 "Refinex-Notes"，`identifier` 为 "dev.refinex.notes"。
4. 在 `src-tauri/src/lib.rs` 中确认 Tauri app builder 基本结构可编译运行。
5. 运行 `cargo tauri dev` 确保窗口正常弹出，React 页面正常显示。

### 技术约束
- Tauri 2.x（不是 1.x）
- React 18+，TypeScript strict mode
- Vite 作为构建工具（Tauri 官方推荐）
- 窗口默认尺寸 1280x800，标题 "Refinex-Notes"

### 验收标准
- `cargo tauri dev` 成功启动
- 窗口显示 React 默认页面
- 无编译错误和警告
```

### 0.2 集成 Tailwind CSS + Radix UI + 基础 UI 组件

```
/harness-feat

## 任务：集成 Tailwind CSS 4.x + Radix UI + Lucide Icons + cmdk

在已有的 Tauri + React + Vite 项目基础上，集成前端 UI 基础设施。

### 具体步骤

1. 安装并配置 Tailwind CSS（使用最新的 v4 或 v3 稳定版，按官方 Vite 集成指南）。
2. 安装 `tailwindcss-animate` 插件用于 Radix 动画。
3. 在 tailwind.config 中配置暗色模式为 `class` 策略，扩展 theme 添加以下 CSS 变量映射：
   - `--color-bg`, `--color-fg`, `--color-muted`, `--color-accent`, `--color-border`
4. 安装以下 Radix UI 原语组件（每个都是独立包）：
   - `@radix-ui/react-dialog`
   - `@radix-ui/react-popover`
   - `@radix-ui/react-context-menu`
   - `@radix-ui/react-dropdown-menu`
   - `@radix-ui/react-select`
   - `@radix-ui/react-tabs`
   - `@radix-ui/react-tooltip`
   - `@radix-ui/react-toast`
   - `@radix-ui/react-collapsible`
   - `@radix-ui/react-toolbar`
   - `@radix-ui/react-toggle-group`
   - `@radix-ui/react-alert-dialog`
   - `@radix-ui/react-accordion`
5. 安装 `cmdk`（命令面板组件）、`lucide-react`（图标库）。
6. 创建 `src/components/ui/` 目录，为以下组件创建 Tailwind-styled 封装：
   - `dialog.tsx` — 封装 Radix Dialog + Tailwind 动画样式
   - `popover.tsx` — 封装 Radix Popover
   - `tooltip.tsx` — 封装 Radix Tooltip
   - `toast.tsx` — 封装 Radix Toast + ToastProvider
   - `command.tsx` — 封装 cmdk 命令面板

   每个封装组件需：使用 Tailwind 类名定义样式，使用 `data-[state=open/closed]` 属性选择器实现进入/退出动画，支持 `dark:` 暗色模式变体。
7. 安装 Zustand 和 Jotai 作为状态管理。
8. 在 `src/App.tsx` 中渲染一个测试页面，验证 Dialog、Tooltip、Toast、CommandPalette 均可正常弹出和交互。

### 技术约束
- Radix UI 是 headless 组件，所有视觉样式必须通过 Tailwind CSS 自定义
- 不使用 shadcn/ui 的 CLI 安装方式，手动创建封装以完全控制样式
- 暗色/亮色主题切换通过 html 元素的 class="dark" 控制
- 图标统一使用 lucide-react，不混用其他图标库

### 验收标准
- Tailwind 样式正常生效（包括暗色模式）
- 所有 Radix 组件可正常渲染和交互
- Cmd+K 弹出 cmdk 命令面板
- 零 TypeScript 类型错误
```

### 0.3 Zustand Store 初始骨架

```
/harness-feat

## 任务：创建全部 Zustand Store 的初始骨架

在 `src/stores/` 目录下创建以下 Zustand store 文件，每个仅包含类型定义和空 action 签名（后续 Phase 逐步实现）。

### 需要创建的 Store

1. `authStore.ts` — 认证状态
   - state: `{ user: UserProfile | null, isAuthenticated: boolean, isLoading: boolean }`
   - actions: `login()`, `logout()`, `checkAuth()`
   - 类型: `UserProfile { login: string, name: string | null, avatar_url: string, email: string | null }`

2. `noteStore.ts` — 笔记文件状态
   - state: `{ files: FileNode[], currentFile: string | null, openFiles: string[], recentFiles: string[] }`
   - actions: `openFile(path)`, `closeFile(path)`, `createFile(path)`, `deleteFile(path)`, `renameFile(old, new)`, `refreshFileTree()`
   - 类型: `FileNode { name: string, path: string, isDir: boolean, children?: FileNode[], gitStatus?: 'added'|'modified'|'deleted'|'untracked'|'clean' }`

3. `editorStore.ts` — 编辑器状态
   - state: `{ activeTab: string | null, unsavedChanges: Set<string>, cursorPosition: { line: number, col: number } }`
   - actions: `setActiveTab(path)`, `markDirty(path)`, `markClean(path)`

4. `gitStore.ts` — Git 同步状态
   - state: `{ syncStatus: 'synced'|'syncing'|'dirty'|'conflicted'|'offline'|'not-initialized', lastSyncTime: Date | null, changedFiles: string[] }`
   - actions: `commit(message)`, `push()`, `pull()`, `getHistory(path)`, `initRepo()`

5. `aiStore.ts` — AI 对话状态
   - state: `{ messages: AIMessage[], isStreaming: boolean, activeProvider: string, activeModel: string }`
   - actions: `sendMessage(content)`, `cancelStream()`, `clearHistory()`, `switchProvider(id)`
   - 类型: `AIMessage { id: string, role: 'user'|'assistant', content: string, timestamp: Date }`

6. `settingsStore.ts` — 用户设置
   - state: `{ theme: 'light'|'dark'|'system', fontSize: number, fontFamily: string, aiProviders: AIProviderConfig[], autoSync: boolean, syncInterval: number }`
   - actions: `updateSetting(key, value)`, `loadSettings()`, `saveSettings()`
   - 类型: `AIProviderConfig { id: string, name: string, baseUrl: string, apiKey: string, models: string[], enabled: boolean }`

### 技术约束
- 使用 Zustand 的 `create` + `immer` 中间件
- 每个 store 导出一个 `use[Name]Store` hook
- 所有类型定义放在 `src/types/` 目录下的独立文件中

### 验收标准
- 所有 store 文件可正常导入，TypeScript 无类型错误
- 类型定义完整且符合架构文档描述
```

---

## Phase 1: Refinex Editor — Foundation

> 目标：实现 ProseMirror Schema + markdown-it Parser + Serializer，能够加载一个 Markdown 文件，正确渲染为格式化文本，编辑后无损序列化回 Markdown。这是编辑器一切后续工作的基础。

### 1.1 ProseMirror Schema 定义

```
/harness-feat

## 任务：定义 Refinex Editor 的 ProseMirror Schema

创建 `src/editor/schema.ts`，定义完整的 Markdown 文档模型。

### 具体要求

1. 以 `prosemirror-markdown` 包的 `schema` 为起点进行扩展（不要从零写，先 import 它作为参考）。
2. Node 类型必须包含：
   - `doc` — 根节点，content: "block+"
   - `paragraph` — 段落，content: "inline*"，group: "block"
   - `heading` — 标题，attrs: { level: 1-6 }，content: "inline*"，group: "block"
   - `blockquote` — 引用，content: "block+"，group: "block"
   - `code_block` — 代码块，attrs: { language: string }，content: "text*"，group: "block"，code: true，defining: true
   - `horizontal_rule` — 分割线，group: "block"
   - `ordered_list` — 有序列表，content: "list_item+"，group: "block"，attrs: { start: number }
   - `bullet_list` — 无序列表，content: "list_item+"，group: "block"
   - `list_item` — 列表项，content: "paragraph block*"，defining: true
   - `image` — 图片，attrs: { src, alt, title }，group: "block"，atom: true
   - `hard_break` — 硬换行，group: "inline"，inline: true
   - `task_list_item` — 任务列表项（GFM 扩展），attrs: { checked: boolean }，content: "paragraph block*"
3. Mark 类型必须包含：
   - `strong` — 加粗
   - `em` — 斜体
   - `code` — 行内代码
   - `link` — 链接，attrs: { href, title }
   - `strikethrough` — 删除线（GFM 扩展）
4. 每个 Node 和 Mark 必须定义 `toDOM()` 和 `parseDOM` 方法。
5. 导出 `refinexSchema` 作为默认 Schema。

### 需要安装的依赖

npm install prosemirror-model prosemirror-state prosemirror-view prosemirror-transform prosemirror-commands prosemirror-keymap prosemirror-inputrules prosemirror-history prosemirror-markdown prosemirror-dropcursor prosemirror-gapcursor markdown-it
npm install -D @types/markdown-it

### 文件路径
- `src/editor/schema.ts`

### 验收标准
- `refinexSchema` 可正常实例化
- 所有 Node/Mark 类型通过 `schema.nodes.xxx` / `schema.marks.xxx` 可访问
- TypeScript 无类型错误
```

### 1.2 Markdown Parser 与 Serializer

```
/harness-feat

## 任务：实现 Markdown ↔ ProseMirror 双向转换

创建 `src/editor/parser.ts` 和 `src/editor/serializer.ts`，基于 `prosemirror-markdown` 包的 `MarkdownParser` 和 `MarkdownSerializer` 类。

### 具体要求

#### parser.ts
1. 使用 `markdown-it` 实例作为 tokenizer，启用以下插件：
   - GFM 表格（markdown-it 内置）
   - 删除线（markdown-it 内置的 `strikethrough` 选项）
   - 任务列表（安装 `markdown-it-task-lists`）
2. 配置 `MarkdownParser`，将 markdown-it token 映射到 Phase 1.1 定义的 `refinexSchema` 节点：
   - `heading_open` → heading（提取 level 从 tag h1-h6）
   - `bullet_list_open` → bullet_list
   - `ordered_list_open` → ordered_list（提取 start attr）
   - `list_item_open` → list_item
   - `code_block` / `fence` → code_block（提取 language 从 info string）
   - `hr` → horizontal_rule
   - `image` → image
   - `hardbreak` → hard_break
   - `em_open` → em mark
   - `strong_open` → strong mark
   - `code_inline` → code mark
   - `link_open` → link mark（提取 href, title）
   - `s_open` → strikethrough mark
3. 导出 `refinexParser` 实例及 `parseMarkdown(content: string): ProseMirrorNode` 函数。

#### serializer.ts
1. 配置 `MarkdownSerializer`，将 ProseMirror 节点逆向映射回 Markdown 文本：
   - heading → `# ` / `## ` 等前缀
   - bullet_list → `- ` 前缀
   - ordered_list → `1. ` 前缀
   - code_block → ``` 围栏 + language info
   - blockquote → `> ` 前缀
   - horizontal_rule → `---`
   - image → `![alt](src "title")`
   - hard_break → `\n`（或两个末尾空格）
   - strong → `**...**`
   - em → `*...*`
   - code → `` `...` ``
   - link → `[text](href "title")`
   - strikethrough → `~~...~~`
2. 导出 `refinexSerializer` 实例及 `serializeMarkdown(doc: ProseMirrorNode): string` 函数。

### Round-trip 测试
创建 `src/editor/__tests__/roundtrip.test.ts`，包含以下测试用例：
- 基本段落文本：parse → serialize 后与原文一致
- 嵌套列表：保持缩进层级
- 代码块：保持语言标记和内容
- 混合格式：`**bold _and italic_**` 保持嵌套
- GFM 表格：保持对齐格式
- 任务列表：`- [x] done` 和 `- [ ] todo` 保持 checked 状态
- 空文档：parse 空字符串不报错

### 文件路径
- `src/editor/parser.ts`
- `src/editor/serializer.ts`
- `src/editor/__tests__/roundtrip.test.ts`

### 验收标准
- 所有 round-trip 测试通过
- Markdown → ProseMirror → Markdown 无损（空白差异可接受，语义必须一致）
```

### 1.3 基础 EditorView + React 集成

```
/harness-feat

## 任务：创建基础 RefinexEditor React 组件，集成 ProseMirror EditorView

创建 `src/editor/RefinexEditor.tsx`——编辑器的主 React 组件。此阶段不包含 inline-sync，仅做基础 WYSIWYG 渲染。

### 具体要求

1. 使用 `useRef` 持有 ProseMirror `EditorView` 实例。
2. 在 `useEffect` 中初始化 EditorView：
   - 从 `value` prop（Markdown 字符串）通过 `parseMarkdown()` 创建初始 document
   - 创建 `EditorState`，加载以下插件：
     - `prosemirror-history`（keymap: undo/redo）
     - `prosemirror-keymap`（baseKeymap）
     - `prosemirror-dropcursor`
     - `prosemirror-gapcursor`
   - 将 EditorView 挂载到 ref div 上
3. 组件 Props 接口：
   
   interface RefinexEditorProps {
     value: string;                    // Markdown 内容
     onChange?: (markdown: string) => void;  // 内容变更回调
     readOnly?: boolean;
     className?: string;
   }
4. 在 `dispatchTransaction` 中，每次文档变更时通过 `serializeMarkdown()` 序列化并调用 `onChange`。
5. 添加基础 CSS 样式（在 `src/editor/editor.css` 中）：
   - `.ProseMirror` 容器：无 outline，min-height 100%，padding 合理
   - `h1-h6` 标题样式差异化（字号递减、字重区分）
   - `blockquote` 左边框 + 缩进
   - `code` 行内代码背景色
   - `pre > code` 代码块样式
   - `hr` 分割线样式
   - `img` 最大宽度 100%
   - `a` 链接颜色
   - 列表的缩进和标记样式
   - 暗色模式（`.dark .ProseMirror`）下的所有对应样式
6. 在 `src/App.tsx` 中渲染 `<RefinexEditor value={testMarkdown} />`，其中 `testMarkdown` 是一段包含各种 Markdown 语法的测试字符串。

### 文件路径
- `src/editor/RefinexEditor.tsx`
- `src/editor/editor.css`
- `src/editor/index.ts`（导出公共 API）

### 验收标准
- 编辑器正确渲染 Markdown 内容为格式化文本
- 可以在编辑器中输入和删除文本
- Undo/Redo 正常工作（Ctrl+Z / Ctrl+Shift+Z）
- `onChange` 回调返回正确的 Markdown 字符串
```

---

## Phase 2: Refinex Editor — Inline Sync & Interactions

> 目标：实现 Typora 式"所见即所得"的核心体验——输入 Markdown 语法时实时渲染为格式化内容。

### 2.1 Inline Sync 插件

```
/harness-feat

## 任务：实现 Typora 式 inline-sync 插件——编辑器的核心差异化能力

创建 `src/editor/plugins/inline-sync.ts`。这是 Refinex Editor 最核心的 ~800 行代码，实现"输入 Markdown 语法时实时渲染"的体验。

### 背景原理

此插件采用"序列化-重解析"算法（与 Milkdown 的 inline-sync 相同的核心思路，但完全独立实现）：当用户在某行输入内容时，插件将该行的 ProseMirror Node 序列化为 Markdown，然后重新解析回 ProseMirror Node，如果新旧节点结构不同（说明用户输入了有效的 Markdown 语法），则用新节点替换旧节点。整个过程在 ProseMirror 的 `appendTransaction` 钩子中执行。

### 具体要求

1. 创建一个 ProseMirror Plugin，key 为 `refinexInlineSyncKey`。

2. 在 `appendTransaction(transactions, oldState, newState)` 中实现以下逻辑：
   a. 检查是否有文档变更（`transactions.some(tr => tr.docChanged)`），无变更则跳过
   b. 遍历 `transactions` 中的 mapping，找到所有变更的文本范围
   c. 对每个变更范围，通过 `newState.doc.nodesBetween()` 找到受影响的 textblock 节点（段落、标题等）
   d. 对每个受影响的 textblock：
      - 使用 serializer 将其序列化为 Markdown 字符串
      - 计算光标相对于该节点起始位置的偏移量
      - 在 Markdown 字符串的光标位置插入零宽空格占位符 `\u200B`
      - 使用 parser 将含占位符的 Markdown 重新解析为 ProseMirror Fragment
      - 从解析结果中找到占位符位置（即新的光标位置）
      - 移除占位符后，比较新旧节点内容
      - 如果内容/结构不同，创建 Transaction 替换该节点
      - 设置新的光标位置（Selection）

3. 需要处理的边缘情况：
   - 光标在行首/行尾时的特殊处理
   - 空行不触发重解析
   - 代码块内部不触发 inline-sync（代码块是 `code: true` 节点）
   - 连续快速输入时的防抖（可选，如果性能足够则不需要）
   - 多行选区删除后的处理

4. 导出 `inlineSyncPlugin()` 工厂函数，接收 parser 和 serializer 作为参数。

### 关键参考
- Milkdown inline-sync 源码（`@milkdown/preset-commonmark` 中的 `inline-sync` 目录）——学习算法思路，但不要直接复制代码，因为 Milkdown 代码与其 DI 容器耦合
- ZuuNote 博客文章 `zuunote.com/blog/how-to-build-a-markdown-editor-with-real-time-editing/` ——理解 Decoration 替代方案的局限性
- ProseMirror Guide 中的 `appendTransaction` 文档

### 文件路径
- `src/editor/plugins/inline-sync.ts`

### 验收标准（逐一手动测试）
- 输入 `**bold**`：当第二个 `**` 闭合时，文本立即变为加粗样式
- 输入 `*italic*`：闭合时立即变斜体
- 输入 `# Heading`：空格后立即变为 h1 标题
- 输入 `` `code` ``：闭合时立即变为行内代码样式
- 输入 `[link](url)`：闭合时立即渲染为可点击链接
- 输入 `~~strike~~`：闭合时立即显示删除线
- 光标移入已格式化的区域时，能看到原始 Markdown 语法（可选，此版本可先不实现）
- Undo（Ctrl+Z）能正确撤销 inline-sync 触发的格式变更
- 连续快速输入不会导致光标跳动或内容丢失
```

### 2.2 Input Rules & Keymap

```
/harness-feat

## 任务：实现 Markdown 快捷输入规则和键盘映射

创建 `src/editor/plugins/input-rules.ts` 和 `src/editor/plugins/keymap.ts`。

### input-rules.ts 具体要求

使用 `prosemirror-inputrules` 的 `inputRules`、`wrappingInputRule`、`textblockTypeInputRule` 创建以下规则：

1. **块级规则**（在行首输入触发）：
   - `# ` → h1（`textblockTypeInputRule(/^#\s$/, heading, { level: 1 })`）
   - `## ` → h2，`### ` → h3，以此类推到 `###### ` → h6
   - `> ` → blockquote（`wrappingInputRule(/^>\s$/, blockquote)`）
   - `- ` 或 `* ` → bullet_list（wrapping）
   - `1. ` → ordered_list（wrapping，提取起始数字）
   - ``` ``` ``` → code_block（textblockType，可选提取语言）
   - `---` → horizontal_rule（直接替换为 hr 节点）
   - `- [ ] ` → task_list_item（checked: false）
   - `- [x] ` → task_list_item（checked: true）

2. **行内规则**（注意：inline-sync 已处理大部分行内格式化，此处仅作为补充/回退）：
   - 如果 inline-sync 已生效，则行内 InputRules 可以省略，避免重复处理

3. 导出 `refinexInputRules()` 函数返回 InputRules 插件。

### keymap.ts 具体要求

使用 `prosemirror-keymap` 和 `prosemirror-commands` 创建以下键盘映射：

1. **格式快捷键**：
   - `Mod-b` → toggleMark(strong)
   - `Mod-i` → toggleMark(em)
   - `Mod-`` ` `` → toggleMark(code)
   - `Mod-k` → 弹出链接编辑（暂时用 prompt() 替代，Phase 3 改为 Radix Popover）
   - `Mod-Shift-x` → toggleMark(strikethrough)

2. **块操作快捷键**：
   - `Mod-Shift-1` 到 `Mod-Shift-6` → setBlockType(heading, { level: N })
   - `Mod-Shift-0` → setBlockType(paragraph)（取消标题）
   - `Tab` → 列表缩进（sinkListItem）
   - `Shift-Tab` → 列表取消缩进（liftListItem）
   - `Enter` → 在列表项/引用中智能换行（splitListItem 或 exitCode）
   - `Mod-Enter` → 在代码块中退出代码块
   - `Backspace` → 在空列表项/引用中取消包裹（liftEmptyBlock）

3. **编辑器操作**：
   - `Mod-z` → undo
   - `Mod-Shift-z` / `Mod-y` → redo
   - `Mod-a` → selectAll

4. 将 `baseKeymap` 作为最低优先级兜底。
5. 导出 `refinexKeymap()` 函数返回 keymap 插件。

### 文件路径
- `src/editor/plugins/input-rules.ts`
- `src/editor/plugins/keymap.ts`

### 验收标准
- 在空行输入 `## ` 后文本变为 h2 标题
- 在空行输入 `> ` 后进入引用块
- 在空行输入 `- ` 后进入无序列表
- Ctrl+B 切换加粗，Ctrl+I 切换斜体
- Tab/Shift-Tab 在列表中正确缩进/取消缩进
- Enter 在列表项中正确分裂列表项
- 在空列表项按 Enter 或 Backspace 退出列表
```

### 2.3 整合编辑器插件并更新 RefinexEditor

```
/harness-feat

## 任务：将 inline-sync、input-rules、keymap 集成到 RefinexEditor 组件

更新 `src/editor/RefinexEditor.tsx`，在 EditorState 的 plugins 中加载所有 Phase 1-2 实现的插件。

### 具体要求

1. 更新 `EditorState.create()` 的 plugins 数组，按以下顺序加载：
   - `refinexKeymap()`（最高优先级的自定义快捷键）
   - `keymap(baseKeymap)`（基础快捷键兜底）
   - `refinexInputRules()`（输入规则）
   - `inlineSyncPlugin(refinexParser, refinexSerializer)`（inline-sync 核心）
   - `history()`（undo/redo）
   - `dropCursor()`（拖拽光标指示）
   - `gapCursor()`（Gap 光标支持）

2. 创建 `src/editor/plugins/placeholder.ts`：
   - 当文档为空时显示占位提示文字（如 "输入 / 唤出命令，或开始写作..."）
   - 使用 ProseMirror Decoration.widget 实现

3. 创建 `src/editor/plugins/trailing-node.ts`：
   - 确保文档末尾始终有一个空段落，方便用户在最后一个块之后继续输入

4. 更新 `editor.css` 添加以下样式：
   - 占位符文字样式（灰色、斜体）
   - 光标样式（确保在暗色模式下可见）

### 文件路径
- `src/editor/RefinexEditor.tsx`（更新）
- `src/editor/plugins/placeholder.ts`（新建）
- `src/editor/plugins/trailing-node.ts`（新建）

### 验收标准
- 打开编辑器，空文档显示占位提示
- 输入 Markdown 语法时实时渲染格式（inline-sync 生效）
- 所有块级快捷键（# heading、> quote、- list）正常工作
- 所有行内快捷键（Ctrl+B/I/K）正常工作
- Undo/Redo 正常工作
- 文档末尾始终可以点击输入
```

---

## Phase 3: Refinex Editor — NodeViews & Rich UI

> 目标：实现代码块（CodeMirror 6）、图片、表格等复杂节点的交互式渲染，以及 Toolbar、SlashMenu 等编辑器 UI。

### 3.1 CodeMirror 6 代码块 NodeView

```
/harness-feat

## 任务：用 CodeMirror 6 实现交互式代码块 NodeView

创建 `src/editor/node-views/CodeBlockView.tsx`，在 ProseMirror 的代码块节点位置嵌入 CodeMirror 6 编辑器。

### 具体要求

1. 安装依赖：`@codemirror/view`、`@codemirror/state`、`@codemirror/language`、`@codemirror/lang-javascript`、`@codemirror/lang-python`、`@codemirror/lang-rust`、`@codemirror/lang-html`、`@codemirror/lang-css`、`@codemirror/lang-markdown`、`@codemirror/lang-json`。

2. 实现 ProseMirror NodeView 接口：
   - `dom`：一个容器 div，包含语言选择器 + CodeMirror 编辑器区域
   - `contentDOM`：设为 `null`（CodeMirror 管理自己的内容）
   - `update(node)`：当 ProseMirror 文档外部变更代码块内容时，同步到 CodeMirror
   - `selectNode()`：聚焦 CodeMirror
   - `stopEvent()`：让 CodeMirror 处理自己的键盘事件
   - `destroy()`：销毁 CodeMirror 实例

3. 语言选择器：
   - 在代码块顶部显示一个小型下拉菜单（用简单的 select 元素或 Radix Select）
   - 支持的语言：javascript/typescript/python/rust/html/css/json/markdown/plaintext
   - 切换语言时更新 ProseMirror node 的 `language` attr

4. CodeMirror ↔ ProseMirror 双向同步：
   - CodeMirror 内容变更 → 创建 ProseMirror Transaction 更新 code_block 节点的 text content
   - ProseMirror 外部变更 → 通过 `update()` 方法同步到 CodeMirror

5. 在 `RefinexEditor.tsx` 中注册此 NodeView：`nodeViews: { code_block: (node, view, getPos) => new CodeBlockView(node, view, getPos) }`

6. 键盘行为：
   - 在代码块内 `Mod-Enter` 或 `Arrow Down` 在最后一行 → 退出代码块，光标移到下方段落
   - `Tab` → 插入缩进（不是列表操作）
   - `Escape` → 退出代码块

### 文件路径
- `src/editor/node-views/CodeBlockView.tsx`

### 验收标准
- 输入 ``` 后回车进入代码块，CodeMirror 6 编辑器正确显示
- 代码有语法高亮（至少 JavaScript 和 Python）
- 可以在语言选择器中切换语言，高亮随之变化
- 在代码块中按 Mod-Enter 可退出到下方
- Undo/Redo 在代码块内外均正常工作
```

### 3.2 图片 NodeView + 编辑器 Toolbar + SlashMenu

```
/harness-feat

## 任务：实现图片 NodeView、格式 Toolbar 和 Slash 命令菜单

### Part A：图片 NodeView

创建 `src/editor/node-views/ImageView.tsx`：
1. 渲染为 `<figure>` 包含 `<img>` + 可选 `<figcaption>`
2. 点击图片时显示选中状态（边框高亮）
3. 选中时上方显示小工具栏（Radix Popover）：对齐方式（左/中/右）、替换图片、删除
4. 支持拖拽图片文件到编辑器插入（通过 ProseMirror handleDrop 钩子）

### Part B：格式 Toolbar（浮动工具栏）

创建 `src/editor/ui/FloatingToolbar.tsx`：
1. 当用户选中文本时（selection 非空且非光标），在选区上方显示浮动工具栏
2. 使用 Radix Popover 实现（锚定到 selection 的 DOM 坐标）
3. 工具栏按钮：加粗 | 斜体 | 删除线 | 行内代码 | 链接
4. 每个按钮显示激活状态（当前 selection 已有该 mark 时高亮）
5. 点击按钮 → 调用对应的 toggleMark command
6. 获取选区坐标：使用 `view.coordsAtPos(selection.from)` 和 `view.coordsAtPos(selection.to)`

### Part C：Slash 命令菜单

创建 `src/editor/ui/SlashMenu.tsx`：
1. 在空行输入 `/` 时弹出命令面板（使用 cmdk + Radix Popover）
2. 检测方式：在 ProseMirror Plugin 的 `view.update` 中检查光标前字符是否为 `/`
3. 命令列表（每项包含图标 + 名称 + 描述）：
   - 标题 1-3（Heading 1/2/3）
   - 无序列表（Bullet List）
   - 有序列表（Numbered List）
   - 任务列表（Task List）
   - 引用块（Blockquote）
   - 代码块（Code Block）
   - 分割线（Divider）
   - 图片（Image）
   - 表格（Table）— 插入 3x3 默认表格
4. 选择命令后：删除 `/` 字符，执行对应的块级转换 command
5. 支持模糊搜索过滤命令列表
6. 键盘导航：上下箭头选择，Enter 确认，Escape 关闭

### Part D：LinkPopover

创建 `src/editor/ui/LinkPopover.tsx`：
1. 按 Ctrl+K 时弹出链接编辑浮层
2. 字段：URL 输入框 + 标题输入框（可选）
3. 确认后应用 link mark 到当前选区

### 文件路径
- `src/editor/node-views/ImageView.tsx`
- `src/editor/ui/FloatingToolbar.tsx`
- `src/editor/ui/SlashMenu.tsx`
- `src/editor/ui/LinkPopover.tsx`

### 验收标准
- 选中文本时浮动工具栏正确显示在选区上方
- 点击浮动工具栏按钮可切换格式
- 在空行输入 `/` 弹出 Slash 命令菜单
- 选择 Slash 命令后正确插入/转换块
- Ctrl+K 弹出链接编辑，确认后链接正确渲染
```

---

## Phase 4: Application Shell & Rust Backend Foundation

> 目标：构建应用主布局（侧边栏 + 编辑区 + 面板）、Rust 后端文件操作、以及多标签编辑。

### 4.1 应用主布局 + 文件树 + 多标签

```
/harness-feat

## 任务：构建 Refinex-Notes 的应用主界面布局

### 布局结构

┌────────────────────────────────────────────────────────┐
│  Window Title Bar (Tauri draggable region)              │
├──────────┬─────────────────────────────────┬───────────┤
│          │  Tab Bar (open files tabs)       │           │
│  Sidebar │─────────────────────────────────│  Right    │
│          │                                  │  Panel    │
│  - Files │     Editor Area                  │  (AI/Git) │
│  - Search│     (RefinexEditor)              │           │
│  - Outline│                                 │           │
│          │                                  │           │
├──────────┴──────────────────────────────────┴───────────┤
│  Status Bar (sync status, cursor position, word count)  │
└────────────────────────────────────────────────────────┘

### 具体要求

1. 创建 `src/components/layout/AppLayout.tsx`：
   - 三列布局：左侧边栏（240px 默认，可拖拽调整宽度，Radix Collapsible 可折叠）+ 中间编辑区（flex-1）+ 右面板（320px 默认，可折叠）
   - 使用 CSS Grid 或 Flexbox 实现

2. 创建 `src/components/sidebar/FileTree.tsx`：
   - 使用 Radix Accordion 实现可折叠目录结构
   - 使用 Radix ContextMenu 实现右键菜单（新建文件、新建文件夹、重命名、删除、复制路径）
   - 文件图标根据类型区分（.md 用文档图标，文件夹用文件夹图标）
   - 当前打开的文件高亮显示
   - Git 状态颜色标记（绿色=新增，橙色=修改，红色=删除，灰色=忽略）——此阶段用 mock 数据
   - 点击 .md 文件 → 调用 noteStore.openFile()

3. 创建 `src/components/sidebar/OutlinePanel.tsx`：
   - 从当前编辑器文档中提取所有 heading 节点
   - 显示为缩进的目录列表（h1 不缩进，h2 缩进一级，h3 缩进两级）
   - 点击标题 → 编辑器滚动到对应位置

4. 创建 `src/components/editor/TabBar.tsx`：
   - 使用 Radix Tabs 实现多文件标签页
   - 每个标签显示文件名 + 关闭按钮
   - 未保存的文件标签名旁显示圆点标记
   - 支持中键点击关闭标签
   - 标签可拖拽重排（可用 HTML5 drag API 或后续加）

5. 创建 `src/components/layout/StatusBar.tsx`：
   - 左侧：Git 同步状态图标 + 文字
   - 中间：光标位置（行:列）
   - 右侧：字数统计、文档语言

6. 创建全局命令面板 `src/components/CommandPalette.tsx`：
   - Cmd+K 触发（使用 cmdk）
   - 搜索文件（从 noteStore.files 模糊匹配）
   - 搜索命令（如 "切换主题"、"新建文件"、"打开设置"）

### 文件路径
- `src/components/layout/AppLayout.tsx`
- `src/components/layout/StatusBar.tsx`
- `src/components/sidebar/FileTree.tsx`
- `src/components/sidebar/OutlinePanel.tsx`
- `src/components/editor/TabBar.tsx`
- `src/components/CommandPalette.tsx`
- 更新 `src/App.tsx` 使用 AppLayout 作为主界面

### 验收标准
- 三列布局正确渲染，侧边栏可折叠
- 文件树可展开/折叠目录，右键菜单正常显示
- 点击文件在编辑区打开，标签栏正确显示
- 切换标签时编辑器内容切换
- 大纲面板显示当前文档的标题层级
- 状态栏显示光标位置
- Cmd+K 弹出命令面板
```

### 4.2 Rust 后端：文件操作 + 数据库 + 文件监听

```
/harness-feat

## 任务：实现 Rust 后端的文件系统操作、SQLite 元数据库和文件系统监听

### 具体要求

#### 1. AppState 定义 — `src-tauri/src/state.rs`
rust
pub struct AppState {
    pub github_client_id: String,
    pub pending_device_code: Mutex<Option<String>>,
    pub db: Mutex<rusqlite::Connection>,
    pub workspace_path: Mutex<Option<PathBuf>>,
    pub watcher: Mutex<Option<notify::RecommendedWatcher>>,
}

#### 2. 数据库初始化 — `src-tauri/src/db.rs`
- 在应用启动时创建/打开 SQLite 数据库（`~/.refinex-notes/meta.db`）
- 创建表：
  - `settings`：key TEXT PRIMARY KEY, value TEXT
  - `recent_workspaces`：path TEXT PRIMARY KEY, last_opened INTEGER
  - `file_meta`：path TEXT PRIMARY KEY, title TEXT, tags TEXT, modified INTEGER

#### 3. 文件操作 Commands — `src-tauri/src/commands/files.rs`
每个都是 `#[tauri::command]`：
- `open_workspace(path: String)` → 设置工作空间路径，扫描文件树
- `read_file_tree(path: String)` → 返回 `Vec<FileNode>` 递归目录结构（忽略 .git、node_modules、.DS_Store）
- `read_file(path: String)` → 读取文件内容返回 String
- `write_file(path: String, content: String)` → 写入文件
- `create_file(path: String)` → 创建空文件
- `create_dir(path: String)` → 创建目录
- `delete_file(path: String)` → 删除文件/目录
- `rename_file(old_path: String, new_path: String)` → 重命名

#### 4. 文件系统监听 — `src-tauri/src/watcher.rs`
- 使用 `notify` crate 监听工作空间目录
- 文件变更时通过 `app_handle.emit("files-changed", payload)` 通知前端
- 防抖 500ms 避免频繁触发

#### 5. 在 lib.rs 中注册所有 commands 和初始化 AppState

#### 6. 前端 Service 封装 — `src/services/fileService.ts`
- 封装所有文件操作的 Tauri invoke 调用
- 监听 `files-changed` 事件并更新 noteStore

### Cargo.toml 新增依赖
toml
[dependencies]
rusqlite = { version = "0.32", features = ["bundled"] }
notify = "7"
walkdir = "2"

### 验收标准
- 可以选择一个本地文件夹作为工作空间
- 文件树正确显示目录结构
- 点击 .md 文件能读取内容并在编辑器中显示
- 编辑后保存（Ctrl+S）能写回文件
- 外部修改文件后，应用能检测到变更并刷新
```

---

## Phase 5: GitHub OAuth 认证

> 目标：实现 GitHub OAuth Device Flow 登录，Token 安全存储到操作系统钥匙串。

### 5.1 GitHub OAuth 完整实现

```
/harness-feat

## 任务：实现完整的 GitHub OAuth Device Flow 认证系统

### Rust 后端

参照《Refinex-Notes 完整技术架构文档》第三节的完整代码实现以下四个 Tauri Command：

1. `github_auth_start` — 发起 Device Flow，POST `https://github.com/login/device/code`，返回 user_code 和 verification_uri
2. `github_auth_poll` — 轮询等待授权，通过 Tauri Channel 流式通知前端进度，成功后获取 access_token 并存储到 keyring
3. `check_auth_status` — 应用启动时检查已存储的 token 是否有效
4. `github_logout` — 从 keyring 删除 token

### Cargo.toml 新增依赖
toml
keyring = "3"
reqwest = { version = "0.12", features = ["json"] }
tokio = { version = "1", features = ["full"] }

### AppState 更新
添加 `github_client_id: String`（从环境变量或编译时常量读取）和 `pending_device_code: Mutex<Option<String>>`。

### 前端

1. 创建 `src/components/auth/LoginScreen.tsx`：
   - 全屏居中的登录卡片
   - "Refinex-Notes" 标题 + "Markdown 笔记，Git 驱动，AI 增强" 副标题
   - "使用 GitHub 登录" 按钮（带 GitHub 图标）
   - 点击后显示验证码（大号 monospace 字体）和"复制验证码" + "打开浏览器"按钮
   - 等待授权时显示 Spinner + "等待浏览器授权..."
   - 授权成功后自动跳转到主界面

2. 更新 `src/stores/authStore.ts`，实现完整的 login/logout/checkAuth actions，调用对应的 Tauri commands。

3. 更新 `src/App.tsx`：
   - 应用启动时调用 `checkAuth()`
   - 未登录 → 显示 LoginScreen
   - 已登录 → 显示 AppLayout（主界面）
   - loading 状态 → 显示 Splash Screen

4. 创建 `src/services/authService.ts` 封装所有认证相关的 Tauri invoke。

### 安全要点
- `client_id` 可嵌入应用代码（GitHub Device Flow 不需要 client_secret）
- access_token 存储在操作系统钥匙串（macOS Keychain / Windows Credential Manager / Linux Secret Service），键名 "refinex-notes" + "github-token"
- Token 永远不出现在前端日志或 localStorage 中

### 验收标准
- 首次启动显示登录界面
- 点击 GitHub 登录后显示验证码
- 在浏览器完成授权后，应用自动跳转到主界面
- 关闭应用重新打开后自动登录（token 持久化）
- 点击登出后回到登录界面
```

---

## Phase 6: Git 引擎 & 版本同步

> 目标：实现 git2-rs Git 操作、自动同步状态机、以及 Git UI 面板。

### 6.1 Rust Git 引擎

```
/harness-feat

## 任务：使用 git2-rs 实现 Rust Git 操作引擎

### Cargo.toml 新增依赖
toml
git2 = "0.19"

### 具体要求

创建 `src-tauri/src/git/mod.rs` 和子模块：

#### git/mod.rs — Git 操作封装
1. `init_repo(path: &str)` → 在指定路径初始化 Git 仓库
2. `clone_repo(url: &str, path: &str)` → 克隆 GitHub 仓库
3. `get_status(path: &str)` → 返回所有文件的 Git 状态（`Vec<FileStatus>`：path + status enum）
4. `stage_all(path: &str)` → `git add -A`
5. `commit(path: &str, message: &str)` → 创建 commit
6. `push(path: &str)` → 推送到 remote origin
7. `pull(path: &str)` → 拉取并 rebase（`pull --rebase`）
8. `fetch(path: &str)` → 仅 fetch 不合并
9. `get_log(path: &str, file_path: Option<&str>, limit: usize)` → 返回 commit 历史（`Vec<CommitInfo>`：hash, message, author, date）
10. `get_diff(path: &str, commit_hash: &str)` → 返回指定 commit 的 diff

#### git/auth.rs — Token → Git 凭证桥接
- 从 keyring 读取 GitHub OAuth token
- 在 `RemoteCallbacks.credentials` 中使用 `Cred::userpass_plaintext("x-access-token", &token)` 进行 HTTPS 认证

#### git/sync.rs — 自动同步状态机
- 实现后台同步循环（在独立 tokio task 中运行）：
```
  loop {
      sleep(sync_interval) // 默认 60 秒
      fetch()
      if has_remote_changes { pull_rebase() }
      if has_local_changes { stage_all() → commit("auto-sync") → push() }
      emit("git-sync-status", status)
  }
  ```
- 文件保存时触发防抖 30 秒后的即时同步
- 状态机：`not-initialized → dirty → committed → fetching → merging → pushing → synced`（或 `→ conflicted`）
- 冲突检测：pull --rebase 失败时标记为 conflicted，通知前端

#### Tauri Commands — `src-tauri/src/commands/git.rs`
将上述功能暴露为 Tauri Commands：
- `git_init_repo`, `git_clone_repo`, `git_get_status`, `git_commit`, `git_push`, `git_pull`, `git_get_log`, `git_get_diff`
- `git_start_sync(interval_secs: u64)` — 启动自动同步
- `git_stop_sync` — 停止自动同步
- `git_force_sync` — 强制立即同步

### 验收标准
- 可以将本地工作空间初始化为 Git 仓库
- 可以 clone GitHub 上的仓库
- 文件修改后自动 commit + push
- 远端变更能自动 pull 到本地
- 冲突时正确报告 conflicted 状态
  ```

### 6.2 Git UI 面板

```
/harness-feat

## 任务：实现 Git 操作的前端 UI

### 具体要求

1. 创建 `src/components/git/SyncStatus.tsx`：
   - 在 StatusBar 左侧显示同步状态图标：✅ 已同步 / 🔄 同步中 / ⚠️ 冲突 / ❌ 离线 / ⬡ 未初始化
   - Radix Tooltip 悬停显示详细信息（最后同步时间、变更文件数）
   - 点击弹出 Radix Popover 显示快捷操作（立即同步、查看历史、设置）

2. 创建 `src/components/git/HistoryPanel.tsx`：
   - 在右面板中显示当前文件的 commit 历史时间线
   - 每条显示：commit message + 作者 + 相对时间
   - 点击某条 → 显示该 commit 的文档内容（只读模式）

3. 创建 `src/components/git/SetupPanel.tsx`：
   - 仓库未初始化时显示的引导面板
   - 选项 A：初始化新仓库并关联 GitHub remote
   - 选项 B：Clone 已有 GitHub 仓库
   - 使用 GitHub API（复用 OAuth token）列出用户的仓库供选择

4. 更新 `src/components/sidebar/FileTree.tsx`：
   - 集成 Git 状态颜色标记（从 gitStore 读取真实数据）
   - 文件名颜色：绿色 = added, 橙色 = modified, 红色 = deleted, 灰色 = untracked

5. 更新 `src/stores/gitStore.ts`，实现完整 actions（调用 Tauri git commands）。

6. 创建 `src/services/gitService.ts` 封装 Tauri Git invoke + 监听 `git-sync-status` 事件。

### 验收标准
- 状态栏显示实时同步状态
- 文件树显示 Git 状态颜色
- 可以初始化仓库或 Clone 已有仓库
- 版本历史面板正确显示 commit 列表
```

---

## Phase 7: 搜索系统

> 目标：实现 Tantivy 全文搜索 + Nucleo 模糊搜索，集成到前端 UI。

### 7.1 Rust 搜索引擎 + 前端搜索 UI

```
/harness-feat

## 任务：实现 Tantivy 全文搜索 + Nucleo 文件名模糊搜索

### Cargo.toml 新增依赖
toml
tantivy = "0.22"
nucleo-matcher = "0.3"

### Rust 后端

1. 创建 `src-tauri/src/search/mod.rs`：
   - Tantivy Index Schema：path(stored+text), title(text), body(text), tags(text), modified(date)
   - `build_index(workspace_path)` → 扫描所有 .md 文件建立索引
   - `update_index(file_path)` → 增量更新单个文件的索引
   - `search_fulltext(query: &str, limit: usize)` → 全文搜索，返回 `Vec<SearchResult> { path, title, snippet, score }`
   - body 索引需剥离 Markdown 语法（使用 comrak 解析为纯文本）

2. 在文件监听器中集成增量索引：文件变更 → 自动更新搜索索引。

3. 创建 `src-tauri/src/search/fuzzy.rs`：
   - 使用 nucleo-matcher 实现文件名模糊匹配
   - `fuzzy_search(query: &str, candidates: &[String])` → 返回排序后的匹配结果

4. Tauri Commands：`search_files(query)`, `search_fulltext(query)`

### 前端

1. 创建 `src/components/sidebar/SearchPanel.tsx`：
   - 搜索输入框 + 结果列表
   - 短查询（<3 字符）→ 文件名模糊搜索
   - 长查询（>=3 字符）→ 全文搜索 + 文件名搜索，结果合并
   - 结果项显示：文件名 + 匹配片段（高亮匹配词）
   - 点击结果 → 打开文件并跳转到匹配位置

2. 更新 CommandPalette：文件搜索使用 fuzzy search 结果。

### Cargo.toml 追加
toml
comrak = "0.36"

### 验收标准
- 工作空间打开后搜索索引自动构建
- 搜索框输入关键词后快速返回结果（<100ms）
- 搜索结果按相关度排序
- 点击搜索结果正确打开文件
```

---

## Phase 8: AI 多模型接入 & 对话面板

> 目标：实现 Rust 后端 AI API 代理（支持全部 Provider）和前端 AI 对话面板。

### 8.1 Rust AI Provider 代理

```
/harness-feat

## 任务：实现 Rust 后端的 AI Provider 统一代理层

所有 AI API 调用都通过 Rust 后端代理（API Key 安全不出 Rust 进程），前端通过 Tauri Channel 接收流式 Token。

### 具体要求

1. 创建 `src-tauri/src/ai/mod.rs`：
   - 定义 `AIProvider` trait：`async fn chat_stream(messages, model, on_token) -> Result<()>`
   - 定义 `AIMessage { role: String, content: String }`

2. 创建 `src-tauri/src/ai/providers.rs`：
   - 实现 `OpenAICompatibleProvider`——一个统一的 Provider，通过不同的 base_url + api_key 支持所有 OpenAI 兼容 API：
     - DeepSeek: `https://api.deepseek.com/v1`
     - Qwen: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
     - GLM: `https://open.bigmodel.cn/api/paas/v4`
     - Kimi: `https://api.moonshot.cn/v1`
     - MiniMax: `https://api.minimax.chat/v1`
     - OpenAI: `https://api.openai.com/v1`
   - 实现 `AnthropicProvider`——Anthropic 使用不同的 API 格式（`/v1/messages`），需单独实现
   - 两个 Provider 都使用 `reqwest` 发送 HTTP 请求，解析 SSE stream

3. 创建 `src-tauri/src/ai/streaming.rs`：
   - SSE 流式响应解析器：逐行读取 `data: {...}` 行，解析 JSON 提取 delta content
   - 通过 `tauri::ipc::Channel<String>` 将每个 token 实时发送到前端
   - 处理 `[DONE]` 信号

4. Tauri Commands — `src-tauri/src/commands/ai.rs`：
   - `ai_chat_stream(messages: Vec<AIMessage>, provider_id: String, model: String, channel: Channel<String>)` → 调用对应 Provider 的流式 API，通过 Channel 逐 token 发送
   - `ai_cancel_stream()` → 取消当前流（abort reqwest）
   - `ai_list_providers()` → 从设置中读取已配置的 Provider 列表

5. AI Provider 配置存储在 SQLite 的 settings 表中（JSON 序列化的 provider 列表），API Key 存储在 keyring 中。

### 验收标准
- 配置一个 DeepSeek API Key 后，能成功发送消息并流式接收回复
- 配置 Anthropic API Key 后同样能工作
- 取消流式请求能正确中断
- API Key 不出现在日志或前端代码中
```

### 8.2 AI 对话面板 + 上下文感知

```
/harness-feat

## 任务：实现 AI 对话面板和上下文感知系统

### 具体要求

1. 创建 `src/components/ai/ChatPanel.tsx`——右侧面板的 AI 对话界面：
   - 顶部：Provider/Model 选择器（Radix Select），显示当前选择的模型名
   - 中间：消息列表（用户消息右对齐，AI 消息左对齐）
   - AI 消息使用 Markdown 渲染（可用 react-markdown 或简单的自定义渲染）
   - 流式输出时实时追加文字，显示闪烁光标动画
   - 底部：输入框 + 发送按钮 + 停止生成按钮（流式时显示）

2. 创建 `src/components/ai/ProviderSelect.tsx`：
   - Radix Select 下拉选择 AI Provider 和 Model
   - 显示格式："DeepSeek / deepseek-chat"
   - 仅显示已配置（有 API Key）的 Provider

3. 创建 `src/components/ai/ContextBuilder.ts`——上下文感知系统：
  typescript
   interface AIContext {
     currentDocument: { content: string; filePath: string; cursorPosition: number; selectedText?: string; };
     workspace: { directoryTree: string; openFiles: string[]; };
   }
   
   function buildSystemPrompt(context: AIContext): string {
     // 构建包含当前文档信息的 system prompt
     // 使用滑动窗口：以光标位置为中心，前后各 2000 字符
     // 加上文档的标题层级摘要
   }

4. 创建 `src/components/ai/StreamRenderer.tsx`：
   - 处理 AI 流式输出的 Markdown 渲染
   - 处理未闭合的代码块（在流式过程中临时补全 ``` 以避免渲染错误）

5. 更新 `src/stores/aiStore.ts`，实现完整 actions：
   - `sendMessage(content)` → 构建上下文 + 调用 Tauri ai_chat_stream + 通过 Channel 接收 token + 更新消息列表
   - `cancelStream()` → 调用 ai_cancel_stream
   - `clearHistory()` → 清空消息列表

6. 创建 `src/services/aiService.ts` 封装 Tauri AI invoke。

### 验收标准
- 可以在 AI 面板中选择 Provider 和 Model
- 发送消息后实时看到流式 AI 回复
- AI 回复正确渲染 Markdown 格式
- 系统 prompt 包含当前文档上下文信息
- 可以中途停止生成
```

---

## Phase 9: AI Skills & 编辑器 AI 集成

> 目标：实现 SKILL.md 系统、AI 直接写入编辑器、以及快捷 AI 操作。

### 9.1 Skill 系统 + 编辑器 AI 写入

```
/harness-feat

## 任务：实现 SKILL.md 系统和 AI 直接写入编辑器的能力

### Part A：Skill 系统

1. 在项目根目录创建 `skills/` 目录，包含以下内置 Skill 文件（YAML frontmatter + Markdown body）：
   - `summarize.md` — 总结当前文档
   - `translate.md` — 翻译选中文本
   - `expand.md` — 扩写选中段落
   - `fix-grammar.md` — 修正语法错误
   - `generate-outline.md` — 为当前文档生成大纲
   - `continue-writing.md` — 从光标位置续写
   - `rewrite.md` — 重写选中段落
   - `extract-key-points.md` — 提取要点

   每个 Skill 的 frontmatter 格式：
   yaml
   ---
   name: expand-text
   description: 扩展选中的文本段落，保持原有风格和语气
   category: writing
   outputMode: replace-selection  # replace-selection | insert-at-cursor | new-document | chat-response
   ---

2. 创建 `src/components/ai/SkillPicker.tsx`：
   - 在编辑器中选中文本后，浮动工具栏出现 "AI" 按钮
   - 点击 AI 按钮 → Radix Popover 弹出 Skill 列表
   - 也可通过 Slash 命令 `/ai-xxx` 触发
   - 选择 Skill 后立即执行

### Part B：AI 直接写入编辑器

1. 更新 `src/editor/commands/ai-insert.ts`：
  typescript
   function createAIStreamHandler(view: EditorView, outputMode: string) {
     // 根据 outputMode 决定写入行为：
     // - replace-selection: 删除选中文本，在选区位置流式插入 AI 输出
     // - insert-at-cursor: 在当前光标位置流式插入
     // - new-document: 创建新文件，AI 输出写入新文件
     // - chat-response: 不写入编辑器，仅在 AI 面板中显示
     return {
       onToken(token: string) { /* 增量插入 ProseMirror Transaction */ },
       onComplete() { /* 触发 inline-sync 全量重解析 */ }
     };
   }

2. AI 写入过程中的视觉反馈：
   - 正在写入的区域显示轻微的背景高亮（淡蓝色/淡紫色）
   - 写入完成后高亮渐隐

### Part C：快捷 AI 操作

在编辑器右键菜单（Radix ContextMenu）中添加 AI 操作子菜单：
- 选中文本时：翻译、扩写、重写、修正语法
- 无选中文本时：续写、总结文档、生成大纲

### 验收标准
- 选中文本后可通过 AI 按钮或右键菜单触发 Skill
- AI 输出直接流式写入编辑器对应位置
- 写入过程中有视觉反馈
- 写入完成后 Markdown 语法被正确渲染（inline-sync 触发）
- 支持 Undo 撤销 AI 写入
```

---

## Phase 10: 设置系统 & 主题 & 精细打磨

> 目标：实现完整的设置面板、AI Provider 配置、主题切换、快捷键自定义等。

### 10.1 设置面板 + AI Provider 配置

```
/harness-feat

## 任务：实现完整的设置系统和 AI Provider 配置界面

### 具体要求

1. 创建 `src/components/settings/SettingsDialog.tsx`：
   - 使用 Radix Dialog 全屏模态
   - 左侧导航分类：通用 | 编辑器 | AI 模型 | Git 同步 | 快捷键 | 账户
   - 右侧对应的设置面板内容

2. 通用设置面板：
   - 主题选择：亮色 / 暗色 / 跟随系统（Radix Select）
   - 语言：简体中文 / English
   - 启动时打开上次的工作空间（开关）

3. 编辑器设置面板：
   - 字体族选择（Radix Select + 预览）
   - 字号调节（Slider 14-24px）
   - 行高调节
   - 显示行号（开关）
   - 自动保存间隔（秒）

4. AI 模型配置面板（`AIProviderConfig.tsx`）——这是最重要的设置界面：
   - 预置 Provider 列表：Anthropic (Claude) | OpenAI | DeepSeek | Qwen | GLM | Kimi | MiniMax | 自定义
   - 每个 Provider 的配置卡片：
     - 名称（不可编辑，预置的；自定义的可编辑）
     - API Base URL（预置的有默认值；自定义的需手动填写）
     - API Key 输入框（密码模式，有显示/隐藏切换按钮）
     - 可用模型列表（预置的有推荐模型；也可手动输入模型名）
     - 启用/禁用开关
     - "测试连接" 按钮 → 发一条 "hi" 验证 API Key 有效性
   - "添加自定义 Provider" 按钮（用于 OpenAI 兼容 API 的任意服务）
   - 设置默认 Provider 和 Model

5. Git 同步设置面板：
   - 自动同步开关
   - 同步间隔（秒，Slider 30-300）
   - 自动 commit message 模板

6. 账户面板：
   - 显示 GitHub 头像、用户名、邮箱
   - "登出" 按钮

7. 所有设置通过 Tauri Command 存储到 SQLite（通过 settingsStore → Tauri invoke → Rust write_setting）。
8. API Key 单独存储在操作系统 keyring 中（每个 Provider 一个条目），不存 SQLite。

### 验收标准
- 设置面板可正常打开，所有分类可切换
- AI Provider 配置正确保存，API Key 安全存储
- "测试连接"按钮能验证 API Key 有效性
- 主题切换立即生效
- 关闭重开应用后设置保持
```

---

## Phase 11: 测试、构建 & 分发

> 目标：完善自动化测试、打包构建、自动更新。

### 11.1 测试 + 构建 + CI/CD

```
/harness-feat

## 任务：建立测试体系和跨平台构建流程

### Part A：前端测试

1. 使用 Vitest 作为测试框架（已随 Vite 生态支持）。
2. 编辑器核心单元测试（`src/editor/__tests__/`）：
   - `roundtrip.test.ts` — Markdown ↔ ProseMirror 无损转换（Phase 1 已创建，补充更多用例）
   - `inline-sync.test.ts` — 模拟输入序列，验证 inline-sync 正确触发格式转换
   - `commands.test.ts` — 格式切换、块操作等 command 测试
   - `input-rules.test.ts` — 各种 Markdown 快捷键触发测试
3. Store 测试（`src/stores/__tests__/`）：测试每个 Zustand store 的 action 行为。
4. 组件快照测试（可选）：关键 UI 组件的渲染快照。

### Part B：Rust 后端测试

1. Git 引擎单元测试（使用临时目录创建/操作 Git 仓库）
2. 搜索引擎测试（索引创建 + 查询匹配）
3. AI SSE 解析测试（mock HTTP 响应流）
4. 文件操作测试

### Part C：跨平台构建

1. 配置 `src-tauri/tauri.conf.json` 的 bundle 设置：
   - macOS: `.dmg` + `.app`
   - Windows: `.msi` + `.exe` (NSIS)
   - Linux: `.deb` + `.AppImage`
2. 配置应用图标（`src-tauri/icons/`）——需提供 icon.png(1024x1024) 后运行 `cargo tauri icon`
3. 配置 Tauri updater 插件（tauri-plugin-updater）用于自动更新

### Part D：GitHub Actions CI

创建 `.github/workflows/build.yml`：
- 触发条件：push to main、pull request、release tag
- 矩阵构建：macOS (arm64 + x64)、Windows (x64)、Linux (x64)
- 步骤：install Rust + Node.js → npm install → cargo tauri build → upload artifacts
- Release 时自动发布到 GitHub Releases

### 验收标准
- `npm test` 全部通过
- `cargo test` 全部通过
- `cargo tauri build` 在三平台成功产出安装包
- macOS .dmg 可正常安装打开
- Windows .msi 可正常安装打开
- Linux .AppImage 可正常运行
```

---

## 附录 A：开发优先级与里程碑

| 里程碑 | 包含 Phase | 产出物 | 预估周期 |
|--------|-----------|--------|---------|
| **M1: 编辑器可用** | 0 + 1 + 2 + 3 | Storybook 中可独立运行的 Typora 式编辑器 | 6-8 周 |
| **M2: 桌面应用可用** | 4 | 可打开本地文件夹、编辑 .md 文件的桌面应用 | 2-3 周 |
| **M3: GitHub 集成** | 5 + 6 | 登录 + Git 同步 + 版本历史 | 3-4 周 |
| **M4: 搜索可用** | 7 | 全文搜索 + 文件模糊搜索 | 1-2 周 |
| **M5: AI 可用** | 8 + 9 | 多模型对话 + Skill 系统 + 编辑器 AI 写入 | 3-4 周 |
| **M6: 生产就绪** | 10 + 11 | 设置系统 + 跨平台构建 + 自动更新 | 2-3 周 |

**总计预估：17-24 周（4-6 个月），适用于 1 名开发者 + AI 辅助全职开发的场景。**

---

## 附录 B：每个 Phase 开始前的 AI 上下文设定

在每个 Phase 的第一个 Task 开始时，先向 AI 发送以下上下文信息：

```
/context-setup

你正在开发 Refinex-Notes 项目——一个基于 Tauri 2.0 + React + Rust 的 AI-Native Markdown 笔记软件。

当前项目的技术栈：
- 桌面框架：Tauri 2.x（Rust 后端 + WebView 前端）
- 前端：React 18 + TypeScript + Vite
- UI 组件：Radix UI（headless） + Tailwind CSS + Lucide Icons + cmdk
- 编辑器：自研 Refinex Editor（ProseMirror + markdown-it，非 Milkdown/TipTap）
- 状态管理：Zustand + Jotai
- Rust 后端库：git2-rs（Git）、tantivy（搜索）、comrak（Markdown）、reqwest（HTTP）、rusqlite（数据库）、keyring（凭证存储）、notify（文件监听）
- 认证：GitHub OAuth Device Flow
- AI：Rust 后端代理所有 AI API 调用，支持 Anthropic + OpenAI 兼容 API（DeepSeek/Qwen/GLM/Kimi/MiniMax）

项目根目录结构：
- `src/` — React 前端代码
- `src/editor/` — 自研编辑器模块（ProseMirror）
- `src/components/` — React UI 组件
- `src/stores/` — Zustand stores
- `src/services/` — Tauri IPC 封装
- `src-tauri/` — Rust 后端代码
- `src-tauri/src/commands/` — Tauri Command 处理器
- `skills/` — AI Skill 定义文件

当前进行到 Phase [N]，之前的 Phase 已全部完成。
请严格遵循已有的代码风格和架构约定。
```

每次开启新的 AI 对话时发送此上下文，确保 AI 理解项目全貌。

---

## 附录 C：关键技术决策备忘

供开发过程中遇到分歧时快速查阅：

1. **为什么不用 Milkdown？** → 见 `refinex-editor-feasibility.md`，自研在 10 个维度中 8 个占优
2. **为什么用 markdown-it 不用 Remark？** → markdown-it 是 prosemirror-markdown 官方集成，Token 流模型与 ProseMirror Schema 天然映射，减少适配代码
3. **为什么 AI API 走 Rust 后端代理？** → API Key 安全不出 Rust 进程，可做 token 预算管理和上下文压缩
4. **为什么用 GitHub OAuth Device Flow 不用 Authorization Code Flow？** → 桌面应用无法安全处理 redirect_uri 回调，Device Flow 是 GitHub CLI 和 VS Code 采用的标准方案
5. **为什么 Git 用 git2-rs 不用 isomorphic-git？** → Rust 原生性能，与 Tauri 后端零 IPC 开销，GitButler 已验证
6. **为什么不用 Electron？** → Tauri 包体积 <10MB vs Electron 100MB+，内存占用低 5-8x，Rust 后端直接调用系统级库无需 FFI


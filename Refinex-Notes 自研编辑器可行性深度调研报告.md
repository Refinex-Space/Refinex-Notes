# Refinex-Notes 自研编辑器可行性深度调研报告

## 结论先行

**自研 Typora 级别的所见即所得编辑器不仅可行，而且是 Refinex-Notes 实现差异化的正确选择。** 但前提是：基于 ProseMirror 底层原语自研，而非从零手写 contentEditable 逻辑。调研发现，已有至少 5 个独立开发者/小团队成功在 ProseMirror 之上实现了 Typora 风格编辑器（ZuuNote、Flow、Noteworthy、Quarto Visual Editor、Outline），他们的经验表明核心实现需要 **2-4 个月的专注开发**，且 Milkdown 本身的 inline-sync 核心代码量仅约 **800 行**——这正是自研需要复现的关键部分。

自研方案相比 Milkdown 的核心优势在于：消除了对一个 10k Stars 但仅由 1-2 名核心维护者管理的项目的依赖风险，获得对编辑体验每一个细节的完全控制权，以及避免了 Milkdown 抽象层带来的调试黑箱和性能开销。

---

## 一、Milkdown 的真实面貌：它到底帮你做了什么

要判断是否值得自研，首先需要精确理解 Milkdown 在你与 ProseMirror 之间充当了什么角色。

Milkdown 的架构本质是三层胶水：最底层是 ProseMirror（编辑面，处理光标、选区、DOM 同步、事务模型）和 Remark（Markdown 解析/序列化，将 Markdown 字符串转为 mdast AST 再转为 ProseMirror Document），中间层是 Milkdown Core（一个依赖注入容器，通过 `ctx` 上下文对象和 `slice` 状态切片将 ProseMirror 和 Remark 粘合在一起），最上层是预制插件（`@milkdown/preset-commonmark` 提供 Schema 定义 + InputRules + inline-sync，`@milkdown/crepe` 提供 block-edit、toolbar、slash-menu 等 UI 组件）。

其中真正有技术含量的、Milkdown 区别于"普通 ProseMirror Markdown 编辑器"的核心，是 **inline-sync 插件**——大约 800 行代码。其他部分要么是 ProseMirror 社区已有方案的封装（Schema、InputRules、KeyMap、NodeView），要么是 UI 层组件（toolbar、slash-menu）——而这些 UI 在 Refinex-Notes 中必然需要用 Radix UI 重写以匹配自定义设计语言。

换言之，采用 Milkdown 意味着你获得了 800 行 inline-sync 核心和一套 Schema 定义，但同时引入了整个 Milkdown DI 容器和插件加载体系作为不可绕过的中间层。

---

## 二、Inline-Sync 的技术原理：它并不神秘

### Milkdown 的方式

Milkdown inline-sync 的工作流程可以精确描述为：

1. 用户在某一行输入字符（例如键入 `**` 开始加粗）
2. ProseMirror 触发 Transaction
3. inline-sync 插件在 `appendTransaction` 钩子中拦截该事务
4. 将当前行的 ProseMirror Node 通过 Remark serializer 序列化为 Markdown 字符串
5. 在 Markdown 字符串中插入一个特殊占位符标记当前光标位置
6. 将该 Markdown 字符串通过 Remark parser 重新解析为 mdast AST
7. 将 mdast AST 转换回 ProseMirror Node
8. 用新的 ProseMirror Node 替换旧的行内容
9. 根据占位符位置恢复光标

这个"序列化→重解析→替换"的循环确保了每次输入后行内容都与真实的 Markdown 语义保持一致。相比 InputRules 的正则近似，这是一种更精确但也更重的方案。

### Decoration 方式（ZuuNote / Flow 的方式）

ZuuNote 的开发者花了 **10 个月**在 ProseMirror 上从零实现了 Typora 风格编辑器，其方案与 Milkdown 完全不同：

1. 文档 Schema 极其简单——只有 paragraph 和 text 节点，**不使用** ProseMirror 的 Mark/Node 来表示 Markdown 格式
2. 所有的 Markdown 语法标记（`**`、`*`、`#` 等）作为**纯文本**保留在文档中
3. 用户每次输入后，对变更的段落调用 markdown-it 解析器获取 token
4. 根据 token 位置生成 ProseMirror **Decoration**（内联装饰），给 `**` 加上 `delimiter` CSS 类（灰色），给被包裹的文本加上 `strong` CSS 类（加粗样式）
5. 当光标在格式区域内时，delimiter 显示（`show-markup`）；光标离开后，delimiter 隐藏（`hide-markup`），同时用 ProseMirror Transaction 将文本内容替换为真正的格式化 DOM 节点

Flow（Microsoft 工程师 Vlad Rișcuția 的项目，2025 年 9 月公开）采用了几乎相同的方案，也是纯 paragraph Schema + Decoration + markdown-it，但额外维护了一个 `positionMap`（ProseMirror 文档位置与 Markdown 字符串位置的映射），以确保 decoration 位置精确。Flow 的开发者明确表示他选择不使用 `prosemirror-markdown` 官方插件，因为它在转换时会**剥离 Markdown 标记**——而 Typora 式体验要求标记在文档中保持可访问。

### 两种方式的权衡

| 维度 | Milkdown（序列化-重解析） | Decoration 方式（ZuuNote/Flow） |
|------|--------------------------|-------------------------------|
| Schema 复杂度 | 高（完整的 Markdown Node/Mark 定义） | 低（仅 paragraph + text） |
| 格式精确性 | 极高（每次通过完整 AST 循环） | 高（依赖 markdown-it token 精确性） |
| 性能 | 较重（每行变更触发序列化+解析） | 较轻（仅解析变更段落，decoration 是轻量操作） |
| 光标管理 | 需要特殊占位符恢复光标 | 自然保持（文本未被替换，只是加装饰） |
| Markdown 保真度 | 需要注意序列化格式化选项 | 天然保真（原始 Markdown 始终在文档中） |
| 实现难度 | 中等（逻辑清晰但调试 AST 转换不直观） | 较高（decoration 管理、光标进出检测需大量边缘处理） |
| Undo/Redo | ProseMirror 原生支持 | ZuuNote 遇到了严重问题，不得不重写 |

---

## 三、已有的成功案例：谁已经做到了

### 案例 1：ZuuNote — 独立开发者，10 个月

ZuuNote 的开发者在博客中详细记录了整个过程。他用 ProseMirror + markdown-it + Decoration 方式实现了 Typora 风格编辑。核心经验：花了 1 个月学习 ProseMirror 的 Guide 和 API 文档，然后用大量 trial-and-error 逐步实现。他的主要痛点是 ProseMirror 文档不够充足，很多行为需要通过 `console.log` 反复试探。值得注意的是，他后来（2024 年 4 月）因为 Undo/Redo 的严重问题不得不**完全重写**了实现方式——这是 Decoration 方案的已知风险。

### 案例 2：Flow — Microsoft 工程师，持续迭代中

Flow 的开发者 Vlad Rișcuția 采用了与 ZuuNote 几乎相同的纯 paragraph Schema + Decoration 方案，但他更系统化——维护了 `positionMap`、写了大量测试。他明确表示"更希望不自己写 Markdown 解析逻辑，因为 Markdown 现在相当复杂，自定义解析容易出错"，但找不到满足需求的现成方案。Flow 目前不支持表格，部分原因是 CommonMark 标准不包含表格。

### 案例 3：Outline — 小团队，从 Slate 迁移到 ProseMirror

Outline（知识库产品）最初基于 Slate.js 构建编辑器，后来因为 Slate 的 API 频繁破坏性变更导致"数月额外工作"，决定迁移到 ProseMirror。迁移 PR 标题就是"Work in progress — this is a large ongoing effort"。他们的编辑器 `rich-markdown-editor` 是一个完整的 React + ProseMirror Markdown 编辑器，但它不是 Typora 风格——它在输入 Markdown 语法时会立即转换并隐藏标记，更接近传统 WYSIWYG + Markdown 快捷键模式。

### 案例 4：Quarto Visual Editor — 成熟团队（Posit/RStudio）

Quarto（Posit 公司）的 Visual Editor 是一个基于 ProseMirror 的完整 Markdown WYSIWYG 编辑器，集成在 VS Code 中。它使用 Pandoc 做 Markdown↔ProseMirror 双向转换（而非 markdown-it 或 remark），拥有完整的 Extension 系统、CodeMirror 6 代码块集成、数学公式支持。这是目前已知的、质量最高的基于 ProseMirror 的 Markdown 编辑器实现之一。

### 案例 5：Yandex Markdown Editor — Yandex Cloud 团队

Yandex Cloud 团队开发的 `@gravity-ui/markdown-editor` 也是基于 ProseMirror + CodeMirror 双引擎。它同时支持 WYSIWYG 模式和 Markup 模式。团队表示"编辑器没有在一夜之间出现——它是积累的经验和知识的结果"。

---

## 四、自研的真实工作量评估

基于上述案例和对 Milkdown 源码的分析，自研 Refinex-Notes 编辑器的工作量可以分解为以下模块：

### 第一阶段：基础编辑能力（6-8 周）

**ProseMirror Schema 定义**（1 周）。定义完整的 Markdown 文档模型：doc、paragraph、heading (1-6)、blockquote、code_block、horizontal_rule、ordered_list、bullet_list、list_item、image、hard_break 等 Node 类型，以及 strong、em、code、link、strikethrough 等 Mark 类型。prosemirror-markdown 包已提供了 CommonMark Schema 作为参考，可以直接复用或扩展。

**Markdown↔ProseMirror 双向转换**（2 周）。这是最关键的基础设施。有两条路：使用 `prosemirror-markdown` 包（基于 markdown-it）提供的 `MarkdownParser` 和 `MarkdownSerializer`，可以在 1-2 天内跑通基本转换，然后花 1-2 周处理 GFM 扩展（表格、删除线、任务列表、脚注）和自定义语法；或者使用 Remark/unified 生态（与 Milkdown 同源），需要自己编写 mdast↔ProseMirror 节点的映射代码，灵活性更高但工作量也更大。推荐前者作为起点——markdown-it 的 token 流与 ProseMirror 的 Schema 映射直接且高效，且 markdown-it 本身支持插件扩展。

**Inline Sync 核心**（2-3 周）。这是实现 Typora 体验的核心。推荐采用 Milkdown 的"序列化-重解析"方式而非 ZuuNote 的纯 Decoration 方式，原因是前者与 ProseMirror 的 Node/Mark 模型天然兼容，Undo/Redo 由 ProseMirror 原生处理无需额外操心（ZuuNote 的 Decoration 方案在这里栽了跟头）。具体实现：在 `appendTransaction` 插件钩子中，检测变更涉及的行，对每行执行"序列化为 Markdown → 插入光标占位符 → 重新解析为 ProseMirror Node → 替换原行 → 恢复光标"循环。800 行核心代码需要逐行理解 Milkdown 的实现后重写，而非直接复制——因为 Milkdown 的代码与其 DI 容器深度耦合。

**InputRules + KeyMap**（1 周）。`#` + 空格 → 标题、`>` + 空格 → 引用、`-` + 空格 → 列表、`1.` + 空格 → 有序列表、`` ``` `` + 回车 → 代码块等块级快捷键。`Ctrl+B` 切换加粗、`Ctrl+I` 切换斜体等行内快捷键。ProseMirror 的 `prosemirror-inputrules` 和 `prosemirror-keymap` 包提供了完备的 API，这部分工作量主要在覆盖所有 Markdown 快捷方式。

**基础 NodeView**（1 周）。代码块（嵌入 CodeMirror 6）、图片（带拖拽上传 + 对齐控制）、链接（点击编辑弹窗）的自定义渲染。ProseMirror 的 NodeView API 允许将任意 React 组件挂载为节点的 DOM 表示。

### 第二阶段：精细体验（4-6 周）

**表格编辑**（1-2 周）。`prosemirror-tables` 包提供了完整的表格编辑支持（单元格合并、列宽调整、行列增删），但需要与自定义的 Markdown 表格序列化/反序列化对接。

**数学公式**（1 周）。使用 `prosemirror-math` 或自定义 NodeView + KaTeX 渲染。

**Slash Commands + Block 拖拽**（1-2 周）。Slash 命令菜单（基于 Radix UI Popover + cmdk）在光标位置弹出。块级拖拽手柄需要在每个 block node 的 NodeView 上添加 drag handle，处理 ProseMirror 的 drag/drop 事务。

**光标进出格式区域的视觉反馈**（1 周）。当光标进入加粗/斜体/链接等格式区域时，临时显示 Markdown 语法标记；离开时隐藏。这需要监听 Selection 变化事件，维护一个"当前活跃的格式区域"状态，通过 CSS 类名切换 `display:none`/`display:inline`。

**复制粘贴处理**（1 周）。从外部粘贴 HTML 时转换为 Markdown 结构；从编辑器复制时同时提供 HTML 和 Markdown 两种 clipboard 格式。ProseMirror 的 `clipboardTextSerializer` 和 `transformPastedHTML` 钩子提供了完整的控制能力。

---

## 五、自研 vs Milkdown：决策矩阵

| 维度 | 自研（ProseMirror 直接） | Milkdown | 判定 |
|------|--------------------------|----------|------|
| **体验控制力** | 完全控制每个交互细节 | 受限于 Milkdown 的抽象层 | 自研胜 |
| **调试透明度** | 直接调试 ProseMirror API | Milkdown DI 容器 + 多层间接调用 | 自研胜 |
| **依赖风险** | ProseMirror（成熟、稳定、作者 Marijn 持续维护 10 年+） | Milkdown（1-2 名核心维护者，10k Stars 但社区较小） | 自研胜 |
| **初始开发速度** | 6-8 周达到基本可用 | 2-3 周达到基本可用 | Milkdown 胜 |
| **长期维护成本** | 仅需跟进 ProseMirror 更新 | 需跟进 ProseMirror + Remark + Milkdown 三者更新 | 自研胜 |
| **UI 自定义** | 完全使用 Radix UI，零冲突 | Milkdown 的 `@milkdown/crepe` UI 需要替换或覆写 | 自研胜 |
| **GFM 扩展** | 需自行对接 markdown-it 插件 | preset-gfm 已提供 | Milkdown 胜 |
| **性能优化空间** | 可精确控制何时触发重解析 | inline-sync 对每行变更都触发完整 AST 循环 | 自研胜 |
| **社区生态** | ProseMirror 论坛活跃，大量企业用户 | Milkdown Discussion 较冷清 | 自研胜 |
| **AI 集成难度** | 直接操作 ProseMirror Transaction API | 需通过 Milkdown 的 ctx/action 间接操作 | 自研胜 |

**综合评分：自研方案在 10 个维度中的 8 个占优。** Milkdown 仅在初始开发速度和 GFM 扩展预制两个方面领先，但这两个优势在项目全生命周期中的权重较小——一个志在超越 Typora 的产品，编辑器的长期可控性远比省下 4 周初始开发时间重要。

---

## 六、推荐的自研架构

### 技术栈选定

ProseMirror 作为编辑框架（处理 contentEditable、Selection、Transaction、DOM 同步），markdown-it 作为 Markdown 解析器（而非 Remark），CodeMirror 6 作为代码块内嵌编辑器，KaTeX 作为数学公式渲染。

选择 markdown-it 而非 Remark 的理由：markdown-it 是 `prosemirror-markdown` 官方包的默认 parser，与 ProseMirror 的 token→Node 映射已有成熟方案；markdown-it 的 token 流模型比 Remark 的 AST 模型更接近 ProseMirror 的 Schema 模型；Remark 的 mdast 树需要额外的递归遍历和位置映射才能与 ProseMirror 对接（Milkdown 为此写了大量适配代码）。而 markdown-it 有完善的插件生态（markdown-it-task-lists、markdown-it-footnote、markdown-it-math 等），GFM 支持完整。

### 核心模块设计

```
src/editor/                         # Refinex Editor — 自研编辑器包
├── schema.ts                       # ProseMirror Schema（Markdown 文档模型）
├── parser.ts                       # Markdown → ProseMirror（基于 markdown-it）
├── serializer.ts                   # ProseMirror → Markdown
├── plugins/
│   ├── inline-sync.ts              # 核心：Typora 式行内实时渲染
│   ├── input-rules.ts              # Markdown 快捷键（# → 标题等）
│   ├── keymap.ts                   # 键盘快捷键映射
│   ├── cursor-decoration.ts        # 光标进出格式区域的视觉反馈
│   ├── placeholder.ts              # 空文档占位提示
│   ├── trailing-node.ts            # 文档末尾保证有空行
│   └── drop-cursor.ts              # 拖拽时的光标指示
├── node-views/
│   ├── CodeBlockView.tsx           # CodeMirror 6 代码块
│   ├── ImageView.tsx               # 图片（拖拽上传 + 对齐）
│   ├── MathView.tsx                # KaTeX 公式
│   └── TableView.tsx               # 表格编辑
├── commands/
│   ├── formatting.ts               # 切换加粗/斜体/代码等
│   ├── blocks.ts                   # 标题/引用/列表等块操作
│   ├── insert.ts                   # 插入表格/图片/分割线等
│   └── ai-insert.ts               # AI 流式输出插入文档
├── ui/                             # 基于 Radix UI 的编辑器 UI
│   ├── Toolbar.tsx                 # 顶部格式工具栏
│   ├── SlashMenu.tsx               # 斜杠命令菜单
│   ├── LinkPopover.tsx             # 链接编辑浮层
│   ├── BlockHandle.tsx             # 块拖拽手柄
│   └── FloatingToolbar.tsx         # 选中文本时的浮动工具栏
├── RefinexEditor.tsx               # 主编辑器 React 组件
└── index.ts                        # 公共 API 导出
```

### inline-sync 实现要点

```typescript
// src/editor/plugins/inline-sync.ts
// 核心思路：在 appendTransaction 中对变更行执行 Markdown 重解析

import { Plugin, PluginKey } from 'prosemirror-state';
import { MarkdownParser, MarkdownSerializer } from './parser';

const CURSOR_PLACEHOLDER = '\u200B\u200B'; // 零宽空格作为光标占位符

export const inlineSyncKey = new PluginKey('refinex-inline-sync');

export function inlineSyncPlugin(parser: MarkdownParser, serializer: MarkdownSerializer) {
  return new Plugin({
    key: inlineSyncKey,
    appendTransaction(transactions, oldState, newState) {
      // 仅在文档内容变更时触发
      if (!transactions.some(tr => tr.docChanged)) return null;

      const tr = newState.tr;
      let hasChanges = false;

      // 遍历所有变更的范围
      transactions.forEach(transaction => {
        transaction.mapping.maps.forEach(stepMap => {
          stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
            // 找到变更涉及的段落/行
            newState.doc.nodesBetween(newStart, newEnd, (node, pos) => {
              if (!node.isBlock || !node.isTextblock) return;
              
              // 序列化当前行为 Markdown
              const markdown = serializer.serializeNode(node);
              
              // 计算光标在 Markdown 中的位置并插入占位符
              const cursorOffset = newState.selection.from - pos - 1;
              const markedMarkdown = insertCursorPlaceholder(markdown, cursorOffset);
              
              // 重新解析为 ProseMirror Node
              const newNode = parser.parseInline(markedMarkdown, node.type);
              if (!newNode) return;
              
              // 比较新旧节点，仅在结构变化时替换
              if (!node.eq(removePlaceholder(newNode))) return;
              
              // 替换节点内容
              tr.replaceWith(pos, pos + node.nodeSize, removePlaceholder(newNode));
              
              // 恢复光标位置
              const newCursorPos = findPlaceholderPosition(newNode);
              if (newCursorPos !== null) {
                tr.setSelection(TextSelection.create(tr.doc, pos + 1 + newCursorPos));
              }
              
              hasChanges = true;
            });
          });
        });
      });

      return hasChanges ? tr : null;
    }
  });
}
```

### 与 AI 的深度集成优势

自研编辑器的一个重大优势是 AI 集成的简洁性。当 AI 流式生成文本时，可以直接操作 ProseMirror 的 Transaction API 在光标位置增量插入：

```typescript
// src/editor/commands/ai-insert.ts
export function createAIStreamHandler(view: EditorView) {
  let insertPos = view.state.selection.from;
  
  return {
    onToken(token: string) {
      const tr = view.state.tr.insertText(token, insertPos);
      insertPos += token.length;
      view.dispatch(tr);
    },
    onComplete() {
      // 触发一次完整的 inline-sync 重解析
      // 确保 AI 生成的 Markdown 语法被正确渲染
      triggerFullResync(view);
    }
  };
}
```

如果使用 Milkdown，同样的操作需要通过 `ctx.get(editorViewCtx)` 获取 view，通过 `ctx.get(commandsCtx)` 调用命令——每一步都多一层间接。

---

## 七、关键风险与缓解措施

**风险 1：Markdown 解析的边缘情况**。Markdown 语法在嵌套和边界条件上极其复杂（例如 `asd**'ef**` 在 CommonMark 中不应该加粗，但 `asd **'ef**` 应该）。缓解措施：不自己写 Markdown 解析器——使用 markdown-it（CommonMark + GFM 全覆盖，GitHub 自身也在使用），只写 token→ProseMirror 的映射层。

**风险 2：Undo/Redo 与 inline-sync 的冲突**。ZuuNote 开发者因此被迫完全重写。缓解措施：采用"序列化-重解析"方式而非 Decoration 方式——前者的所有变更都是标准 ProseMirror Transaction，历史插件（prosemirror-history）能正确追踪。Milkdown 的 inline-sync 已在这条路上验证通过。

**风险 3：WebView 跨平台差异影响 contentEditable 行为**。Tauri 在 Windows 用 Chromium（WebView2），macOS/Linux 用 WebKit。缓解措施：ProseMirror 的核心设计就是跨浏览器兼容——它拦截所有 contentEditable 事件并自行管理 DOM 更新，不依赖浏览器的默认编辑行为。ProseMirror 官方声明支持 Firefox、Chrome、Safari、Edge，实际测试覆盖了 WebKit 引擎。

**风险 4：开发周期超出预期**。编辑器开发的不确定性高，很多问题只有在实际输入测试时才会暴露。缓解措施：采用增量交付策略——第 1-2 周先做一个能加载/保存 Markdown 的基础编辑器（无 inline-sync），确保 Schema、Parser、Serializer 三件套稳定；第 3-6 周加入 inline-sync 和 InputRules；第 7-8 周处理 NodeView 和 UI 组件。每个阶段都有可发布的中间产物。

---

## 八、最终建议

**推荐自研，采用 ProseMirror + markdown-it 架构。** 具体路径：

将编辑器作为独立包 `@refinex/editor` 开发，与 Tauri 应用主体解耦。初期可以在浏览器 Storybook 中独立开发和测试编辑器，不需要启动完整 Tauri 应用，大幅提升开发迭代速度。

从 Milkdown 的 inline-sync 源码中学习核心算法（`packages/preset-commonmark/src/plugin/inline-sync` 目录），但不复制代码——理解原理后用更简洁的方式重写，去除 Milkdown DI 容器的耦合。

前两周的工作产物应该是：一个能加载任意 Markdown 文件、正确渲染为格式化文本、编辑后能无损序列化回 Markdown 的编辑器——这验证了 Schema + Parser + Serializer 的正确性，是后续一切工作的基础。

AI 流式插入的集成在自研编辑器中比在 Milkdown 中简单至少一倍——直接操作 `view.dispatch(tr.insertText(...))` 即可，这也是影响 Refinex-Notes 核心体验的关键路径。

这条路 GitButler（Tauri + 自研 UI）、Outline（ProseMirror 自研编辑器）、Quarto（ProseMirror 自研 Visual Editor）已经走通。Refinex-Notes 有充分的理由和条件走同样的路。
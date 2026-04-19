# Execution Plan: Blockquote Callout Support

## Header

**Objective**: 为编辑器添加 GFM Callout（告警块）支持，让用户在普通引用块内输入 `[!NOTE]` 等标记时，自动将其升级为带图标、颜色和语义标签的 Callout 块（NOTE / TIP / IMPORTANT / WARNING / CAUTION），与 Typora 渲染效果一致。

**Scope**:
- `src/editor/schema.ts` — blockquote 节点增加 `calloutType` 属性
- `src/editor/parser.ts` — markdown-it 核心规则，检测 `> [!TYPE]` 并设置属性
- `src/editor/serializer.ts` — callout blockquote 序列化为 `> [!TYPE]\n> content`
- `src/editor/plugins/input-rules.ts` — 实时升级规则：在 blockquote 首段输入 `[!TYPE]` 时升级为 callout
- `src/editor/editor.css` — 五种 callout 类型的样式（左彩色边框 + 图标 + 标题）

**Non-scope**:
- 不添加 callout 专属 NodeView（CSS-only 方案）
- 不修改 Rust/Tauri 层
- 不添加 callout 工具栏按钮（键入触发即可）

**Constraints**:
- 遵循 AGENTS.md：新逻辑填充已有文件，不新建顶层结构
- blockquote 仍然向后兼容（calloutType=null 时行为不变）
- 143 个已有测试必须全部通过

---

## Acceptance Criteria

1. 解析：`> [!NOTE]\n> 内容` 被正确解析为 calloutType="note" 的 blockquote，`[!NOTE]` 行不出现在内容中
2. 序列化：calloutType="note" 的 blockquote 输出 `> [!NOTE]\n> 内容` 的 markdown
3. 实时升级：在 blockquote 首段输入 `[!NOTE]` 后，块立即升级为 callout，`[!NOTE]` 文本被清除
4. 样式：五种 callout 类型各有对应颜色的左边框、图标和标题（CSS `::before`）
5. 普通 blockquote 不受影响
6. 构建通过：`npm run build` 无错误，143 个测试全部通过

---

## Implementation Steps

### Step 1 — Schema: 添加 calloutType 属性到 blockquote ✅
- 文件: `src/editor/schema.ts`
- 修改 `blockquoteSpec`: 添加 `attrs: { calloutType: { default: null } }`
- 更新 `parseDOM`: 读取 `data-callout` 属性
- 更新 `toDOM`: 当 `calloutType` 非 null 时输出 `data-callout` 属性

### Step 2 — Parser: 检测 [!TYPE] 标记 ✅
- 文件: `src/editor/parser.ts`
- 添加 markdown-it core rule `refinex_callout_blocks`：在 `blockquote_open` 后检查是否存在仅含 `[!TYPE]` 的首段落，若存在则将 callout 类型设置到 token attr 并移除该段落
- 更新 `blockquote` parser spec：传入 `calloutType` getAttrs

### Step 3 — Serializer: 输出 [!TYPE] 行 ✅
- 文件: `src/editor/serializer.ts`
- 更新 `blockquote` 序列化器：当 `calloutType` 非 null 时先写 `> [!TYPE]\n` 再执行 wrapBlock

### Step 4 — InputRules: 实时升级 ✅
- 文件: `src/editor/plugins/input-rules.ts`
- 添加 InputRule，匹配 `^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]$/i`
- 检测光标是否在 blockquote 首段，若是则更新 blockquote 的 calloutType attr 并删除 `[!NOTE` 文本

### Step 5 — CSS: Callout 样式 ✅
- 文件: `src/editor/editor.css`
- 为 `blockquote[data-callout]` 添加基础样式（覆盖斜体和灰色等 plain blockquote 样式）
- 五种类型各自的颜色变量：NOTE(蓝)、TIP(绿)、IMPORTANT(紫)、WARNING(琥珀)、CAUTION(红)
- `::before` 伪元素显示图标 + 类型标签

---

## Risk Notes

- markdown-it token 层的 splice 操作需正确处理嵌套 blockquote（只处理 level 最浅一层的首段落）
- InputRule 的 `start`/`end` 范围不包含触发字符 `]`（该字符被 InputRule 系统"消费"，不会插入文档）
- ProseMirror `setNodeMarkup` 和 `delete` 的 position mapping 需按正确顺序调用

Started: 2026-04-18

---

## Completion Summary

Completed: 2026-04-18
Steps completed: 5
All acceptance criteria: PASS

Summary: 在 ProseMirror schema 中为 blockquote 添加了 `calloutType` 属性；用 markdown-it core rule 检测并消费 `[!TYPE]` 首行，将 callout 类型设置到 blockquote_open token；序列化器在输出 callout 时自动补回 `[!TYPE]` 行；InputRule 在用户于 blockquote 首段输入 `[!NOTE]` 等标记时实时升级为 callout；CSS 使用 `::before` 伪元素实现 5 种类型的图标+标题头，支持亮色和暗色模式。143 个测试全部通过，构建无错误。

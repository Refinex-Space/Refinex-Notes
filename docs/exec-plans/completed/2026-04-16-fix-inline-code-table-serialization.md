# Fix Plan: Inline Code Table Serialization

Created: 2026-04-16
Status: Active
Author: agent
Type: fix

## Bug Brief

**Symptom**: 编辑器在序列化包含表格和 inline code 的内容时抛出 `RangeError: Index 1 out of range for <code("SIZED")>`，`serializeMarkdownSafely` 捕获后返回空字符串。
**Expected**: 表格单元格中的 inline code 能稳定序列化为 Markdown，不触发越界。
**Severity**: Blocking
**Type**: Regression

### Reproduction

现有编辑器相关测试未覆盖此路径；根据用户日志和 serializer 实现，最小复现是“表格单元格中只有一个带 `code` mark 的文本节点”。

Reproduction evidence: `src/editor/serializer.ts` 的 `code.close()` 当前使用 `parent.child(index)`；对单元格唯一子节点收尾时 `index === childCount`，会直接越界。

## Root Cause

**Mechanism**: `code` mark serializer 的关闭路径错误地读取当前索引 child，而不是刚刚结束的前一个 child，导致在最后一个 inline code 节点收尾时访问越界。
**Introduced by**: 自定义 `code` mark serializer 的 close 实现。
**Why it wasn't caught**: roundtrip 测试只覆盖了普通段落内 inline code 和普通表格，没有覆盖“表格单元格仅含 inline code”这一边界组合。

## Hypothesis Log

### Hypothesis #1: close 路径应读取 `index - 1` 而不是 `index`

Prediction: 若把 `code.close()` 改为读取前一个 child，表格单元格里的单一 inline code 将不再越界。
Experiment: 对照当前 close 实现与错误中的 `Index 1 out of range for <code("SIZED")>`，检查单 child 场景的索引语义。
Result: 当前实现会在 close 阶段读取不存在的 child；错误与此完全一致。
Conclusion: CONFIRMED

## Fix

**Strategy**: 修正 `code` mark close 路径的 child 索引，并新增一个表格单元格 inline code roundtrip 回归测试。
**Files**: `src/editor/serializer.ts`, `src/editor/__tests__/roundtrip.test.ts`, `docs/exec-plans/active/2026-04-16-fix-inline-code-table-serialization.md`, `docs/PLANS.md`
**Risk**: 如果关闭路径对其他场景依赖当前索引，修正后可能影响已有 inline code 序列化；需要用现有编辑器测试回归确认。

### Steps

#### Step 1: 修正 code mark close 索引

**Files:** `src/editor/serializer.ts`
**Verification:** 相关测试与构建通过，`code.close()` 不再访问 `parent.child(index)`

Status: ✅ Done
Evidence: `code.close()` 已改为读取 `Math.max(0, index - 1)` 对应的文本 child，避免关闭阶段访问越界索引。
Deviations:

#### Step 2: 添加表格单元格 inline code 回归测试

**Files:** `src/editor/__tests__/roundtrip.test.ts`
**Verification:** 新测试通过，并能覆盖此前越界场景

Status: ✅ Done
Evidence: `roundtrip.test.ts` 新增 `GFM table cell with inline code does not throw`，覆盖 `| \`SIZED\` |` 的最小失败输入。
Deviations:

## Verification

- [x] Related editor tests pass
- [x] `npm run build` passes
- [x] Full test suite has no new failures
- [x] Diff reviewed — only fix-related changes present
- [x] Pre-existing `DocumentOutlineDock` failure unchanged

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| Reproduce | ✅ | 用户日志 + serializer 索引分析 | 已锁定到 `code.close()` |
| Root cause | ✅ | close 阶段 child 索引越界 | 表格单元格单 child 最容易触发 |
| Fix | ✅ | `serializer.ts` close 索引已修正 | 最小改动，不改调用方 |
| Verify | ✅ | 编辑器相关测试 34/34 通过，`npm run build` 通过 | 全量 `npm test` 仅剩 `DocumentOutlineDock` 既有失败 |
| Regression | ✅ | roundtrip 新增表格 inline code 用例 | 锁住 `SIZED` 单 cell 场景 |

## Completion Summary

Completed: 2026-04-16
Root cause: `code` mark serializer 的 close 阶段错误地读取了 `parent.child(index)`，在表格单元格只有一个 inline code child 时访问越界。
Fix: 将 close 路径改为读取 `index - 1` 对应的最后一个文本 child，并保持其他序列化逻辑不变。
Regression test: `src/editor/__tests__/roundtrip.test.ts`
All verification criteria: PASS

Summary: 本次修复针对一个非常窄但会直接清空编辑器输出的序列化回归。问题出在自定义 `code` mark serializer 的 close 路径使用了错误的 child 索引；对普通段落内 inline code 不一定会暴露，但在表格单元格只包含一个 code 文本时会稳定触发越界。修复后，表格内 `\`SIZED\`` 这类内容可以正常 roundtrip，编辑器相关测试和构建都保持通过；全量前端测试没有新增失败，仍只受工作树中与本任务无关的 `DocumentOutlineDock` 断言漂移影响。

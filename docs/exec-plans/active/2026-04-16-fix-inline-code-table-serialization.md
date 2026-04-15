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

Status: ⬜ Not started
Evidence:
Deviations:

#### Step 2: 添加表格单元格 inline code 回归测试

**Files:** `src/editor/__tests__/roundtrip.test.ts`
**Verification:** 新测试通过，并能覆盖此前越界场景

Status: ⬜ Not started
Evidence:
Deviations:

## Verification

- [ ] Related editor tests pass
- [ ] `npm run build` passes
- [ ] Full test suite has no new failures
- [ ] Diff reviewed — only fix-related changes present
- [ ] Pre-existing `DocumentOutlineDock` failure unchanged

## Progress Log

| Step | Status | Evidence | Notes |
| ---- | ------ | -------- | ----- |
| Reproduce | ✅ | 用户日志 + serializer 索引分析 | 已锁定到 `code.close()` |
| Root cause | ✅ | close 阶段 child 索引越界 | 表格单元格单 child 最容易触发 |
| Fix | ⬜ |  |  |
| Verify | ⬜ |  |  |
| Regression | ⬜ |  |  |

## Completion Summary

Completed:
Root cause:
Fix:
Regression test:
All verification criteria: PASS / FAIL

Summary:

# Fix Plan: GitHub Device Flow 404

Created: 2026-04-14
Status: Active
Author: agent
Type: fix

## Bug Brief

**Symptom**: 点击 GitHub 登录后，`github_auth_start` 返回 `GitHub Device Flow 初始化失败（404 Not Found）: {"error":"Not Found"}`。
**Expected**: GitHub 应返回 `device_code`、`user_code` 与 `verification_uri`，前端进入验证码展示与轮询阶段。
**Severity**: Blocking
**Type**: Environment-specific

### Reproduction

1. 当前仓库在 [lib.rs](/Users/refinex/develop/code/refinex/Refinex-Notes-Project/refinex-notes/src-tauri/src/lib.rs) 中内置值 `a9ab7b77f62cf312de59c99476da93a6f53e5f6e` 作为 `DEFAULT_GITHUB_APP_CLIENT_ID`。
2. 触发 `github_auth_start`，它会向 `https://github.com/login/device/code` 发送 `client_id=<该值>`。

Reproduction evidence:

```bash
curl -sS -X POST https://github.com/login/device/code \
  -H 'Accept: application/json' \
  -d 'client_id=a9ab7b77f62cf312de59c99476da93a6f53e5f6e'
```

返回：

```json
{"error":"Not Found"}
```

## Root Cause

**Mechanism**: 当前内置值是 40 位十六进制串，形态与 GitHub App `client secret` 一致，而不是 GitHub App `Client ID`；GitHub Device Flow 起始接口要求传入 `Client ID`，因此返回 404。
**Introduced by**: `feat(auth): 内置 GitHub App client id`
**Why it wasn't caught**: 之前只验证了编译和测试链路，没有对 `client_id` 做格式校验，也没有在真实网络请求前识别“secret 被误填成 client id”这类配置错误。

## Hypothesis Log

### Hypothesis #1: GitHub Device Flow 起始接口请求格式错误

Prediction: 如果是请求参数编码方式错误，换同样的 `client_id` 用 `curl` 也应出现不同响应。
Experiment: 用 `curl` 直接对 `POST https://github.com/login/device/code` 发送相同 `client_id`。
Result: GitHub 仍然返回 `{"error":"Not Found"}`。
Conclusion: REFUTED

### Hypothesis #2: 当前内置值不是 GitHub App Client ID，而是错误凭据

Prediction: 如果这是错误凭据，其格式会明显不像 GitHub App Client ID，并且 GitHub 对它会返回 `Not Found`。
Experiment: 对比值形态并复现请求。
Result: 该值是 40 位十六进制串，符合 secret 形态；请求复现得到 404。
Conclusion: CONFIRMED

## Fix

**Strategy**: 移除错误内置凭据，恢复“仅接受真实 GitHub App Client ID”路径；在 native 侧启动登录前增加格式校验，对明显像 `client secret` 的值给出明确错误，避免继续误导为 GitHub API 故障。
**Files**: `src-tauri/src/lib.rs`, `src-tauri/src/commands/auth.rs`, `docs/OBSERVABILITY.md`
**Risk**: 在未提供真实 `Client ID` 前，登录会恢复为显式报配置错误，但这比继续把 secret 混入客户端并触发 404 更安全、更可诊断。

### Steps

#### Step 1: 移除错误默认值并收紧 client_id 校验

**Files:** `src-tauri/src/lib.rs`, `src-tauri/src/commands/auth.rs`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml`

Status: 🔄 In progress
Evidence:
Deviations:

#### Step 2: 写入回归测试与运行文档

**Files:** `src-tauri/src/commands/auth.rs`, `docs/OBSERVABILITY.md`
**Verification:** `cargo test --manifest-path src-tauri/Cargo.toml && python3 scripts/check_harness.py`

Status: ⬜ Not started
Evidence:
Deviations:

## Verification

- [ ] Reproduction test now passes
- [ ] Regression test added and passes
- [ ] Full test suite passes (no new failures)
- [ ] Lint and type checks pass
- [ ] Diff reviewed — only fix-related changes present
- [ ] Pre-existing failures unchanged

## Progress Log

| Step       | Status | Evidence | Notes |
| ---------- | ------ | -------- | ----- |
| Reproduce  | ✅ | `curl` 复现 `{"error":"Not Found"}` | 故障可稳定重现 |
| Root cause | ✅ | 内置值为 40 位十六进制串 | 确认为错误凭据类型 |
| Fix        | 🔄 | 进行中 | 准备移除错误内置值并加校验 |
| Verify     | ⬜ |  | 待完成 |
| Regression | ⬜ |  | 待完成 |

## Completion Summary

Completed:
Root cause:
Fix:
Regression test:
All verification criteria:

Summary:

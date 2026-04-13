# Refinex-Notes 完整技术架构文档

**Tauri 2.0 + React + Radix UI + Tailwind CSS + 自研 Refinex Editor（ProseMirror + markdown-it）+ git2-rs + Vercel AI SDK 是构建下一代所见即所得 Markdown 笔记软件的最优技术栈组合。** 这套架构在包体积（<10MB vs Typora 的 ~80MB）、内存占用（~30-40MB vs Electron 应用 ~200MB+）和启动速度（<0.5s）上具有显著优势，同时通过 Rust 后端获得 10-100 倍于 JavaScript 的 Markdown 解析性能。编辑器核心采用 **ProseMirror + markdown-it 自研**方案（而非依赖 Milkdown 等第三方框架），在深度可行性调研后确认：自研在体验控制力、调试透明度、AI 集成简洁性和长期依赖风险四个关键维度全面占优，且核心实现量（inline-sync ~800 行）完全可控。本文档基于对 Tauri 2.0、Radix UI、ProseMirror 生态、GitButler/Obsidian/AFFiNE/ZuuNote/Flow 等 10+ 参考项目的深度调研，给出完整的模块划分、数据流设计和关键实现方案。

---

## 一、桌面端框架：Tauri 2.0 全面胜出

Tauri 2.0 于 2024 年 10 月正式发布稳定版，截至 2026 年初已迭代至 **v2.10.3**，经历了 10 个次版本更新，稳定性已得到充分验证。GitButler（GitHub 联合创始人 Scott Chacon 的新项目，**2 万+ Stars**）、Hoppscotch、1Password 等生产级应用证明了 Tauri 2.0 的生产就绪度。

### 核心性能数据对比

| 指标 | Tauri 2.0 | Electron | 优势倍数 |
|------|-----------|----------|---------|
| 安装包体积 | **<10 MB** | 100-165 MB | **15-28x 更小** |
| 空闲内存 | **30-40 MB** | 200-300 MB | **5-8x 更低** |
| 启动时间 | **<0.5 秒** | 1-2 秒 | **2-4x 更快** |
| 首次编译 | ~80 秒 | ~16 秒 | Electron 5x 更快 |

Hoppscotch 从 Electron 迁移至 Tauri 后，包体积从 **165MB 降至 8MB（减少 95%）**，内存减少约 70%。对于用户全天开着的笔记软件而言，低内存占用和快速启动是关键优势。

### Tauri 2.0 的关键新能力

Tauri 2.0 带来了**移动端支持**（iOS/Android 作为一等公民）、**基于 Capability 的权限系统**（取代 1.x 的 allowlist，可为每个 WebView 窗口定义细粒度权限）、**重写的 IPC 机制**（使用自定义 URI scheme，支持二进制数据高效传输的 Channel 模式）、以及 **25+ 官方插件**（fs、clipboard、dialog、shell、global-shortcut、updater 等核心功能独立为插件）。安全方面，Tauri 在 2.0 发布前完成了外部安全审计，Rust 编译后的二进制文件远比 Electron 的 .asar 包更难逆向。

**唯一需要注意的风险**是 WebView 跨平台一致性：Windows 上使用 Chromium（WebView2），macOS/Linux 使用 WebKit。这意味着基于 contentEditable 的富文本编辑器可能遇到 CSS 渲染差异。实际解决方案是在所有平台充分测试编辑器组件，并添加 `-webkit` CSS 前缀。Obsidian 和 Zettlr 虽使用 Electron（统一 Chromium），但 GitButler 的 Tauri + 富文本 UI 已在三平台稳定运行，证明这一风险可控。

---

## 二、UI 组件层：Radix UI + Tailwind CSS

### 为什么选择 Radix UI

Radix UI 是 Refinex-Notes 前端组件层的核心选择。它是一套 **headless（无样式）、可访问性优先** 的 React 原语组件库，由 WorkOS 团队维护，被 Linear、Vercel、Supabase 等高水准产品采用。在 Refinex-Notes 的场景下，Radix UI 相比 Ant Design、MUI 或 shadcn/ui 有三个不可替代的优势：

**第一，headless 架构与 Tailwind CSS 完美配合。** Radix UI 不附带任何视觉样式，只提供行为逻辑（键盘导航、焦点管理、ARIA 属性、动画状态）。所有视觉呈现完全通过 Tailwind CSS 实用类控制。这意味着 Refinex-Notes 可以打造完全独立的视觉语言，而非看起来像"又一个 Ant Design 应用"。Typora 的成功很大程度上归功于其独特的极简美学——Radix UI + Tailwind CSS 赋予了同样的自由度。

**第二，对复杂交互组件的一等支持。** 笔记软件需要大量精细交互：右键菜单（Context Menu）、弹出面板（Popover，用于链接编辑、Slash 命令）、下拉选择（Select/Combobox，用于标签选择、模型切换）、对话框（Dialog，用于设置、冲突解决）、手风琴（Accordion，用于文件树折叠）、标签页（Tabs，用于多文件编辑）、工具提示（Tooltip）。Radix UI 对这些组件的键盘交互、焦点陷阱、Escape 关闭、外部点击关闭等行为处理是业界最完善的。

**第三，与 ProseMirror 自研编辑器的 DOM 互操作性。** Refinex Editor 基于 ProseMirror 构建，其 NodeView 需要在编辑器 DOM 中挂载 React 组件（如链接弹窗、图片工具栏、Slash 命令菜单）。Radix UI 的 Portal 机制和可控的 DOM 挂载点（`container` prop）使得这些浮层组件可以正确地渲染在编辑器上方，而不会被 ProseMirror 的 DOM 更新机制破坏。自研编辑器对 DOM 结构有完全控制权，因此与 Radix UI 的集成比使用第三方编辑器框架更加干净——不存在两套组件体系冲突的问题。相比之下，MUI 等强样式库的全局样式注入容易与 ProseMirror 的 contentEditable 样式冲突。

### Radix UI 在 Refinex-Notes 中的组件映射

| 应用场景 | Radix 组件 | 具体用途 |
|---------|-----------|---------|
| 文件树 | `Accordion` + `ContextMenu` | 可折叠目录，右键操作（新建、重命名、删除、Git 操作） |
| 编辑器工具栏 | `Toolbar` + `ToggleGroup` | 格式化按钮组（加粗、斜体、标题级别） |
| Slash 命令 | `Popover` + `Command`（cmdk） | 光标位置弹出命令面板 |
| 链接编辑 | `Popover` | 行内链接编辑浮层 |
| 多标签编辑 | `Tabs` | 多文件切换标签页 |
| AI 模型选择 | `Select` | 下拉切换 AI Provider |
| 设置对话框 | `Dialog` | 模态设置面板（通用、AI、Git） |
| Git 冲突解决 | `AlertDialog` | 强制用户选择的冲突解决对话框 |
| 主题切换 | `DropdownMenu` | 亮色/暗色/自动主题切换 |
| 快捷键提示 | `Tooltip` | 按钮悬停显示快捷键 |
| 侧边栏布局 | `Collapsible` | 可折叠的侧边栏面板 |
| 搜索替换 | `Popover` + `Form` | 浮动搜索替换栏 |
| 通知/同步状态 | `Toast` | 非阻断式通知（"已同步"、"冲突"） |

### Radix UI + Tailwind CSS 集成模式

```tsx
// 示例：Refinex-Notes 的主题化 Dialog 组件
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export function RefinexDialog({ title, children, open, onOpenChange }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm
          data-[state=open]:animate-in data-[state=closed]:animate-out
          data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          w-[90vw] max-w-lg rounded-xl border border-zinc-200 bg-white p-6
          shadow-2xl dark:border-zinc-800 dark:bg-zinc-900
          data-[state=open]:animate-in data-[state=closed]:animate-out
          data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
          data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </Dialog.Title>
          <div className="mt-4">{children}</div>
          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100
              transition-opacity focus:outline-none focus:ring-2 focus:ring-zinc-400">
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

**关键实践**：利用 Radix 的 `data-[state=*]` 属性选择器直接在 Tailwind 中定义进入/退出动画，配合 `tailwindcss-animate` 插件。全局 CSS 变量通过 Tailwind 的 `theme.extend` 注入，支持亮色/暗色主题一键切换。图标库统一使用 **Lucide React**（~1KB per icon，tree-shakeable）。

### 补充组件：cmdk

对于 Slash 命令和全局命令面板（Cmd+K），推荐搭配 **cmdk**（pacocoursey/cmdk，Linear 风格的命令面板组件）。cmdk 本身基于 Radix UI 构建，与 Radix 的 Popover/Dialog 无缝集成。它提供了模糊搜索、键盘导航、分组等命令面板所需的全部能力。

```tsx
import { Command } from 'cmdk';

// 全局命令面板（Cmd+K）
<Command.Dialog open={open} onOpenChange={setOpen}>
  <Command.Input placeholder="搜索命令、文件..." />
  <Command.List>
    <Command.Group heading="文件">
      <Command.Item onSelect={() => openFile(path)}>打开文件...</Command.Item>
    </Command.Group>
    <Command.Group heading="编辑">
      <Command.Item>插入表格</Command.Item>
      <Command.Item>插入代码块</Command.Item>
    </Command.Group>
    <Command.Group heading="AI">
      <Command.Item>AI 总结当前文档</Command.Item>
      <Command.Item>AI 翻译选中文本</Command.Item>
    </Command.Group>
  </Command.List>
</Command.Dialog>
```

---

## 三、认证系统：GitHub OAuth 登录

### 为什么采用 GitHub OAuth 作为主要认证方式

Refinex-Notes 以 GitHub 作为文档同步仓库，因此 **GitHub OAuth 登录是最自然的认证选择**——用户只需一次登录，同时获得应用身份认证和 Git 仓库访问权限，无需额外管理账号密码。这也是 Vercel、Netlify、Railway、GitButler、Gitpod 等现代开发者工具的标准做法。

对于非开发者用户，GitHub 账号的普及度可能是个顾虑。但 Refinex-Notes 的核心场景是"Markdown 笔记 + Git 版本管理"，其目标用户群与 GitHub 用户高度重叠。未来可渐进式扩展其他 OAuth Provider（Google、微信、邮箱密码），但 MVP 阶段专注 GitHub OAuth 是最合理的路径。

### 认证架构：OAuth Device Flow（桌面首选）

桌面应用无法像 Web 应用那样使用标准的 OAuth Authorization Code Flow（需要 redirect_uri 回调到 localhost 服务器），**GitHub OAuth Device Flow** 是桌面端和 CLI 工具的最佳实践，也是 GitHub CLI（`gh auth login`）、VS Code GitHub 扩展、GitButler 采用的方案。

**完整流程**：

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Refinex-Notes GitHub OAuth Device Flow                │
│                                                                          │
│  ① 用户点击"使用 GitHub 登录"                                           │
│     ↓                                                                    │
│  ② Rust 后端 POST https://github.com/login/device/code                  │
│     → 获得 device_code + user_code + verification_uri                    │
│     ↓                                                                    │
│  ③ 前端展示：                                                            │
│     ┌─────────────────────────────────────────┐                          │
│     │  请在浏览器中打开：                       │                          │
│     │  https://github.com/login/device         │                          │
│     │                                           │                          │
│     │  输入验证码：  [ A1B2-C3D4 ]              │                          │
│     │                                           │                          │
│     │  [复制验证码]  [打开浏览器]                │                          │
│     └─────────────────────────────────────────┘                          │
│     ↓                                                                    │
│  ④ 用户在浏览器中输入验证码并授权                                        │
│     ↓                                                                    │
│  ⑤ Rust 后端轮询 POST https://github.com/login/oauth/access_token       │
│     interval=5s，直到用户完成授权                                        │
│     → 获得 access_token (+ refresh_token)                                │
│     ↓                                                                    │
│  ⑥ 使用 access_token 调用 GET https://api.github.com/user               │
│     → 获得用户信息（login, name, avatar_url, email）                     │
│     ↓                                                                    │
│  ⑦ Token 安全存储到操作系统钥匙串                                        │
│     macOS: Keychain / Windows: Credential Manager / Linux: Secret Service│
│     ↓                                                                    │
│  ⑧ 前端更新状态：已登录 → 显示头像和用户名                              │
│     同时 access_token 用于后续 Git 操作的 HTTPS 认证                     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Rust 后端实现

```rust
// src-tauri/src/commands/auth.rs

use keyring::Entry;
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;

#[derive(Serialize)]
pub struct DeviceCodeResponse {
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
}

#[derive(Serialize)]
pub struct UserProfile {
    pub login: String,
    pub name: Option<String>,
    pub avatar_url: String,
    pub email: Option<String>,
}

/// 步骤 1：发起 Device Flow，获取用户验证码
#[tauri::command]
pub async fn github_auth_start(
    state: tauri::State<'_, AppState>,
) -> Result<DeviceCodeResponse, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post("https://github.com/login/device/code")
        .header("Accept", "application/json")
        .form(&[
            ("client_id", &state.github_client_id),
            ("scope", &"repo,read:user,user:email".to_string()),
        ])
        .send().await
        .map_err(|e| e.to_string())?;
    
    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    
    // 存储 device_code 用于后续轮询
    *state.pending_device_code.lock().unwrap() = Some(
        data["device_code"].as_str().unwrap().to_string()
    );
    
    Ok(DeviceCodeResponse {
        user_code: data["user_code"].as_str().unwrap().to_string(),
        verification_uri: data["verification_uri"].as_str().unwrap().to_string(),
        expires_in: data["expires_in"].as_u64().unwrap(),
    })
}

/// 步骤 2：轮询等待用户授权，通过 Channel 流式通知前端
#[tauri::command]
pub async fn github_auth_poll(
    state: tauri::State<'_, AppState>,
    progress: Channel<AuthEvent>,
) -> Result<UserProfile, String> {
    let device_code = state.pending_device_code.lock().unwrap()
        .clone().ok_or("No pending auth")?;
    let client = reqwest::Client::new();
    
    loop {
        tokio::time::sleep(std::time::Duration::from_secs(5)).await;
        progress.send(AuthEvent::Polling).unwrap();
        
        let resp = client
            .post("https://github.com/login/oauth/access_token")
            .header("Accept", "application/json")
            .form(&[
                ("client_id", &state.github_client_id),
                ("device_code", &device_code),
                ("grant_type", &"urn:ietf:params:oauth:grant-type:device_code".to_string()),
            ])
            .send().await.map_err(|e| e.to_string())?;
        
        let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        
        if let Some(token) = data["access_token"].as_str() {
            // 安全存储 Token 到操作系统钥匙串
            let entry = Entry::new("refinex-notes", "github-token")
                .map_err(|e| e.to_string())?;
            entry.set_password(token).map_err(|e| e.to_string())?;
            
            // 获取用户信息
            let user_resp = client
                .get("https://api.github.com/user")
                .header("Authorization", format!("Bearer {}", token))
                .header("User-Agent", "Refinex-Notes")
                .send().await.map_err(|e| e.to_string())?;
            
            let user: UserProfile = user_resp.json().await.map_err(|e| e.to_string())?;
            progress.send(AuthEvent::Success(user.login.clone())).unwrap();
            return Ok(user);
        }
        
        match data["error"].as_str() {
            Some("authorization_pending") => continue,
            Some("slow_down") => {
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                continue;
            }
            Some("expired_token") => return Err("验证码已过期，请重新登录".into()),
            Some("access_denied") => return Err("用户拒绝了授权".into()),
            _ => return Err(format!("未知错误: {:?}", data)),
        }
    }
}

/// 检查是否已登录（应用启动时调用）
#[tauri::command]
pub async fn check_auth_status() -> Result<Option<UserProfile>, String> {
    let entry = Entry::new("refinex-notes", "github-token")
        .map_err(|e| e.to_string())?;
    
    match entry.get_password() {
        Ok(token) => {
            let client = reqwest::Client::new();
            let resp = client
                .get("https://api.github.com/user")
                .header("Authorization", format!("Bearer {}", token))
                .header("User-Agent", "Refinex-Notes")
                .send().await;
            
            match resp {
                Ok(r) if r.status().is_success() => {
                    Ok(Some(r.json().await.map_err(|e| e.to_string())?))
                }
                _ => {
                    // Token 已过期/失效，清除并要求重新登录
                    let _ = entry.delete_credential();
                    Ok(None)
                }
            }
        }
        Err(_) => Ok(None), // 未登录
    }
}

/// 登出
#[tauri::command]
pub fn github_logout() -> Result<(), String> {
    let entry = Entry::new("refinex-notes", "github-token")
        .map_err(|e| e.to_string())?;
    entry.delete_credential().map_err(|e| e.to_string())?;
    Ok(())
}
```

### 前端登录流程

```tsx
// src/components/auth/LoginScreen.tsx
import { invoke } from '@tauri-apps/api/core';
import { Channel } from '@tauri-apps/api/core';
import * as Dialog from '@radix-ui/react-dialog';

export function LoginScreen() {
  const [step, setStep] = useState<'idle' | 'code' | 'polling' | 'done'>('idle');
  const [userCode, setUserCode] = useState('');
  const [verificationUri, setVerificationUri] = useState('');
  
  async function startLogin() {
    const result = await invoke<DeviceCodeResponse>('github_auth_start');
    setUserCode(result.user_code);
    setVerificationUri(result.verification_uri);
    setStep('code');
    
    // 自动打开浏览器
    await invoke('open_url', { url: result.verification_uri });
    
    // 开始轮询
    setStep('polling');
    const channel = new Channel<AuthEvent>();
    channel.onmessage = (event) => {
      if (event.type === 'Success') {
        setStep('done');
        // 跳转到主界面
      }
    };
    
    try {
      const user = await invoke<UserProfile>('github_auth_poll', { progress: channel });
      useAuthStore.getState().setUser(user);
    } catch (e) {
      setStep('idle');
      toast.error(e as string);
    }
  }
  
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8
        shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Refinex-Notes
          </h1>
          <p className="mt-2 text-sm text-zinc-500">Markdown 笔记，Git 驱动，AI 增强</p>
        </div>
        
        {step === 'idle' && (
          <button onClick={startLogin}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg
              bg-zinc-900 px-4 py-3 text-sm font-medium text-white
              hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
            <GitHubIcon className="h-5 w-5" />
            使用 GitHub 登录
          </button>
        )}
        
        {step === 'code' && (
          <div className="mt-8 space-y-4 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              请在浏览器中输入验证码
            </p>
            <div className="rounded-lg bg-zinc-100 px-6 py-4 font-mono text-2xl
              font-bold tracking-widest text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
              {userCode}
            </div>
            <button onClick={() => navigator.clipboard.writeText(userCode)}
              className="text-sm text-blue-600 hover:underline">
              复制验证码
            </button>
          </div>
        )}
        
        {step === 'polling' && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <Spinner className="h-6 w-6 animate-spin text-zinc-400" />
            <p className="text-sm text-zinc-500">等待浏览器授权...</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Token 复用：认证即 Git 授权

GitHub OAuth Token 获得 `repo` scope 后，同一 Token 同时用于：

**① 应用身份认证**：启动时调用 `/user` API 验证 Token 有效性并获取用户信息（头像、用户名），无效则回到登录界面。

**② Git HTTPS 认证**：git2-rs 的 `RemoteCallbacks` 配置 `credentials` 回调，从操作系统钥匙串读取 Token 作为 HTTPS 密码（用户名填 `x-access-token`）：

```rust
// src-tauri/src/git/auth.rs
use git2::{Cred, RemoteCallbacks};
use keyring::Entry;

pub fn configure_git_callbacks(callbacks: &mut RemoteCallbacks) {
    callbacks.credentials(|_url, username_from_url, _allowed_types| {
        let entry = Entry::new("refinex-notes", "github-token")
            .map_err(|e| git2::Error::from_str(&e.to_string()))?;
        let token = entry.get_password()
            .map_err(|e| git2::Error::from_str(&e.to_string()))?;
        
        Cred::userpass_plaintext("x-access-token", &token)
    });
}
```

**③ GitHub API 调用**：列出用户仓库（供仓库选择器使用）、创建新仓库（"新建笔记仓库"功能）、获取仓库元数据。

这种"一次登录，三重用途"的设计大幅降低了用户的认知负担，不需要分别配置 SSH Key 或 Personal Access Token。

### OAuth App 注册与安全

在 GitHub 注册 OAuth App 时配置：

```
Application name: Refinex-Notes
Homepage URL: https://refinex.dev
Authorization callback URL: 不需要（Device Flow 不使用回调）
```

**安全要点**：

- `client_id` 可公开嵌入应用（GitHub 文档明确说明 Device Flow 的 client_id 不是密钥）
- **不需要** `client_secret`（Device Flow 专为无法安全存储密钥的客户端设计）
- `access_token` 存储在操作系统钥匙串中，永远不出现在前端代码或日志中
- 应用端仅请求最小权限 scope：`repo`（仓库读写）、`read:user`（用户信息）、`user:email`（邮箱）
- Token 过期/撤销时，应用优雅降级到登录界面

### 未来扩展：多 Provider 认证

架构预留了多 Provider 支持的空间。Rust 后端的 `commands/auth.rs` 可扩展为 `auth/` 模块：

```
src-tauri/src/auth/
├── mod.rs          // AuthProvider trait 定义
├── github.rs       // GitHub OAuth Device Flow（当前实现）
├── google.rs       // Google OAuth（未来）
├── wechat.rs       // 微信 OAuth（未来，中国用户）
└── email.rs        // 邮箱 + 密码 / Magic Link（未来）
```

但 MVP 阶段只实现 GitHub OAuth，因为它同时解决了认证和 Git 授权两个问题。

---

## 四、所见即所得编辑器：自研 Refinex Editor（ProseMirror + markdown-it）

### 为什么自研而非使用 Milkdown

经过对 Milkdown 源码的深度分析和对 ZuuNote、Flow、Outline、Quarto Visual Editor、Yandex Markdown Editor 等 5 个独立成功案例的调研，Refinex-Notes 选择**基于 ProseMirror + markdown-it 自研编辑器**，而非依赖 Milkdown 框架。核心理由有四：

**体验控制力**。一个志在超越 Typora 的产品，编辑器的每一个交互细节（光标行为、格式区域进出动画、复制粘贴处理、AI 流式插入）都需要完全可控。Milkdown 的 DI 容器和插件加载体系在编辑器与 ProseMirror 之间增加了一层不可绕过的间接层，深度定制时必须先理解并绕过 Milkdown 的抽象，再操作底层 ProseMirror API。

**调试透明度**。Milkdown 的 `ctx` 上下文对象和 `slice` 状态切片系统使得断点调试时调用栈冗长，错误堆栈经过多层间接才到达实际的 ProseMirror 调用。自研方案直接操作 ProseMirror API，堆栈清晰，行为可预测。

**依赖风险**。Milkdown（~10k Stars）仅由 1-2 名核心维护者管理，社区 Discussion 较冷清。相比之下，ProseMirror 由 Marijn Haverbeke（CodeMirror 作者）持续维护 10 年+，被 Notion、Atlassian、NY Times 等企业采用，生态极为稳固。自研方案的唯一外部依赖是 ProseMirror 和 markdown-it，两者都是长期稳定的基础设施级项目。

**AI 集成简洁性**。AI 流式输出写入编辑器时，自研方案直接调用 `view.dispatch(tr.insertText(...))` 一行代码即可，而 Milkdown 需要通过 `ctx.get(editorViewCtx)` 获取 view、通过 `ctx.get(commandsCtx)` 调用命令——每一步多一层间接。这在 Refinex-Notes 的核心 AI 写作场景中是高频路径。

### Typora 的实现原理解密

Typora 基于 Electron + CodeMirror 构建，其"无缝编辑"体验的核心机制是：**通过 CSS `display:none` 隐藏 Markdown 语法标记**（如 `**`、`#`），当光标进入格式区域时临时显示原始语法供编辑，光标离开后重新解析并渲染为格式化 HTML。保存时对全文重新格式化以确保一致性。这是一种"光标感知的即时渲染"模式。

### 自研编辑器的核心技术：Inline Sync

Refinex Editor 采用与 Milkdown inline-sync 相同的核心算法（"序列化-重解析"方式），但去除了 Milkdown DI 容器的耦合，直接在 ProseMirror 插件中实现。这一算法已在 Milkdown 中经过数年验证，核心代码量约 800 行。

**工作流程**：

1. 用户在某一行输入字符（例如键入 `**` 开始加粗）
2. ProseMirror 触发 Transaction
3. inline-sync 插件在 `appendTransaction` 钩子中拦截该事务
4. 将当前行的 ProseMirror Node 通过 markdown-it serializer 序列化为 Markdown 字符串
5. 在 Markdown 字符串中插入一个零宽空格占位符标记当前光标位置
6. 将该 Markdown 字符串通过 markdown-it parser 重新解析为 Token，再映射为 ProseMirror Node
7. 用新的 ProseMirror Node 替换旧的行内容
8. 根据占位符位置恢复光标

选择"序列化-重解析"方式而非 ZuuNote/Flow 的"纯 Decoration"方式，核心原因是前者的所有变更都是标准 ProseMirror Transaction，Undo/Redo 由 `prosemirror-history` 原生处理无需额外操心。ZuuNote 的开发者因为 Decoration 方案在 Undo/Redo 上遇到了无法克服的严重问题，被迫完全重写了实现——这是一个已被验证的陷阱。

### 选择 markdown-it 而非 Remark 的理由

Milkdown 使用 Remark/unified 生态做 Markdown 解析，但 Refinex Editor 选择 **markdown-it**，原因如下：markdown-it 是 `prosemirror-markdown` 官方包的默认 parser，与 ProseMirror 的 Token→Node 映射已有成熟方案（`MarkdownParser` 和 `MarkdownSerializer` 类）；markdown-it 的 Token 流模型比 Remark 的 AST 模型更接近 ProseMirror 的 Schema 映射方式，减少了递归遍历和位置映射的适配代码；markdown-it 有完善的插件生态（markdown-it-task-lists、markdown-it-footnote、markdown-it-math、markdown-it-sub/sup 等），GFM 支持完整。

### 编辑器架构：Block + Inline 混合模式

采用 **Block-Based + Inline Editing 混合架构**——与 Milkdown `@milkdown/crepe` 和 BlockNote 证明可行的方向一致，但实现完全自主可控：

**Block 层**：使用 ProseMirror 的 Node 系统定义块级节点（paragraph、heading、code_block、blockquote、table、image、horizontal_rule、ordered_list、bullet_list、list_item），每个块支持拖拽手柄（通过 NodeView 注入 BlockHandle 组件）和斜杠命令（通过 Radix Popover + cmdk）。

**Inline 层**：块内使用 Marks（strong、em、code、link、strikethrough）进行行内编辑，保持传统 Markdown 的流畅写作体验。inline-sync 插件在每行变更时执行完整的 AST 解析-渲染循环，确保精确的所见即所得。

**复杂节点（NodeView）**：通过 ProseMirror NodeView API 嵌入专用 React 组件——代码块用 **CodeMirror 6**（自带视口级懒渲染，支持百万行文档）、数学公式用 **KaTeX**（~100KB，同步渲染）、表格用 **prosemirror-tables**。

### Refinex Editor 模块结构

```
src/editor/                         # @refinex/editor — 自研编辑器包
├── schema.ts                       # ProseMirror Schema（完整 Markdown 文档模型）
├── parser.ts                       # Markdown → ProseMirror（基于 markdown-it + prosemirror-markdown）
├── serializer.ts                   # ProseMirror → Markdown（无损 round-trip）
├── plugins/
│   ├── inline-sync.ts              # 核心：Typora 式行内实时渲染（~800 行）
│   ├── input-rules.ts              # Markdown 快捷键（# → 标题、> → 引用等）
│   ├── keymap.ts                   # 键盘快捷键映射（Ctrl+B/I/K 等）
│   ├── cursor-decoration.ts        # 光标进出格式区域的视觉反馈
│   ├── placeholder.ts              # 空文档占位提示
│   ├── trailing-node.ts            # 文档末尾保证有空行
│   └── drop-cursor.ts              # 拖拽时的光标指示
├── node-views/
│   ├── CodeBlockView.tsx           # CodeMirror 6 代码块（语法高亮 + 视口懒渲染）
│   ├── ImageView.tsx               # 图片（拖拽上传 + 对齐控制）
│   ├── MathView.tsx                # KaTeX 数学公式（行内 + 块级）
│   └── TableView.tsx               # prosemirror-tables 表格编辑
├── commands/
│   ├── formatting.ts               # 切换加粗/斜体/代码/删除线等
│   ├── blocks.ts                   # 标题/引用/列表等块级操作
│   ├── insert.ts                   # 插入表格/图片/分割线/代码块等
│   └── ai-insert.ts               # AI 流式输出增量插入文档
├── ui/                             # 基于 Radix UI 的编辑器 UI 组件
│   ├── Toolbar.tsx                 # Radix Toolbar 格式工具栏
│   ├── SlashMenu.tsx               # cmdk + Radix Popover 斜杠命令菜单
│   ├── LinkPopover.tsx             # Radix Popover 链接编辑浮层
│   ├── BlockHandle.tsx             # 块拖拽手柄（悬停显示）
│   └── FloatingToolbar.tsx         # 选中文本时的浮动格式栏
├── RefinexEditor.tsx               # 主编辑器 React 组件（对外暴露的唯一入口）
└── index.ts                        # 公共 API 导出
```

### AI 流式写入编辑器的实现

自研编辑器的一个核心优势是 AI 集成的直接性。当 AI 流式生成文本时，直接操作 ProseMirror 的 Transaction API 在光标位置增量插入：

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

无需经过任何中间抽象层，流式 token 直接写入 ProseMirror 文档，延迟最低。生成完成后触发 inline-sync 全量重解析，确保 AI 输出的 Markdown 语法（如 `**加粗**`、`## 标题`）被正确渲染为格式化内容。

### Markdown Round-trip 保真度

存储原始 Markdown 源文件（`.md`），仅在用户修改内容时通过 serializer 重新序列化。使用 markdown-it 的 `MarkdownSerializer` 控制输出格式（强调符号选择 `*` vs `_`、列表缩进风格等），确保 Markdown → ProseMirror → Markdown 的 round-trip 无损。Rust 后端使用 **comrak**（100% CommonMark + GFM 兼容）处理后台批量解析、搜索索引构建、导出渲染等对性能敏感的场景，解析速度比 JS 方案快 **10-100 倍**。

### 开发周期预估

编辑器作为独立包 `@refinex/editor` 开发，在浏览器 Storybook 中独立开发和测试，不需要启动完整 Tauri 应用。第一阶段（6-8 周）实现基础编辑能力：Schema + Parser + Serializer + inline-sync + InputRules + 基础 NodeView。第二阶段（4-6 周）实现精细体验：表格编辑、数学公式、Slash Commands、块拖拽、光标进出视觉反馈、复制粘贴处理。这条路 Outline（ProseMirror 自研编辑器）、Quarto（ProseMirror Visual Editor）、Yandex（gravity-ui/markdown-editor）已经走通。

---

## 五、Git 集成：git2-rs 为主 + gitoxide 加速热路径

### Git 库选型

| 库 | 类型 | 成熟度 | Push 支持 | 性能 | Tauri 契合度 |
|----|------|--------|----------|------|-------------|
| **git2-rs** | Rust/C 绑定 | 生产级（8200 万+ 下载） | ✅ 完整 | 良好 | ⭐⭐⭐⭐⭐ |
| **gitoxide (gix)** | 纯 Rust | 演进中（pre-1.0） | ❌ 尚未支持 | 卓越（diff 快 11x） | ⭐⭐⭐⭐ |
| **isomorphic-git** | JavaScript | JS 生态成熟 | ✅（仅 HTTP） | 差 | ⭐⭐ |

**推荐策略：遵循 GitButler 已验证的双库方案。** GitButler（Tauri + Rust）使用 git2-rs 处理 clone、fetch、push、checkout 等需要完整协议支持的操作，同时使用 gitoxide 处理配置读取、commit 遍历（快 2x+）、tree-to-tree diff（快 11x）和 blame。gitoxide 作者 Sebastian Thiel 已作为 GitButler 承包商持续开发，其 `gix` 的可靠性在 Cargo（Rust 官方包管理器）中已得到验证。

isomorphic-git **不推荐**——在 Tauri 中运行 JS Git 操作需要通过 IPC 访问文件系统，抵消了其浏览器端优势，且性能远逊于 Rust 方案。

### Git UI 设计：面向非开发者的简化工作流

参考 VS Code 的 Source Control 面板和 GitButler 的看板式分支 UI，但为笔记场景大幅简化：

**自动同步模式（默认）**——参考 Obsidian Git 插件和 NotesHub 的状态机设计：

```
文件变更 → 防抖 30 秒 → 自动 git add + commit → 同步循环（1-5 分钟）
→ fetch → pull --rebase → push → 状态：已同步 ✅
→ 若冲突 → 尝试自动合并 → 若失败 → 通知用户 ⚠️
```

状态机：`dirty → committed → fetching → merging → pushing → synced`（或 `→ conflicted → user_resolution`）。

**UI 组件设计（基于 Radix UI）**：

- **状态指示器**（`Tooltip` + 自定义图标）：状态栏显示 ✅ 已同步 / 🔄 同步中 / ⚠️ 冲突 / ❌ 离线，悬停显示最后同步时间
- **文件树状态标记**（`Accordion` + `ContextMenu`）：文件名颜色编码（绿色=新增，橙色=修改，红色=删除），右键菜单提供 Git 操作（查看历史、还原、暂存）
- **版本历史**（`Dialog` + 虚拟滚动列表）：时间线视图，点击可查看任意版本的文档内容
- **Diff 视图**：Markdown 内容使用**词级别 diff**（而非行级别），高亮变更的单词而非整行——这对散文内容远比代码式 diff 更有意义
- **冲突解决**（`AlertDialog` + 三栏布局）：三栏视图（你的版本 | 对方版本 | 合并结果），提供"接受我的"/"接受对方的"/"接受两者"按钮

### GitHub 同步策略

**认证直接复用 GitHub OAuth Token**（见第三节），无需额外配置 SSH Key 或 Personal Access Token。同步架构采用**混合推拉模式**：文件保存时立即 commit + push（最低延迟），同时每 1-5 分钟定期 fetch（检测远端变更）。冲突解决使用 `git pull --rebase` 保持线性历史，配合 `merge.conflictstyle = zdiff3` 提升合并智能度。Markdown 文件的大部分冲突都在不同段落，能自动合并；真正冲突时弹出 Radix `AlertDialog` 让用户选择。

---

## 六、AI 面板：Vercel AI SDK 统一多模型接入

### 统一 Provider 抽象层

**Vercel AI SDK v6**（2025 年 12 月发布，周下载量 100 万+）是 AI 接入层的最佳选择，它提供了业界最成熟的多 Provider 统一接口：`generateText`、`streamText`、`generateObject`、`streamObject`、Tool Calling、Embeddings。切换 Provider 只需改两行代码。

**关键发现：所有主要中国 AI 提供商均支持 OpenAI 兼容 API 格式**，这意味着使用 AI SDK 的 `createOpenAI` 工厂函数 + 自定义 `baseURL` 即可统一接入：

| Provider | 旗舰模型 | API 端点 | 价格（每百万 token） |
|----------|---------|---------|-------------------|
| **DeepSeek** | V3.2 | api.deepseek.com | $0.27/$0.42 |
| **Qwen（阿里）** | Qwen 3.5 | dashscope-intl.aliyuncs.com | $0.55/$3.50 |
| **智谱 GLM** | GLM-5 | api.z.ai | $1.00/$3.20 |
| **Kimi（月之暗面）** | K2.5 | api.moonshot.ai | $0.60/$3.00 |
| **MiniMax** | M2.5 | api.minimax.io | $0.15/$1.20 |

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

// DeepSeek、Qwen、GLM、Kimi、MiniMax 均通过 OpenAI 兼容接口接入
const deepseek = createOpenAI({ baseURL: 'https://api.deepseek.com/v1', apiKey: userConfig.deepseekKey });
const qwen = createOpenAI({ baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', apiKey: userConfig.qwenKey });

// Claude 使用原生 Anthropic provider
const result = await streamText({
  model: userSelectedProvider === 'claude' ? anthropic('claude-sonnet-4-20250514') : deepseek('deepseek-chat'),
  system: buildSystemPrompt(context),
  messages: chatHistory,
});
```

### 在 Tauri 中运行 AI SDK

AI SDK Core 可在任何 Node.js 环境运行，不依赖 Next.js。在 Tauri 架构中有两个可行方案：

**方案 A（推荐）：Rust 后端直接调用 AI API**。Rust 通过 `reqwest` crate 直接发送 HTTP 请求到各 Provider 的 chat/completions 端点，使用 SSE（Server-Sent Events）处理流式响应，通过 Tauri Channel 将 token 流式传输到前端。这避免了 Node.js 依赖，保持架构纯净。

**方案 B：前端直接调用 AI API**。React 前端使用 AI SDK 的 `useChat` hook 直接调用 Provider API（API Key 从安全存储中读取注入）。此方案更简单但安全性稍低（API Key 在前端内存中）。

**推荐采用方案 A**，因为 API Key 管理更安全（永远不离开 Rust 后端），且 Rust 侧可以在发送前做上下文压缩和 token 预算管理。

### 上下文感知系统

```typescript
interface AIContext {
  currentDocument: {
    content: string;           // 当前文档全文
    filePath: string;          // 文件路径
    cursorPosition: number;    // 光标位置
    selectedText?: string;     // 选中文本
  };
  workspace: {
    directoryTree: FileNode[]; // 目录结构
    openFiles: string[];       // 当前打开的文件
    recentFiles: string[];     // 最近访问的文件
  };
  conversationHistory: Message[];
  userRules?: string;          // 用户自定义规则（类似 .cursorrules）
}
```

**大文档的上下文管理策略**：采用滑动窗口——以光标位置为中心截取前后各 2000 token 的内容，加上文档结构摘要（标题层级）和全文的 AI 生成摘要。DeepSeek 和 Anthropic 支持上下文缓存，对重复上下文可降低 90% 的输入成本。

### Agent 与 Skill 系统

参考 Hermes-Agent（Nous Research，70+ 内置 Skill）和 OpenCode（anomalyco，14 万+ Stars）的设计模式，采用 **SKILL.md 格式**（已成为 Claude Code、OpenCode、Hermes、Cursor、Gemini CLI 的事实标准）：

```markdown
---
name: expand-text
description: 扩展选中的文本段落，保持原有风格和语气
category: writing
outputMode: replace-selection
---
# Instructions
1. 阅读用户选中的文本
2. 分析其写作风格、语气和主题
3. 将内容扩展为原始长度的 2-3 倍
4. 保持一致的风格和逻辑连贯性
```

**渐进式上下文加载**（参考 Google ADK 的三级模式，可减少 90% 基础 token 消耗）：

- **L1 元数据**（~100 token/skill）：仅名称 + 描述，启动时全部加载
- **L2 指令**（~500-2000 token）：完整指令，按需加载（用户选择 Skill 时）
- **L3 资源**（可变）：参考文件、脚本，仅在实际执行时加载

**内置 Skill 列表**：总结文档、翻译、扩写、润色语法、生成大纲、续写、重写段落、提取要点、生成标题、问答对话。每个 Skill 定义 `outputMode`（`replace-selection` | `insert-at-cursor` | `new-document` | `chat-response`）控制输出行为。

AI 流式输出直接写入编辑器时，使用 ProseMirror 的 Transaction API 在光标位置增量插入文本，配合 Vercel 的 **Streamdown** 库处理未闭合的 Markdown 代码块和数学公式。

---

## 七、整体架构设计

### 项目目录结构

```
refinex-notes/
├── package.json                    # React + Radix UI + Tailwind + ProseMirror + markdown-it 依赖
├── vite.config.ts                  # Vite 配置（Tauri 官方推荐构建工具）
├── tailwind.config.js
├── index.html
├── src/                            # React 前端
│   ├── main.tsx                    # 入口
│   ├── App.tsx                     # 根组件 + 路由（登录/主界面）
│   ├── components/
│   │   ├── ui/                     # Radix UI 基础组件封装
│   │   │   ├── dialog.tsx          # Radix Dialog + Tailwind 样式
│   │   │   ├── popover.tsx         # Radix Popover
│   │   │   ├── context-menu.tsx    # Radix ContextMenu
│   │   │   ├── select.tsx          # Radix Select
│   │   │   ├── tabs.tsx            # Radix Tabs
│   │   │   ├── tooltip.tsx         # Radix Tooltip
│   │   │   ├── toast.tsx           # Radix Toast
│   │   │   ├── collapsible.tsx     # Radix Collapsible
│   │   │   ├── toolbar.tsx         # Radix Toolbar
│   │   │   ├── dropdown-menu.tsx   # Radix DropdownMenu
│   │   │   ├── alert-dialog.tsx    # Radix AlertDialog
│   │   │   └── command.tsx         # cmdk 命令面板封装
│   │   ├── auth/
│   │   │   └── LoginScreen.tsx     # GitHub OAuth 登录界面
│   │   ├── editor/                 # 自研 Refinex Editor（见第四节详细模块结构）
│   │   │   ├── schema.ts           # ProseMirror Schema（Markdown 文档模型）
│   │   │   ├── parser.ts           # Markdown → ProseMirror（markdown-it）
│   │   │   ├── serializer.ts       # ProseMirror → Markdown（无损 round-trip）
│   │   │   ├── plugins/            # inline-sync、input-rules、keymap 等
│   │   │   ├── node-views/         # CodeMirror 6、KaTeX、Table 等 NodeView
│   │   │   ├── commands/           # formatting、blocks、insert、ai-insert
│   │   │   ├── RefinexEditor.tsx   # 主编辑器 React 组件
│   │   │   └── index.ts            # 公共 API 导出
│   │   ├── sidebar/
│   │   │   ├── FileTree.tsx        # Radix Accordion + ContextMenu 文件树
│   │   │   ├── SearchPanel.tsx     # 全文搜索
│   │   │   └── OutlinePanel.tsx    # 文档大纲
│   │   ├── git/
│   │   │   ├── SyncStatus.tsx      # Radix Tooltip 同步状态指示器
│   │   │   ├── HistoryPanel.tsx    # Radix Dialog 版本历史
│   │   │   ├── DiffView.tsx        # Markdown Diff 视图
│   │   │   └── ConflictResolver.tsx # Radix AlertDialog 冲突解决
│   │   ├── ai/
│   │   │   ├── ChatPanel.tsx       # AI 对话面板
│   │   │   ├── SkillPicker.tsx     # Radix Select Skill 选择器
│   │   │   ├── ProviderSelect.tsx  # Radix Select 模型切换
│   │   │   └── StreamRenderer.tsx  # 流式 Markdown 渲染
│   │   └── settings/
│   │       ├── SettingsDialog.tsx   # Radix Dialog 设置入口
│   │       ├── GeneralSettings.tsx
│   │       ├── AIProviderConfig.tsx # AI 模型配置（API Key + base_url）
│   │       ├── GitSettings.tsx
│   │       └── AccountSettings.tsx  # GitHub 账号管理
│   ├── stores/                     # Zustand 状态管理
│   │   ├── authStore.ts            # 认证状态（用户信息、登录状态）
│   │   ├── noteStore.ts            # 笔记文件状态
│   │   ├── editorStore.ts          # 编辑器状态
│   │   ├── gitStore.ts             # Git 同步状态
│   │   ├── aiStore.ts              # AI 对话状态
│   │   └── settingsStore.ts        # 用户设置
│   ├── services/                   # Tauri IPC 封装
│   │   ├── authService.ts          # 认证操作（登录、登出、状态检查）
│   │   ├── fileService.ts          # 文件操作
│   │   ├── gitService.ts           # Git 操作
│   │   ├── searchService.ts        # 搜索
│   │   └── aiService.ts            # AI 调用
│   ├── hooks/                      # 自定义 React Hooks
│   │   ├── useAuth.ts              # 认证 Hook
│   │   └── useKeyboardShortcuts.ts # 快捷键
│   ├── types/                      # TypeScript 类型定义
│   └── plugins/                    # 前端插件 API + 加载器
├── src-tauri/                      # Rust 后端
│   ├── Cargo.toml
│   ├── tauri.conf.json             # Tauri 主配置
│   ├── capabilities/
│   │   └── default.json            # 权限定义
│   └── src/
│       ├── main.rs                 # 桌面入口
│       ├── lib.rs                  # 应用初始化 + 插件注册
│       ├── commands/               # Tauri Command 处理器
│       │   ├── mod.rs
│       │   ├── auth.rs             # GitHub OAuth Device Flow
│       │   ├── files.rs            # 文件 CRUD
│       │   ├── git.rs              # Git 操作
│       │   ├── search.rs           # 搜索
│       │   ├── ai.rs               # AI API 代理
│       │   └── settings.rs         # 设置管理
│       ├── state.rs                # AppState（含 github_client_id、pending_device_code）
│       ├── db.rs                   # rusqlite 初始化 + 迁移
│       ├── search/
│       │   ├── mod.rs              # Tantivy 搜索引擎
│       │   └── indexer.rs          # 增量索引器
│       ├── git/
│       │   ├── mod.rs              # git2-rs + gix 封装
│       │   ├── sync.rs             # 自动同步循环
│       │   └── auth.rs             # Token→Git 认证桥接
│       ├── ai/
│       │   ├── mod.rs              # AI Provider 抽象层
│       │   ├── providers.rs        # 各 Provider 实现
│       │   └── streaming.rs        # SSE 流式处理
│       ├── markdown/
│       │   ├── mod.rs              # comrak 解析器
│       │   └── export.rs           # 导出（HTML/PDF）
│       └── watcher.rs              # 文件系统监听（notify crate）
└── skills/                         # SKILL.md 文件
    ├── summarize.md
    ├── translate.md
    ├── expand.md
    └── fix-grammar.md
```

### 核心数据流

```
┌─────────────────────────────────────────────────────────────────────┐
│                    React Frontend (Radix UI + Tailwind CSS)           │
│                                                                       │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐         │
│  │ Refinex  │   │ File Tree│   │ AI Panel │   │ Git Panel│         │
│  │ Editor   │   │ (Radix)  │   │ (Chat)   │   │ (Status) │         │
│  │(ProseMir)│   │          │   │          │   │          │         │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘         │
│       │               │               │               │               │
│       └───────────────┴───────┬───────┴───────────────┘               │
│                               │                                       │
│                    Zustand Stores（含 authStore）                      │
│                               │                                       │
│               Tauri IPC（invoke / listen / Channel）                   │
└───────────────────────────────┼───────────────────────────────────────┘
                                │
┌───────────────────────────────┼───────────────────────────────────────┐
│                        Rust Backend                                    │
│                               │                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ 认证引擎  │  │ Git引擎  │  │ AI代理   │  │ 搜索引擎 │             │
│  │ OAuth +   │  │ git2-rs  │  │ reqwest  │  │ Tantivy  │             │
│  │ keyring   │  │ + gix    │  │ SSE解析  │  │ + Nucleo │             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐   │
│  │ 文件系统  │  │ Markdown │  │ 数据库   │  │ 共享状态（AppState）│   │
│  │ std::fs   │  │ comrak   │  │ rusqlite │  │ Mutex + RwLock     │   │
│  │ notify    │  │          │  │          │  │                     │   │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

**数据流示例——用户首次启动 Refinex-Notes**：

1. 应用启动 → Rust 调用 `check_auth_status()` → 从 Keychain 读取 Token → 验证有效性
2. Token 有效 → 通过 Event 通知前端 → authStore 更新为已登录 → 渲染主界面
3. Token 无效/不存在 → 前端渲染 LoginScreen → 用户点击"使用 GitHub 登录" → Device Flow

**数据流示例——用户编辑并保存笔记**：

1. 用户在 Refinex Editor 中输入 → inline-sync 插件实时序列化-重解析当前行，渲染为格式化内容
2. 用户按 Ctrl+S → React 调用 `invoke('save_note', { path, content })` → Rust 写入文件系统
3. Rust 文件监听器检测到变更 → 触发增量搜索索引更新（Tantivy）
4. Git 防抖计时器（30 秒）到期 → 自动 `git add + commit`（使用 OAuth Token 作为 Git 凭证）
5. 同步循环触发 → `fetch → pull --rebase → push` → 通过 Event 通知前端更新同步状态

### 前后端通信机制

Tauri 2.0 提供三种 IPC 机制，各有适用场景：

**Commands**（请求-响应，主要机制）：前端通过 `invoke('command_name', args)` 调用 Rust 函数，返回 `Result<T, E>`。所有数据通过 serde + JSON 序列化。适用于文件读写、搜索查询、Git 操作、认证流程等明确的请求-响应场景。

**Events**（双向广播，异步通知）：Rust 通过 `app_handle.emit("event-name", payload)` 向前端广播，前端通过 `listen("event-name", callback)` 监听。适用于文件变更通知、同步状态更新、认证状态变化等火并忘（fire-and-forget）场景。

**Channels**（流式传输，高性能）：通过 `tauri::ipc::Channel<T>` 从 Rust 向前端流式发送数据，保证有序且比 Events 更高效。适用于 AI 流式响应、OAuth 轮询进度、大文件分块读取等场景。

### 状态管理策略

**前端使用 Zustand**（~1KB，无需 Provider，异步友好）管理全局状态。`authStore` 管理用户登录状态和信息，`noteStore` 管理文件列表和当前文档，其余 store 各司其职。对于编辑器内部的细粒度状态（光标位置、选区、单个 UI 开关），可配合 Jotai 原子状态。**Rust 后端通过 `app.manage(AppState)` + `Mutex`/`RwLock`** 管理数据库连接、搜索索引、Git 仓库引用、OAuth 临时状态等共享资源。

前后端状态同步采用**事件驱动模式**：Rust 状态变更 → `emit` 事件 → React 监听并更新 Zustand store。

### 搜索系统

**全文搜索使用 Tantivy**（Rust 的 Apache Lucene 等价物，基准测试比 Lucene 快约 2 倍，启动时间 <10ms，完全嵌入式）。索引 Schema 包含 path、title、body（纯文本，去除 Markdown 语法）、tags、modified 字段。增量索引：通过文件监听器检测变更，仅重新索引修改的文件。

**文件名模糊搜索使用 Nucleo**（来自 helix 编辑器项目，比 skim/fuzzy-matcher 快约 6 倍）。短查询（<3 字符）走 Nucleo 模糊匹配，长查询走 Tantivy 全文检索 + Nucleo 文件名匹配，结果合并排序。

---

## 八、从参考项目提炼的关键设计决策

### 插件系统：学习 Obsidian

Obsidian 拥有 **2,692+ 社区插件**和 **9,700 万次下载**，其插件 API 设计是笔记软件生态建设的标杆。核心模式：TypeScript Plugin 基类提供 `onload()`/`onunload()` 生命周期，通过 `App` 全局对象访问 Vault（文件操作）、Workspace（视图管理）、MetadataCache（元数据索引）、Editor（编辑器接口）。插件打包为 `main.js` + `manifest.json` + `styles.css`，存放在 `.refinex/plugins/` 目录。

**在 Tauri 架构中的实现方案**：前端 JS 插件通过 **Web Workers 沙箱**执行（无 DOM 访问，通过 postMessage 与主线程通信），UI 插件通过 **sandboxed iframe** 渲染（`<iframe sandbox="allow-scripts">`）。每个插件在 manifest 中声明所需权限，运行时进行 API 访问控制。Rust 侧扩展通过 Tauri 原生插件系统（`tauri::plugin::Builder`）支持自定义 Commands 和生命周期钩子。

### 编辑器哲学：AFFiNE 的 CRDT 启示

AFFiNE（**6.7 万 Stars**，React + Electron + 自研 BlockSuite 编辑器 + Rust napi-rs 原生模块）采用 **Yjs CRDT 从底层构建数据层**，同一技术同时支撑本地持久化和实时协作。如果未来 Refinex-Notes 考虑多设备协同编辑，建议在架构初期就引入 Yjs——ProseMirror 原生支持 Y.js 协作插件（`y-prosemirror`），可在自研编辑器中直接集成。但若 MVP 阶段仅需 Git 同步，可暂不引入 CRDT 以降低复杂度。

### MarkText 的教训：避免从零自建底层编辑引擎

MarkText（**5.3 万 Stars**）从零自研了 Muya 编辑器引擎（直接操作 contentEditable，不基于任何编辑器框架），但已**实质废弃**——原始维护者转向其他项目，过时的构建工具链导致社区无法有效接手。这是一个关于可维护性的重要警示：**从零构建 contentEditable 编辑引擎**（处理浏览器输入、Selection API、DOM 同步等底层逻辑）是一个人年级别的工程。Refinex Editor 的自研策略是**基于 ProseMirror 原语自研**——ProseMirror 处理全部 contentEditable 底层复杂性，Refinex 只自研 Markdown↔ProseMirror 的映射层和 inline-sync 逻辑。这与 Outline、Quarto 的成功路径一致：在成熟框架之上自研，而非替代成熟框架。

### 大文件编辑性能

ProseMirror 渲染完整 DOM，在超大文档（10k+ 节点）时可能遇到 Chrome contentEditable 的性能瓶颈。对策包括：**虚拟化**（仅渲染视口附近的 Block）、**分块解析**（Web Worker 中增量解析）、**WASM 加速**（comrak 编译为 WASM，~100-300KB 模块大小，解析性能提升 5-10 倍）、**增量更新**（仅重新解析修改的段落/块）。代码块内嵌 CodeMirror 6 自带视口级懒渲染，可处理百万行文档。

---

## 九、最终技术选型总览

| 层 | 技术 | 选型理由 |
|----|------|---------|
| 桌面框架 | **Tauri 2.0** | 包体积 <10MB，内存 30-40MB，原生 Rust 后端 |
| 前端框架 | **React 18+ + Vite** | 生态最大，Tauri 官方推荐 Vite |
| UI 组件库 | **Radix UI** | Headless、可访问性优先，与 Tailwind 完美配合，复杂交互一等支持 |
| 命令面板 | **cmdk** | 基于 Radix UI，Linear 风格，模糊搜索 + 键盘导航 |
| 图标库 | **Lucide React** | ~1KB/icon，tree-shakeable |
| UI 样式 | **Tailwind CSS** | 实用优先，快速开发，包体积可 Tree-shake |
| 认证系统 | **GitHub OAuth Device Flow** | 一次登录同时获得身份认证 + Git 授权 |
| Token 存储 | **keyring crate（操作系统钥匙串）** | macOS Keychain / Windows Credential Manager / Linux Secret Service |
| 编辑器核心 | **自研 Refinex Editor（ProseMirror + markdown-it）** | 完全控制体验、AI 集成直接、无第三方框架依赖风险 |
| 代码块渲染 | **CodeMirror 6** | 视口懒渲染，支持百万行，Obsidian/Zettlr 验证 |
| 数学公式 | **KaTeX** | ~100KB，同步渲染，prosemirror-math 集成 |
| 前端状态 | **Zustand** + Jotai（细粒度） | 轻量，异步友好，Tauri 应用验证 |
| Markdown 解析（Rust） | **comrak** | 100% CommonMark + GFM，arena AST |
| Markdown 解析（前端） | **markdown-it** | prosemirror-markdown 官方集成，Token 流与 Schema 天然映射 |
| Git 引擎 | **git2-rs**（主）+ **gix**（热路径） | GitButler 验证的双库方案 |
| Git 认证 | **复用 OAuth Token + HTTPS** | 无需 SSH Key，零额外配置 |
| AI 接入层 | **Vercel AI SDK v6 / Rust reqwest** | 统一 Provider 接口，支持所有中国 AI |
| AI 流式渲染 | **Streamdown** | 处理未闭合 Markdown 块 |
| 全文搜索 | **Tantivy** | 比 Lucene 快 2x，嵌入式 |
| 模糊搜索 | **Nucleo** | 比 skim 快 6x，helix 验证 |
| 数据库 | **rusqlite** | 元数据索引，轻量嵌入式 |
| 文件监听 | **notify crate** | Tauri fs 插件内置支持 |
| 虚拟滚动 | **react-virtuoso** | 自动变高，无需手动测量 |
| 插件沙箱 | **Web Workers + sandboxed iframe** | 隔离执行，无需额外进程 |
| Skill 格式 | **SKILL.md（YAML frontmatter）** | 生态标准（Claude Code/OpenCode/Hermes） |

---

## 十、结论与关键洞察

这套架构的核心竞争力不在单一技术选择，而在**五个架构层面的协同优化**。

**第一，Rust 后端统一处理所有 I/O 密集型和计算密集型任务**（Markdown 解析、Git 操作、全文搜索索引、AI API 代理、OAuth 认证），React 前端专注交互渲染——这是 GitButler 用 Tauri 超越传统 Electron Git 客户端的同一模式。

**第二，自研 Refinex Editor 基于 ProseMirror + markdown-it 实现 Typora 级所见即所得体验**，采用经过 Milkdown 验证的"序列化-重解析"inline-sync 算法（核心 ~800 行），但完全去除第三方框架依赖。这确保了对编辑器每个交互细节的完全控制权，以及 AI 流式写入的最短路径——`view.dispatch(tr.insertText(...))` 一行代码直达 ProseMirror。ZuuNote、Flow、Outline、Quarto Visual Editor、Yandex Markdown Editor 五个独立案例已验证了基于 ProseMirror 自研 Markdown WYSIWYG 编辑器的可行性。

**第三，GitHub OAuth Device Flow 实现"一次登录，三重用途"**——应用身份认证、Git HTTPS 推拉授权、GitHub API 调用——大幅降低用户的首次使用门槛。

**第四，所有中国主流 AI 提供商统一为 OpenAI 兼容 API**，使得多模型接入从 N 个适配器简化为"一个接口 + N 个 base_url 配置"。

**第五，Radix UI + Tailwind CSS 的 headless + utility 组合**，既保证了复杂交互（右键菜单、弹出面板、对话框）的可访问性和键盘体验，又赋予了完全自定义视觉语言的自由度——这是打造区别于"又一个 Electron 笔记应用"的关键。自研编辑器内的 UI 组件（Toolbar、SlashMenu、LinkPopover、FloatingToolbar）全部基于 Radix UI 构建，与应用整体设计语言完全一致，不存在两套组件体系冲突的问题。

最大的技术风险是 WebKit 跨平台渲染差异对 contentEditable 编辑器的影响，以及自研编辑器 inline-sync 的边缘情况处理。前者通过三平台 CI 测试矩阵缓解——ProseMirror 的核心设计就是跨浏览器兼容，它拦截所有 contentEditable 事件并自行管理 DOM 更新，官方声明支持包括 WebKit 在内的所有主流引擎。后者通过不自己写 Markdown 解析器缓解——markdown-it 处理全部 Markdown 语法解析，自研部分仅限于 Token↔ProseMirror 的映射层和 inline-sync 的事务管理。

建议 MVP 阶段聚焦**编辑器核心 + GitHub 登录 + 基础 Git 同步**三个模块，AI 面板和插件系统作为第二阶段迭代。编辑器作为独立包 `@refinex/editor` 在 Storybook 中并行开发，不阻塞 Tauri 应用主体和 Git 模块的进度。这三个核心模块的实现路径已被 GitButler（Tauri + Git + OAuth）、Outline/Quarto（ProseMirror 自研 Markdown 编辑器）、Obsidian（文件管理）充分验证，技术风险可控。
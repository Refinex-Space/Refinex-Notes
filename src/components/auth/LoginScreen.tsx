import {
  AlertCircle,
  Copy,
  ExternalLink,
  LoaderCircle,
} from "lucide-react";
import { useState } from "react";

import { authService } from "../../services/authService";
import { useAuthStore } from "../../stores/authStore";

function GitHubMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-current"
    >
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.16c-3.34.73-4.04-1.42-4.04-1.42-.54-1.38-1.33-1.74-1.33-1.74-1.09-.74.08-.72.08-.72 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.48 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.24-.12-.3-.54-1.53.12-3.19 0 0 1.01-.32 3.3 1.24a11.4 11.4 0 0 1 6 0c2.28-1.56 3.29-1.24 3.29-1.24.67 1.66.25 2.89.12 3.19.77.85 1.24 1.92 1.24 3.24 0 4.63-2.8 5.65-5.48 5.95.43.38.81 1.11.81 2.24v3.32c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

async function copyText(text: string) {
  if (!navigator.clipboard) {
    throw new Error("当前环境不支持剪贴板复制");
  }

  await navigator.clipboard.writeText(text);
}

export function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const deviceCode = useAuthStore((state) => state.deviceCode);
  const authStep = useAuthStore((state) => state.authStep);
  const progressMessage = useAuthStore((state) => state.progressMessage);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [copiedCode, setCopiedCode] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  const showDeviceCode = deviceCode !== null;
  const isPolling = authStep === "polling";

  const handleCopyCode = async () => {
    if (!deviceCode) {
      return;
    }

    try {
      await copyText(deviceCode.userCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : "复制验证码失败");
    }
  };

  const handleOpenBrowser = async () => {
    if (!deviceCode) {
      return;
    }

    try {
      setOpenError(null);
      await authService.openVerificationUri(deviceCode.verificationUri);
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : "打开浏览器失败");
    }
  };

  return (
    <main className="flex h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_38%),linear-gradient(180deg,#071120_0%,#040814_52%,#03060f_100%)] px-6 text-fg">
      <section className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 shadow-[0_28px_120px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/55 to-transparent" />
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
          Phase 5.1
        </div>

        <div className="mt-6">
          <h1 className="text-[2rem] font-semibold tracking-tight text-fg">
            Refinex-Notes
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
            Markdown 笔记，Git 驱动，AI 增强。先完成 GitHub 登录，再进入本地工作区与编辑器主界面。
          </p>
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-white/8 bg-slate-950/55 p-5">
          {!showDeviceCode ? (
            <>
              <button
                type="button"
                className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-semibold text-fg transition hover:border-cyan-300/35 hover:bg-cyan-400/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => {
                  void login();
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <GitHubMark />
                )}
                使用 GitHub 登录
              </button>
              <p className="mt-4 text-xs leading-5 text-muted">
                登录成功后，GitHub access token 会安全写入操作系统钥匙串，不会存到浏览器存储。
              </p>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                    Device Code
                  </p>
                  <p className="mt-3 font-mono text-[2rem] font-semibold tracking-[0.28em] text-fg">
                    {deviceCode.userCode}
                  </p>
                </div>
                {isPolling ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium text-cyan-100">
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    轮询中
                  </div>
                ) : null}
              </div>

              <p className="mt-4 text-xs leading-5 text-muted">
                在 GitHub 页面输入上面的验证码，确认授权后应用会自动跳转回主界面。
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-medium text-fg transition hover:border-white/20 hover:bg-white/[0.08]"
                  onClick={() => {
                    void handleCopyCode();
                  }}
                >
                  <Copy className="h-4 w-4" />
                  {copiedCode ? "已复制" : "复制验证码"}
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-300/18 bg-cyan-400/10 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-400/15"
                  onClick={() => {
                    void handleOpenBrowser();
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  打开浏览器
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <p className="truncate text-[12px] font-medium text-fg/90">
                  {deviceCode.verificationUri}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-muted">
                  验证码有效期约 {Math.ceil(deviceCode.expiresIn / 60)} 分钟。
                </p>
              </div>
            </>
          )}

          {(progressMessage || errorMessage || openError) ? (
            <div className="mt-5 space-y-3">
              {progressMessage ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[12px] text-muted">
                  {isPolling ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin text-cyan-200" />
                  ) : null}
                  <span>{progressMessage}</span>
                </div>
              ) : null}

              {(errorMessage || openError) ? (
                <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{openError ?? errorMessage}</span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default LoginScreen;

import {
  AlertCircle,
  Bot,
  CheckCircle2,
  GitBranch,
  Keyboard,
  MonitorCog,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useSettingsStore } from "../../stores/settingsStore";
import type { SettingsSection } from "../../types";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "../ui/toast";
import { AccountSettings } from "./AccountSettings";
import { AIProviderConfig } from "./AIProviderConfig";
import { EditorSettings } from "./EditorSettings";
import { GeneralSettings } from "./GeneralSettings";
import { GitSettings } from "./GitSettings";
import { ShortcutSettings } from "./ShortcutSettings";

const SECTIONS: Array<{
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof MonitorCog;
}> = [
  {
    id: "general",
    label: "通用",
    description: "主题、语言和启动行为",
    icon: MonitorCog,
  },
  {
    id: "editor",
    label: "编辑器",
    description: "字族、字号和自动保存",
    icon: SlidersHorizontal,
  },
  {
    id: "ai",
    label: "AI 模型",
    description: "Provider、模型目录和测试连接",
    icon: Bot,
  },
  {
    id: "git",
    label: "Git 同步",
    description: "自动同步和 commit 模板",
    icon: GitBranch,
  },
  {
    id: "shortcuts",
    label: "快捷键",
    description: "当前默认映射与后续扩展入口",
    icon: Keyboard,
  },
  {
    id: "account",
    label: "账户",
    description: "GitHub 账户信息与登出",
    icon: UserRound,
  },
];

function renderSection(section: SettingsSection) {
  switch (section) {
    case "general":
      return <GeneralSettings />;
    case "editor":
      return <EditorSettings />;
    case "ai":
      return <AIProviderConfig />;
    case "git":
      return <GitSettings />;
    case "shortcuts":
      return <ShortcutSettings />;
    case "account":
      return <AccountSettings />;
    default:
      return null;
  }
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [section, setSection] = useState<SettingsSection>("general");
  const [saveToastOpen, setSaveToastOpen] = useState(false);
  const [saveToastKey, setSaveToastKey] = useState(0);
  const [errorToastOpen, setErrorToastOpen] = useState(false);
  const [errorToastKey, setErrorToastKey] = useState(0);
  const [errorToastMessage, setErrorToastMessage] = useState("");
  const isLoaded = useSettingsStore((state) => state.isLoaded);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const isSaving = useSettingsStore((state) => state.isSaving);
  const errorMessage = useSettingsStore((state) => state.errorMessage);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const saveSettings = useSettingsStore((state) => state.saveSettings);
  const clearError = useSettingsStore((state) => state.clearError);

  useEffect(() => {
    if (!isLoaded) {
      void loadSettings();
    }
  }, [isLoaded, loadSettings]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    setErrorToastMessage(errorMessage);
    setErrorToastKey((current) => current + 1);
    setErrorToastOpen(true);
  }, [errorMessage]);

  const handleSaveSettings = async () => {
    try {
      await saveSettings();
      setSaveToastKey((current) => current + 1);
      setSaveToastOpen(true);
    } catch {
      setSaveToastOpen(false);
    }
  };

  return (
    <ToastProvider swipeDirection="right">
      <div className="h-full min-h-0 bg-bg">
        <div className="grid h-full min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="border-b border-border/70 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_36%),rgb(var(--color-bg)/0.96)] p-5 lg:border-b-0 lg:border-r">
            <header className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight text-fg">
                应用设置
              </h1>
              <p className="text-sm leading-6 text-muted">
                管理外观、AI Provider、同步与账户。
              </p>
            </header>

            <nav className="mt-6 space-y-1.5">
              {SECTIONS.map((entry) => {
                const Icon = entry.icon;
                const active = entry.id === section;

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSection(entry.id)}
                    className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-accent/25 bg-accent/10 text-fg"
                        : "border-transparent bg-transparent text-muted hover:border-border/70 hover:bg-fg/[0.04] hover:text-fg"
                    }`}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {entry.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        {entry.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="flex min-h-0 flex-col bg-bg/95">
            <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
              <div>
                <p className="text-sm font-semibold text-fg">
                  {SECTIONS.find((entry) => entry.id === section)?.label}
                </p>
                <p className="text-sm text-muted">
                  {SECTIONS.find((entry) => entry.id === section)?.description}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border/70 px-4 text-sm font-medium text-muted transition hover:bg-fg/[0.06] hover:text-fg"
                >
                  关闭
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveSettings();
                  }}
                  disabled={isSaving || isLoading}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "保存中…" : "保存设置"}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {isLoading && !isLoaded ? (
                <div className="rounded-3xl border border-dashed border-border/70 bg-bg/70 p-6 text-sm text-muted">
                  正在加载设置…
                </div>
              ) : (
                renderSection(section)
              )}
            </div>
          </section>
        </div>
      </div>
      <Toast
        key={saveToastKey}
        open={saveToastOpen}
        onOpenChange={setSaveToastOpen}
        duration={2200}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <div className="space-y-1">
            <ToastTitle>设置已保存</ToastTitle>
            <ToastDescription>
              当前分区的修改已经写入本地设置。
            </ToastDescription>
          </div>
        </div>
        <ToastClose />
      </Toast>
      <Toast
        key={errorToastKey}
        open={errorToastOpen}
        onOpenChange={(open) => {
          setErrorToastOpen(open);
          if (!open) {
            clearError();
          }
        }}
        duration={4200}
        className="border-rose-200/80 bg-rose-50/95 text-rose-950 shadow-[0_22px_70px_rgba(190,24,93,0.18)] dark:border-rose-500/30 dark:bg-rose-950/95 dark:text-rose-50"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/12 text-rose-500">
            <AlertCircle className="h-4 w-4" />
          </span>
          <div className="space-y-1">
            <ToastTitle className="text-rose-900 dark:text-rose-50">
              操作失败
            </ToastTitle>
            <ToastDescription className="text-rose-700 dark:text-rose-100/90">
              {errorToastMessage}
            </ToastDescription>
          </div>
        </div>
        <ToastClose className="text-rose-400 hover:border-rose-200/70 hover:text-rose-700 dark:text-rose-200/70 dark:hover:border-rose-400/30 dark:hover:text-rose-50" />
      </Toast>
      <ToastViewport className="!left-1/2 !right-auto !top-5 !w-[min(380px,calc(100vw-2rem))] !-translate-x-1/2" />
    </ToastProvider>
  );
}

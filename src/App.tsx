import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Command as CommandIcon,
  MessageSquareText,
  MoonStar,
  Paintbrush2,
  PanelsTopLeft,
  Sparkles,
  SunMedium,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/ui/popover";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import { RefinexEditor } from "./editor";

type DemoToast = {
  id: number;
  title: string;
  description: string;
};

const surfaceButtonClasses = [
  "inline-flex items-center justify-center gap-2 rounded-full border border-border/70 px-4 py-2.5 text-sm font-medium",
  "bg-bg/90 text-fg transition hover:border-accent/50 hover:bg-accent/10",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
].join(" ");

const ghostButtonClasses = [
  "inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted transition",
  "hover:bg-accent/10 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
].join(" ");

const testMarkdown = `# Refinex Editor

## 基本文本格式

**加粗文本**、*斜体文本*、~~删除线~~ 和 \`行内代码\`。

[访问 Refinex](https://github.com) — 支持链接渲染。

## 代码块

\`\`\`typescript
const greeting = (name: string): string => {
  return \`Hello, \${name}!\`;
};
\`\`\`

## 引用块

> 好的工具应当消失在工作流程中，让使用者专注于内容本身。

## 列表

- 无序列表项 A
- 无序列表项 B
  - 嵌套项 B1
  - 嵌套项 B2

1. 有序列表项 1
2. 有序列表项 2

## 任务列表

- [x] 定义 ProseMirror Schema
- [x] 实现 Markdown Parser / Serializer
- [x] 创建 RefinexEditor 组件
- [ ] 集成 AI 辅助写作

## 表格

| 功能 | 状态 | 优先级 |
|------|:----:|-------:|
| 基础编辑 | ✅ | 高 |
| 实时协作 | 🔧 | 中 |
| AI 续写 | ⬜ | 高 |

---

段落之间使用空行分隔。换行符  
使用行末双空格实现硬换行。
`;

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [commandOpen, setCommandOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toasts, setToasts] = useState<DemoToast[]>([]);
  const [editorMarkdown, setEditorMarkdown] = useState(testMarkdown);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandOpen]);

  const cards = useMemo(
    () => [
      {
        title: "Tailwind 主题变量",
        description:
          "颜色来自 CSS 变量，切换 `.dark` 类即可同步整个界面的背景、文字、边框与强调色。",
        icon: Paintbrush2,
      },
      {
        title: "Radix 交互原语",
        description:
          "Dialog、Popover、Tooltip、Toast 全部使用 headless primitives + Tailwind data-state 动画。",
        icon: PanelsTopLeft,
      },
      {
        title: "Cmd+K 命令面板",
        description:
          "通过 cmdk 构建 Command Palette，并使用 Lucide 图标统一视觉语言。",
        icon: CommandIcon,
      },
    ],
    [],
  );

  const enqueueToast = (title: string, description: string) => {
    setToasts((current) => [
      ...current,
      { id: Date.now() + current.length, title, description },
    ]);
  };

  const commandItems = [
    {
      value: "open-dialog",
      label: "打开 Dialog 示例",
      shortcut: "↵",
      icon: PanelsTopLeft,
      onSelect: () => setDialogOpen(true),
    },
    {
      value: "show-toast",
      label: "触发 Toast 通知",
      shortcut: "⌥T",
      icon: Bell,
      onSelect: () =>
        enqueueToast("Toast 已发送", "这条通知用于验证 Radix Toast 的动画与交互。"),
    },
    {
      value: "toggle-theme",
      label: theme === "dark" ? "切换到 Light 模式" : "切换到 Dark 模式",
      shortcut: "⌘D",
      icon: theme === "dark" ? SunMedium : MoonStar,
      onSelect: () =>
        setTheme((current) => (current === "dark" ? "light" : "dark")),
    },
  ];

  return (
    <ToastProvider swipeDirection="right">
      <TooltipProvider>
        <main className="min-h-screen bg-bg px-6 py-8 text-fg md:px-10">
          <div className="mx-auto flex max-w-6xl flex-col gap-8">
            <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-bg/95 shadow-panel">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 px-6 py-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.38em] text-accent">
                    Phase 0.2 · UI Infrastructure
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                    Tailwind + Radix + cmdk 验证页
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={ghostButtonClasses}
                        onClick={() =>
                          setTheme((current) =>
                            current === "dark" ? "light" : "dark",
                          )
                        }
                      >
                        {theme === "dark" ? (
                          <SunMedium className="h-4 w-4" />
                        ) : (
                          <MoonStar className="h-4 w-4" />
                        )}
                        {theme === "dark" ? "Light" : "Dark"}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      通过 html 元素上的 <code>.dark</code> 类切换主题
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={surfaceButtonClasses}
                        onClick={() => setCommandOpen(true)}
                      >
                        <CommandIcon className="h-4 w-4" />
                        打开命令面板
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>支持 Cmd/Ctrl + K</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                  <p className="max-w-3xl text-base leading-7 text-muted">
                    这个页面用于验收 Phase 0.2：Tailwind 样式变量、Radix
                    交互原语、Lucide 图标与 cmdk 命令面板都在这里直接可见可点。
                  </p>

                  <div className="grid gap-4 md:grid-cols-3">
                    {cards.map((card) => {
                      const Icon = card.icon;

                      return (
                        <article
                          key={card.title}
                          className="rounded-3xl border border-border/70 bg-bg/80 p-5"
                        >
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                            <Icon className="h-5 w-5" />
                          </span>
                          <h2 className="mt-4 text-lg font-semibold">{card.title}</h2>
                          <p className="mt-3 text-sm leading-6 text-muted">
                            {card.description}
                          </p>
                        </article>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <button type="button" className={surfaceButtonClasses}>
                          <PanelsTopLeft className="h-4 w-4" />
                          打开 Dialog
                        </button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Dialog 封装已接通</DialogTitle>
                          <DialogDescription>
                            这里验证 Radix Dialog 的 overlay、portal、Tailwind
                            动画和 dark mode 表现。
                          </DialogDescription>
                        </DialogHeader>
                        <div className="rounded-3xl border border-border/70 bg-accent/6 p-4 text-sm leading-6 text-muted">
                          当前主题：<strong className="text-fg">{theme}</strong>。
                          你可以先切换主题，再重新打开这个弹窗确认令牌变量是否同步生效。
                        </div>
                        <DialogFooter>
                          <button
                            type="button"
                            className={surfaceButtonClasses}
                            onClick={() =>
                              enqueueToast(
                                "Dialog 动作已执行",
                                "这个按钮同时验证了 Dialog 与 Toast 的组合使用。",
                              )
                            }
                          >
                            <Sparkles className="h-4 w-4" />
                            触发联动 Toast
                          </button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className={surfaceButtonClasses}>
                          <Paintbrush2 className="h-4 w-4" />
                          查看 Popover
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start">
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold">Design Tokens</h3>
                          <p className="text-sm leading-6 text-muted">
                            当前 Popover 使用同一组 CSS 变量，因此也会跟随主题切换。
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              ["bg-bg", "bg-bg"],
                              ["bg-fg", "bg-fg"],
                              ["bg-muted", "bg-muted"],
                              ["bg-accent", "bg-accent"],
                            ].map(([label, tone]) => (
                              <div
                                key={label}
                                className="rounded-2xl border border-border/70 p-3"
                              >
                                <div
                                  className={`h-10 rounded-xl border border-border/70 ${tone}`}
                                />
                                <p className="mt-2 text-xs text-muted">{label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <button
                      type="button"
                      className={surfaceButtonClasses}
                      onClick={() =>
                        enqueueToast(
                          "通知已送达",
                          "Toast + Viewport + swipe 动画当前工作正常。",
                        )
                      }
                    >
                      <Bell className="h-4 w-4" />
                      触发 Toast
                    </button>
                  </div>
                </div>

                <aside className="rounded-[2rem] border border-border/70 bg-bg/80 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-fg">验收清单</p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        当前页面的每个模块都对应本次任务的一条验收标准。
                      </p>
                    </div>
                    <MessageSquareText className="mt-1 h-5 w-5 text-accent" />
                  </div>

                  <ul className="mt-6 space-y-3 text-sm text-muted">
                    <li className="rounded-2xl border border-border/70 bg-bg/60 p-4">
                      1. Tailwind token + dark class
                    </li>
                    <li className="rounded-2xl border border-border/70 bg-bg/60 p-4">
                      2. Dialog / Popover / Tooltip / Toast 封装
                    </li>
                    <li className="rounded-2xl border border-border/70 bg-bg/60 p-4">
                      3. Cmd+K 命令面板
                    </li>
                    <li className="rounded-2xl border border-border/70 bg-bg/60 p-4">
                      4. 零 TypeScript 类型错误
                    </li>
                  </ul>
                </aside>
              </div>
            </section>

            {/* ── RefinexEditor 预览 ─────────────────────────────── */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-fg">
                ProseMirror 编辑器集成
              </h2>
              <p className="text-sm text-muted">
                基于 ProseMirror 的所见即所得编辑器，支持 GFM Markdown
                双向转换。在下方编辑，右侧实时查看 Markdown 源码。
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-bg/60">
                  <div className="border-b border-border/70 px-4 py-2 text-xs font-medium text-muted">
                    编辑区
                  </div>
                  <RefinexEditor
                    value={editorMarkdown}
                    onChange={setEditorMarkdown}
                    className="min-h-[420px] p-4"
                  />
                </div>
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-bg/60">
                  <div className="border-b border-border/70 px-4 py-2 text-xs font-medium text-muted">
                    Markdown 源码
                  </div>
                  <pre className="overflow-auto p-4 text-xs text-muted" style={{ minHeight: 420 }}>
                    {editorMarkdown}
                  </pre>
                </div>
              </div>
            </section>
          </div>
        </main>

        <CommandDialog
          open={commandOpen}
          onOpenChange={setCommandOpen}
          title="Phase 0.2 Command Palette"
          description="使用命令快速验证当前 UI 基础设施。"
        >
          <CommandInput placeholder="搜索命令或组件..." />
          <CommandList>
            <CommandEmpty>没有匹配的命令。</CommandEmpty>
            <CommandGroup heading="验证动作">
              {commandItems.map((item) => {
                const Icon = item.icon;

                return (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    onSelect={() => {
                      item.onSelect();
                      setCommandOpen(false);
                    }}
                  >
                    <Icon className="h-4 w-4 text-accent" />
                    <span>{item.label}</span>
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="提示">
              <CommandItem disabled>
                <Sparkles className="h-4 w-4 text-muted" />
                <span>这是一个仅用于 Phase 0.2 验证的演示面板</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>

        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            defaultOpen
            onOpenChange={(open) => {
              if (!open) {
                setToasts((current) =>
                  current.filter((item) => item.id !== toast.id),
                );
              }
            }}
          >
            <div className="space-y-1">
              <ToastTitle>{toast.title}</ToastTitle>
              <ToastDescription>{toast.description}</ToastDescription>
            </div>
            <div className="flex items-center gap-2">
              <ToastAction
                altText="再次打开命令面板"
                onClick={() => setCommandOpen(true)}
              >
                打开 Cmd+K
              </ToastAction>
              <ToastClose />
            </div>
          </Toast>
        ))}
        <ToastViewport />
      </TooltipProvider>
    </ToastProvider>
  );
}

export default App;

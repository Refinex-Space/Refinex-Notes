import { useEffect, useMemo, useState } from "react";
import {
  Command,
  FilePlus2,
  FolderOpen,
  MoonStar,
  Settings2,
  SunMedium,
} from "lucide-react";

import type { CommandPaletteItem } from "../types";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./ui/command";

interface CommandPaletteProps {
  files: CommandPaletteItem[];
  theme: "light" | "dark";
  onCreateFile: () => void;
  onOpenFile: (path: string) => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
}

export function CommandPalette({
  files,
  theme,
  onCreateFile,
  onOpenFile,
  onOpenSettings,
  onToggleTheme,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-refinex-editor-shell]")) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const commands = useMemo(
    () => [
      {
        id: "command:new-file",
        title: "新建文件",
        description: "创建一篇新的 Markdown 笔记",
        shortcut: "⌘N",
        icon: FilePlus2,
        onSelect: onCreateFile,
      },
      {
        id: "command:toggle-theme",
        title: theme === "dark" ? "切换到浅色主题" : "切换到深色主题",
        description: "切换应用外观主题",
        shortcut: "⌘⇧T",
        icon: theme === "dark" ? SunMedium : MoonStar,
        onSelect: onToggleTheme,
      },
      {
        id: "command:settings",
        title: "打开设置",
        description: "查看当前应用外壳设置入口",
        shortcut: "⌘,",
        icon: Settings2,
        onSelect: onOpenSettings,
      },
    ],
    [onCreateFile, onOpenSettings, onToggleTheme, theme],
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Refinex 命令面板"
      description="搜索文件或执行全局命令。"
    >
      <CommandInput placeholder="搜索文件、命令..." />
      <CommandList>
        <CommandEmpty>没有匹配结果。</CommandEmpty>
        <CommandGroup heading="文件">
          {files.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.title} ${item.description ?? ""} ${item.keywords.join(" ")}`}
              onSelect={() => {
                if (item.path) {
                  onOpenFile(item.path);
                }
                setOpen(false);
              }}
            >
              <FolderOpen className="h-4 w-4 text-accent" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate">{item.title}</span>
                <span className="truncate text-xs text-muted">{item.description}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="命令">
          {commands.map((command) => {
            const Icon = command.icon;

            return (
              <CommandItem
                key={command.id}
                value={`${command.title} ${command.description}`}
                onSelect={() => {
                  command.onSelect();
                  setOpen(false);
                }}
              >
                <Icon className="h-4 w-4 text-accent" />
                <div className="flex min-w-0 flex-col">
                  <span>{command.title}</span>
                  <span className="truncate text-xs text-muted">
                    {command.description}
                  </span>
                </div>
                <CommandShortcut>{command.shortcut}</CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="提示">
          <CommandItem disabled value="command:hint">
            <Command className="h-4 w-4 text-muted" />
            <span>编辑器内的 Cmd/Ctrl+K 仍保留给链接编辑</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;

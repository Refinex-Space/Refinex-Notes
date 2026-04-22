import type { ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { useSettingsStore } from "../../stores/settingsStore";

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-bg/80 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-xl space-y-1">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <p className="text-sm leading-6 text-muted">{description}</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

export function GeneralSettings() {
  const settings = useSettingsStore((state) => state.settings);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const setReopenLastWorkspaceOnStartup = useSettingsStore(
    (state) => state.setReopenLastWorkspaceOnStartup,
  );

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-fg">通用</h2>
        <p className="text-sm leading-6 text-muted">
          控制应用外观、语言和启动行为。
        </p>
      </header>

      <SettingRow
        title="主题"
        description="支持亮色、暗色和跟随系统，保存后会立即作用到应用壳层。"
      >
        <Select
          value={settings.themeMode}
          onValueChange={(value) =>
            setThemeMode(value as typeof settings.themeMode)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="选择主题" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">亮色</SelectItem>
            <SelectItem value="dark">暗色</SelectItem>
            <SelectItem value="system">跟随系统</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        title="语言"
        description="当前先覆盖设置页与应用文案的主语言偏好。"
      >
        <Select
          value={settings.language}
          onValueChange={(value) =>
            setLanguage(value as typeof settings.language)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="选择语言" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="zhCn">简体中文</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        title="启动时打开上次工作区"
        description="关闭后，应用启动时只显示空壳层，不自动恢复最近工作区。"
      >
        <div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-fg">
              {settings.reopenLastWorkspaceOnStartup ? "已开启" : "已关闭"}
            </p>
            <p className="text-xs text-muted">控制启动自动恢复行为</p>
          </div>
          <Switch
            checked={settings.reopenLastWorkspaceOnStartup}
            onCheckedChange={setReopenLastWorkspaceOnStartup}
          />
        </div>
      </SettingRow>
    </section>
  );
}

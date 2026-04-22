import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import { useSettingsStore } from "../../stores/settingsStore";

export function GitSettings() {
  const gitSync = useSettingsStore((state) => state.settings.gitSync);
  const updateGitSyncSettings = useSettingsStore(
    (state) => state.updateGitSyncSettings,
  );

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-fg">Git 同步</h2>
        <p className="text-sm leading-6 text-muted">
          控制自动同步、轮询节奏和自动提交模板。
        </p>
      </header>

      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-bg/80 p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-fg">自动同步</h3>
          <p className="text-sm leading-6 text-muted">
            后续 Git 面板会读取这里的默认偏好。
          </p>
        </div>
        <Switch
          checked={gitSync.autoSyncEnabled}
          onCheckedChange={(autoSyncEnabled) =>
            updateGitSyncSettings({ autoSyncEnabled })
          }
        />
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 bg-bg/80 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-fg">同步间隔</h3>
            <p className="text-sm leading-6 text-muted">
              自动同步启用后，按此间隔向原生同步器传入默认轮询周期。
            </p>
          </div>
          <span className="rounded-full bg-fg/[0.06] px-2.5 py-1 text-xs font-medium text-fg">
            {gitSync.syncIntervalSeconds}s
          </span>
        </div>
        <Slider
          min={30}
          max={300}
          step={5}
          value={[gitSync.syncIntervalSeconds]}
          onValueChange={([syncIntervalSeconds]) =>
            updateGitSyncSettings({
              syncIntervalSeconds:
                syncIntervalSeconds ?? gitSync.syncIntervalSeconds,
            })
          }
        />
      </div>

      <div className="space-y-2 rounded-xl border border-border/70 bg-bg/80 p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-fg">自动 commit message 模板</h3>
          <p className="text-sm leading-6 text-muted">
            后续自动同步和批量 AI 写入可复用这里的模板。
          </p>
        </div>
        <input
          value={gitSync.commitMessageTemplate}
          onChange={(event) =>
            updateGitSyncSettings({
              commitMessageTemplate: event.target.value,
            })
          }
          className="h-11 w-full rounded-xl border border-border/70 bg-bg/90 px-3 text-sm text-fg shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-accent/35"
          placeholder="例如：chore(notes): auto-sync"
        />
      </div>
    </section>
  );
}

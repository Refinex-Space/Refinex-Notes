const SHORTCUT_PRESETS = [
  { action: "打开设置", accelerator: "Cmd/Ctrl + ," },
  { action: "命令面板", accelerator: "Cmd/Ctrl + K" },
  { action: "切换源码模式", accelerator: "Cmd/Ctrl + /" },
  { action: "保存当前文档", accelerator: "Cmd/Ctrl + S" },
  { action: "Slash AI 技能", accelerator: "/ai-*" },
];

export function ShortcutSettings() {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-fg">快捷键</h2>
        <p className="text-sm leading-6 text-muted">
          本轮先提供统一入口和当前默认映射展示；真正的快捷键重绑定会在后续子任务继续实现。
        </p>
      </header>

      <div className="overflow-hidden rounded-3xl border border-border/70 bg-bg/80">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          <span>动作</span>
          <span>默认快捷键</span>
        </div>
        {SHORTCUT_PRESETS.map((entry) => (
          <div
            key={entry.action}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/50 px-4 py-3 text-sm last:border-b-0"
          >
            <span className="text-fg">{entry.action}</span>
            <kbd className="rounded-full border border-border/70 px-3 py-1 font-mono text-xs text-muted">
              {entry.accelerator}
            </kbd>
          </div>
        ))}
      </div>
    </section>
  );
}

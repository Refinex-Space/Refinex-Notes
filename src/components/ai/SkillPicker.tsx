import { Sparkles } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import type { SkillDefinition } from "../../types/skill";

function formatOutputMode(outputMode: SkillDefinition["outputMode"]) {
  switch (outputMode) {
    case "replace-selection":
      return "替换选区";
    case "insert-at-cursor":
      return "插入光标处";
    case "new-document":
      return "写入新文档";
    case "chat-response":
      return "发送到聊天面板";
  }
}

export function SkillPicker({
  skills,
  disabled = false,
  onSelect,
  label = "AI",
}: {
  skills: readonly SkillDefinition[];
  disabled?: boolean;
  onSelect: (skill: SkillDefinition) => void;
  label?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled || skills.length === 0}
          className={[
            "inline-flex items-center gap-2 rounded-xl border border-border/70 bg-[rgb(var(--color-bg)/0.92)] px-3 py-2 text-sm text-fg shadow-sm transition",
            "hover:border-accent/45 hover:bg-accent/8",
            "disabled:cursor-not-allowed disabled:opacity-50",
          ].join(" ")}
        >
          <Sparkles className="h-4 w-4 text-accent" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-[22rem] rounded-2xl p-1.5"
      >
        <div className="mb-1 px-2 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
            AI Skills
          </p>
        </div>
        <div className="space-y-1">
          {skills.map((skill) => (
            <button
              key={skill.id}
              type="button"
              onClick={() => onSelect(skill)}
              className={[
                "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition",
                "hover:bg-fg/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
              ].join(" ")}
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-accent/10 text-accent">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-fg">
                    {skill.name}
                  </span>
                  <span className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-muted">
                    {formatOutputMode(skill.outputMode)}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {skill.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import { useSettingsStore } from "../../stores/settingsStore";

const FONT_OPTIONS = [
  { value: "IBM Plex Sans", label: "IBM Plex Sans" },
  { value: "Source Han Sans SC", label: "Source Han Sans SC" },
  { value: "JetBrains Mono", label: "JetBrains Mono" },
  { value: "SF Pro Text", label: "SF Pro Text" },
];

function SliderRow({
  title,
  description,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  title: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-bg/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-fg">{title}</h3>
          <p className="text-sm leading-6 text-muted">{description}</p>
        </div>
        <span className="rounded-full bg-fg/[0.06] px-2.5 py-1 text-xs font-medium text-fg">
          {value}
          {unit}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => onChange(next ?? value)}
      />
    </div>
  );
}

export function EditorSettings() {
  const editor = useSettingsStore((state) => state.settings.editor);
  const updateEditorSettings = useSettingsStore(
    (state) => state.updateEditorSettings,
  );

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-fg">编辑器</h2>
        <p className="text-sm leading-6 text-muted">
          管理字号、字族、行高和自动保存节奏。
        </p>
      </header>

      <div className="space-y-4 rounded-2xl border border-border/70 bg-bg/80 p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-fg">字体族</h3>
          <p className="text-sm leading-6 text-muted">
            预览文本会按当前选择的字族即时渲染。
          </p>
        </div>
        <Select
          value={editor.fontFamily}
          onValueChange={(fontFamily) => updateEditorSettings({ fontFamily })}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择字体族" />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div
          className="rounded-2xl border border-dashed border-border/70 bg-fg/[0.03] px-4 py-3 text-sm text-fg"
          style={{ fontFamily: editor.fontFamily }}
        >
          Markdown headings, inline code, lists and prose preview.
        </div>
      </div>

      <SliderRow
        title="字号"
        description="影响主编辑区的正文字号。"
        value={editor.fontSizePx}
        min={14}
        max={24}
        step={1}
        unit="px"
        onChange={(fontSizePx) => updateEditorSettings({ fontSizePx })}
      />

      <SliderRow
        title="行高"
        description="更高的行高适合长文写作，更低的行高适合密集浏览。"
        value={Number(editor.lineHeight.toFixed(2))}
        min={1.2}
        max={2.4}
        step={0.05}
        unit=""
        onChange={(lineHeight) => updateEditorSettings({ lineHeight })}
      />

      <SliderRow
        title="自动保存间隔"
        description="写作中的后台保存节奏，单位为秒。"
        value={editor.autoSaveIntervalSeconds}
        min={1}
        max={60}
        step={1}
        unit="s"
        onChange={(autoSaveIntervalSeconds) =>
          updateEditorSettings({ autoSaveIntervalSeconds })
        }
      />

      <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-bg/80 p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-fg">显示行号</h3>
          <p className="text-sm leading-6 text-muted">
            为源码模式和代码块编辑场景保留行号偏好。
          </p>
        </div>
        <Switch
          checked={editor.showLineNumbers}
          onCheckedChange={(showLineNumbers) =>
            updateEditorSettings({ showLineNumbers })
          }
        />
      </div>
    </section>
  );
}

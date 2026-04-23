import {
  Bold,
  Code2,
  Ellipsis,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Palette,
  Pilcrow,
  Quote,
  Sigma,
  Strikethrough,
  Table2,
  TerminalSquare,
  Underline,
} from "lucide-react";
import { setBlockType, toggleMark } from "prosemirror-commands";
import { TextSelection } from "prosemirror-state";
import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type {
  ButtonHTMLAttributes,
  MouseEvent,
  PointerEvent,
  ReactNode,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { SkillPicker } from "../../components/ai/SkillPicker";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../components/ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import {
  filterSkillsForSelection,
  listBuiltinSkills,
} from "../../services/skillService";
import type { SkillDefinition } from "../../types/skill";
import {
  executeSlashCommand,
  getSelectionAnchorRect,
  isMarkActive,
  SLASH_COMMANDS,
  type SlashCommandId,
} from "../rich-ui";
import { refinexSchema } from "../schema";

const TOOLBAR_BUTTON_BASE =
  "inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-transparent text-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30";
const TOOLBAR_BUTTON_INTERACTIVE =
  "hover:border-border/80 hover:bg-fg/[0.06] hover:text-fg";
const TOOLBAR_BUTTON_ACTIVE = "border-accent/35 bg-accent/12 text-fg";
const TOOLBAR_SEPARATOR = "h-5 w-px rounded-full bg-border/70";

const MORE_MENU_ICONS: Record<SlashCommandId, typeof Heading1> = {
  "heading-1": Heading1,
  "heading-2": Heading2,
  "heading-3": Heading3,
  "bullet-list": List,
  "ordered-list": ListOrdered,
  "task-list": ListChecks,
  blockquote: Quote,
  "code-block": TerminalSquare,
  divider: Minus,
  image: ImageIcon,
  table: Table2,
};

const COLOR_SWATCHES = [
  { id: "default", label: "默认", dotClassName: "bg-fg/80" },
  { id: "gray", label: "灰色", dotClassName: "bg-slate-400" },
  { id: "orange", label: "橙色", dotClassName: "bg-orange-400" },
  { id: "yellow", label: "黄色", dotClassName: "bg-amber-300" },
  { id: "green", label: "绿色", dotClassName: "bg-emerald-400" },
  { id: "blue", label: "蓝色", dotClassName: "bg-sky-400" },
] as const;

function preventSelectionLoss(event: MouseEvent | PointerEvent) {
  event.preventDefault();
}

function getToolbarButtonClassName(active = false) {
  return [
    TOOLBAR_BUTTON_BASE,
    TOOLBAR_BUTTON_INTERACTIVE,
    active ? TOOLBAR_BUTTON_ACTIVE : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getCurrentBlockType(state: EditorState) {
  return state.selection.$from.parent.type.name;
}

function ToolbarButton({
  label,
  children,
  active = false,
  disabled = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
}) {
  const button = (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={[
        getToolbarButtonClassName(active),
        disabled ? "cursor-not-allowed opacity-45" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseDown={preventSelectionLoss}
      {...props}
    >
      {children}
    </button>
  );

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{button}</span>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function ToolbarInfoAction({
  label,
  icon,
  title,
  description,
}: {
  label: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={label}
              className={getToolbarButtonClassName(false)}
              onMouseDown={preventSelectionLoss}
            >
              {icon}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={10}
        className="w-[16rem] rounded-2xl p-3"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-fg">{title}</p>
          <p className="text-xs leading-5 text-muted">{description}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ToolbarColorAction() {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="文本颜色"
              className={getToolbarButtonClassName(false)}
              onMouseDown={preventSelectionLoss}
            >
              <Palette className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">文本颜色</TooltipContent>
      </Tooltip>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={10}
        className="w-[17rem] rounded-2xl p-3"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-fg">文本颜色</p>
            <p className="text-xs leading-5 text-muted">
              这次先把 Notion 的入口、布局和密度补齐，颜色持久化会在后续接入 Markdown 往返链路。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                disabled
                className="flex items-center gap-2 rounded-xl border border-border/70 px-2.5 py-2 text-left text-xs text-muted opacity-70"
              >
                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    swatch.dotClassName,
                  ].join(" ")}
                />
                {swatch.label}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ToolbarMoreMenu({ view }: { view: EditorView }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [open]);

  const items = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return SLASH_COMMANDS.filter((item) => {
      if (!normalized) {
        return true;
      }

      const haystack = [item.id, item.title, item.description, ...item.keywords]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="更多"
              className={getToolbarButtonClassName(false)}
              onMouseDown={preventSelectionLoss}
            >
              <Ellipsis className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">更多</TooltipContent>
      </Tooltip>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={10}
        className="w-[28rem] max-w-[calc(100vw-2rem)] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <Command loop className="w-full" shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            value={search}
            onValueChange={setSearch}
            autoFocus
            placeholder="搜索格式..."
            endAdornment={
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted">
                /
              </span>
            }
          />
          <CommandList>
            <CommandEmpty>没有匹配的格式。</CommandEmpty>
            {items.map((item) => {
              const Icon = MORE_MENU_ICONS[item.id];
              return (
                <CommandItem
                  key={item.id}
                  value={item.title}
                  keywords={item.keywords}
                  onSelect={() => {
                    void executeSlashCommand({
                      view,
                      commandId: item.id,
                    }).finally(() => {
                      setOpen(false);
                      view.focus();
                    });
                  }}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-accent/8 text-fg transition-colors group-hover:border-accent/30 group-hover:bg-accent/14 group-data-[selected=true]:border-accent/40 group-data-[selected=true]:bg-accent/20">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="font-medium text-fg">{item.title}</span>
                    <span className="text-xs text-muted">{item.description}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export interface FloatingToolbarProps {
  view: EditorView | null;
  version: number;
  onRequestLinkEdit: (view: EditorView) => boolean;
  onRunSkill: (skill: SkillDefinition) => void | Promise<void>;
}

export function FloatingToolbar({
  view,
  version: _version,
  onRequestLinkEdit,
  onRunSkill,
}: FloatingToolbarProps) {
  if (
    !view ||
    !(view.state.selection instanceof TextSelection) ||
    view.state.selection.empty
  ) {
    return null;
  }

  const anchor = getSelectionAnchorRect(
    view,
    view.state.selection.from,
    view.state.selection.to,
  );

  const runMarkCommand = (markName: "strong" | "em" | "strikethrough" | "code") => {
    toggleMark(refinexSchema.marks[markName])(view.state, view.dispatch, view);
    view.focus();
  };

  const runParagraphCommand = () => {
    setBlockType(refinexSchema.nodes.paragraph)(view.state, view.dispatch, view);
    view.focus();
  };

  const currentBlockType = getCurrentBlockType(view.state);
  const skills = filterSkillsForSelection(listBuiltinSkills(), true);

  return (
    <Popover open>
      <PopoverAnchor asChild>
        <span
          aria-hidden="true"
          style={{
            position: "fixed",
            top: anchor.top,
            left: anchor.left,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={10}
        className="w-auto rounded-[20px] border-border/80 bg-[rgb(var(--color-bg)/0.96)] p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:bg-slate-950/96"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <ToolbarButton
              label="转换成文本"
              active={currentBlockType === "paragraph"}
              onClick={runParagraphCommand}
            >
              <Pilcrow className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarColorAction />
            <span aria-hidden="true" className={TOOLBAR_SEPARATOR} />
            <ToolbarButton
              label="加粗"
              active={isMarkActive(view.state, "strong")}
              onClick={() => runMarkCommand("strong")}
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="斜体"
              active={isMarkActive(view.state, "em")}
              onClick={() => runMarkCommand("em")}
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarInfoAction
              label="下划线"
              icon={<Underline className="h-4 w-4" />}
              title="下划线"
              description="为避免保存后丢失样式，这次没有把下划线伪装成已支持能力；先把 Notion 式入口和布局补齐，后续再补 Markdown 语义。"
            />
            <span aria-hidden="true" className={TOOLBAR_SEPARATOR} />
            <ToolbarButton
              label="添加链接"
              active={isMarkActive(view.state, "link")}
              onClick={() => {
                onRequestLinkEdit(view);
              }}
            >
              <Link2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="删除线"
              active={isMarkActive(view.state, "strikethrough")}
              onClick={() => runMarkCommand("strikethrough")}
            >
              <Strikethrough className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="标记为代码"
              active={isMarkActive(view.state, "code")}
              onClick={() => runMarkCommand("code")}
            >
              <Code2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarInfoAction
              label="标记为公式"
              icon={<Sigma className="h-4 w-4" />}
              title="标记为公式"
              description="数学公式在设计文档里仍属于下一阶段能力。本次先复刻 Notion 的操作层级与入口，不在没有渲染/序列化支持时硬塞半成品。"
            />
            <span aria-hidden="true" className={TOOLBAR_SEPARATOR} />
            <ToolbarMoreMenu view={view} />
            <span aria-hidden="true" className={TOOLBAR_SEPARATOR} />
            <SkillPicker
              skills={skills}
              label="技能"
              menuLabel="技能"
              triggerClassName="h-8 rounded-[10px] border-transparent bg-transparent px-2.5 py-0 text-[13px] font-medium shadow-none hover:border-border/80 hover:bg-fg/[0.06]"
              contentClassName="rounded-2xl"
              onSelect={(skill) => {
                void onRunSkill(skill);
              }}
            />
          </div>
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  );
}

export default FloatingToolbar;

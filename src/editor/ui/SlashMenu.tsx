import { useEffect, useMemo, useRef, useState } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Sparkles,
  Table2,
  TerminalSquare,
} from "lucide-react";
import type { EditorView } from "prosemirror-view";

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
} from "../../components/ui/popover";
import {
  SLASH_COMMANDS,
  executeSlashCommand,
  type PopoverAnchorRect,
  type SlashCommandId,
  type SlashTriggerMatch,
  removeSlashTrigger,
} from "../rich-ui";
import { executeBuiltinSkill, listBuiltinSkills } from "../../services/skillService";

export type SlashMenuRequest = SlashTriggerMatch & {
  anchor: PopoverAnchorRect;
};

export interface SlashMenuProps {
  view: EditorView | null;
  request: SlashMenuRequest | null;
  onClose: () => void;
}

const ICONS: Record<SlashCommandId, typeof Heading1> = {
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

export function SlashMenu({ view, request, onClose }: SlashMenuProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSearch(request?.query ?? "");
  }, [request]);

  useEffect(() => {
    if (!request) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [request]);

  const items = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const slashItems = SLASH_COMMANDS.filter((item) => {
      const haystack = [item.id, item.title, item.description, ...item.keywords]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    }).map((item) => ({
      kind: "slash" as const,
      id: item.id,
      title: item.title,
      description: item.description,
      keywords: item.keywords,
    }));
    const skillItems = listBuiltinSkills()
      .filter((skill) => {
        const haystack = [
          skill.id,
          skill.name,
          skill.description,
          skill.category,
          skill.slashCommand,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalized);
      })
      .map((skill) => ({
        kind: "skill" as const,
        id: skill.id,
        title: `/${skill.slashCommand}`,
        description: skill.description,
        keywords: [skill.category, skill.outputMode],
        skill,
      }));

    return normalized.length === 0 ? [...slashItems, ...skillItems] : [...skillItems, ...slashItems];
  }, [search]);

  if (!view || !request) {
    return null;
  }

  return (
    <Popover open>
      <PopoverAnchor asChild>
        <span
          aria-hidden="true"
          style={{
            position: "fixed",
            top: request.anchor.bottom,
            left: request.anchor.left,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={12}
        className="w-[28rem] max-w-[calc(100vw-2rem)] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={() => {
          onClose();
          view.focus();
        }}
        onInteractOutside={() => {
          onClose();
          view.focus();
        }}
      >
        <Command loop className="w-full" shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            value={search}
            onValueChange={setSearch}
            autoFocus
            placeholder="搜索命令..."
          />
          <CommandList>
            <CommandEmpty>没有匹配的命令。</CommandEmpty>
            {items.map((item) => {
              const Icon = item.kind === "slash" ? ICONS[item.id] : Sparkles;
              return (
                <CommandItem
                  key={item.id}
                  value={item.title}
                  keywords={item.keywords}
                  onSelect={() => {
                    if (item.kind === "skill") {
                      removeSlashTrigger(view, request);
                      void executeBuiltinSkill({
                        view,
                        skill: item.skill,
                      }).finally(() => {
                        onClose();
                        view.focus();
                      });
                      return;
                    }

                    void executeSlashCommand({
                      view,
                      trigger: request,
                      commandId: item.id,
                    }).finally(() => {
                      onClose();
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

export default SlashMenu;

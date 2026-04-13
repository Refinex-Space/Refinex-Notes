import { useEffect, useMemo, useState } from "react";
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
} from "../rich-ui";

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

  useEffect(() => {
    setSearch("");
  }, [request]);

  const items = useMemo(
    () =>
      SLASH_COMMANDS.filter((item) => {
        const haystack = [item.title, item.description, ...item.keywords].join(" ").toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    [search],
  );

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
            value={search}
            onValueChange={setSearch}
            autoFocus
            placeholder="搜索命令..."
          />
          <CommandList>
            <CommandEmpty>没有匹配的命令。</CommandEmpty>
            {items.map((item) => {
              const Icon = ICONS[item.id];
              return (
                <CommandItem
                  key={item.id}
                  value={item.title}
                  keywords={item.keywords}
                  onSelect={() => {
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
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-accent/8 text-fg">
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

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./dialog";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={[
      "flex h-full w-full flex-col overflow-hidden rounded-[inherit] bg-transparent text-fg",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
));

Command.displayName = CommandPrimitive.displayName;

function CommandDialog({
  children,
  title = "命令面板",
  description = "使用键盘快速触发操作。",
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string;
  description?: string;
}) {
  return (
    <Dialog {...props}>
      <DialogContent
        className="overflow-hidden p-0"
        style={{ maxWidth: "800px", width: "calc(100vw - 2rem)" }}
        hideClose
      >
        <div className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </div>
        <Command className="[&_svg]:shrink-0">{children}</Command>
      </DialogContent>
    </Dialog>
  );
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & {
    endAdornment?: React.ReactNode;
  }
>(({ className, endAdornment, ...props }, ref) => (
  <div className="flex items-center gap-2.5 border-b border-border/70 px-3.5 py-2">
    <Search className="h-4 w-4 text-muted" />
    <CommandPrimitive.Input
      ref={ref}
      className={[
        "flex h-9 w-full bg-transparent text-[13px] outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50 pr-8",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
    {endAdornment}
  </div>
));

CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={[
      "max-h-[400px] overflow-y-auto overflow-x-hidden p-1.5",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
));

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className={["px-4 py-8 text-center text-sm text-muted", className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
));

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={[
      "overflow-hidden px-1.5 py-1 text-fg [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10.5px]",
      "[&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.24em]",
      "[&_[cmdk-group-heading]]:text-muted",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
));

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={["-mx-2 h-px bg-border/70", className].filter(Boolean).join(" ")}
    {...props}
  />
));

CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

export const commandItemClassName = [
  "group relative flex cursor-default select-none items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-[13px] outline-none transition-colors",
  "hover:border-accent/20 hover:bg-accent/10 hover:text-fg",
  "data-[selected=true]:border-accent/35 data-[selected=true]:bg-accent/16 data-[selected=true]:text-fg",
  "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
].join(" ");

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={[commandItemClassName, className].filter(Boolean).join(" ")}
    {...props}
  />
));

CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={[
      "ml-auto text-xs uppercase tracking-[0.2em] text-muted",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
);

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};

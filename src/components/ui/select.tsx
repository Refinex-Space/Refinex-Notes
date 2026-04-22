import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={[
      "inline-flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border/70",
      "bg-[rgb(var(--color-bg)/0.9)] px-3 text-sm text-fg shadow-sm transition",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "[&>span]:truncate",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));

SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={[
      "flex cursor-default items-center justify-center py-1 text-muted",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));

SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={[
      "flex cursor-default items-center justify-center py-1 text-muted",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));

SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={[
        "relative z-50 max-h-80 min-w-[12rem] overflow-hidden rounded-xl border border-border/70",
        "bg-[rgb(var(--color-bg)/0.98)] text-fg shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        position === "popper"
          ? "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={[
          "p-1",
          position === "popper"
            ? "h-[var(--radix-select-trigger-height)] min-w-[var(--radix-select-trigger-width)]"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));

SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={["px-2 py-1.5 text-xs font-medium text-muted", className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
));

SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={[
      "relative flex w-full cursor-default select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm outline-none",
      "transition data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      "data-[highlighted]:bg-fg/[0.06] data-[highlighted]:text-fg",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-accent" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));

SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={["my-1 h-px bg-border/70", className].filter(Boolean).join(" ")}
    {...props}
  />
));

SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};

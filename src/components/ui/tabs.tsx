import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={[
      "inline-flex h-11 items-center gap-2 rounded-2xl border border-border/70 bg-bg/70 p-1 text-muted",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
));

TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={[
      "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium outline-none transition",
      "data-[state=active]:bg-accent/12 data-[state=active]:text-fg data-[state=active]:shadow-sm",
      "focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
));

TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={[
      "mt-0 flex-1 outline-none focus-visible:ring-0",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
));

TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };

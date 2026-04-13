import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";

const ToastProvider = ToastPrimitive.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={[
      "fixed right-4 top-4 z-[100] flex max-h-screen w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-3 outline-none",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
));

ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={[
      "group pointer-events-auto relative grid w-full grid-cols-[1fr_auto] items-start gap-x-4 gap-y-2 overflow-hidden",
      "rounded-3xl border border-border/70 bg-bg/95 p-4 text-fg shadow-panel backdrop-blur",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-4",
      "data-[state=closed]:slide-out-to-right-full data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
      "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0",
      "data-[swipe=cancel]:transition-transform data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full",
      "dark:border-border/80 dark:bg-slate-950/95",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
));

Toast.displayName = ToastPrimitive.Root.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={["text-sm font-semibold text-fg", className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
));

ToastTitle.displayName = ToastPrimitive.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={["text-sm leading-6 text-muted", className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
));

ToastDescription.displayName = ToastPrimitive.Description.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={[
      "inline-flex h-9 items-center justify-center rounded-full border border-border/60 px-4 text-sm font-medium",
      "transition hover:border-accent/50 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
));

ToastAction.displayName = ToastPrimitive.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={[
      "inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-muted transition",
      "hover:border-border/60 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
));

ToastClose.displayName = ToastPrimitive.Close.displayName;

export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
};

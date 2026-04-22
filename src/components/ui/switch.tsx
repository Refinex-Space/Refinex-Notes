import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={[
      "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border/70",
      "bg-fg/[0.08] shadow-inner outline-none transition-colors",
      "data-[state=checked]:border-accent/40 data-[state=checked]:bg-accent/80",
      "focus-visible:ring-2 focus-visible:ring-accent/40",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={[
        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-[0_3px_12px_rgba(15,23,42,0.18)]",
        "transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
      ].join(" ")}
    />
  </SwitchPrimitive.Root>
));

Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };

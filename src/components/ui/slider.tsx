import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={[
      "relative flex w-full touch-none select-none items-center",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-fg/[0.08]">
      <SliderPrimitive.Range className="absolute h-full rounded-full bg-accent/85" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={[
        "block h-4 w-4 rounded-full border border-accent/30 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.18)] transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        "disabled:pointer-events-none disabled:opacity-50",
      ].join(" ")}
    />
  </SliderPrimitive.Root>
));

Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };

import { useMemo } from "react";

import type { OutlineHeading } from "../../types";
import { extractOutlineHeadings } from "../sidebar/sidebar-utils";

const MAX_RAIL_ITEMS = 24;

export interface DocumentOutlineDockProps {
  markdown?: string;
  onSelectHeading?: (heading: OutlineHeading) => void;
}

export function buildOutlineRailItems(headings: OutlineHeading[]) {
  if (headings.length <= MAX_RAIL_ITEMS) {
    return headings;
  }

  const step = Math.ceil(headings.length / MAX_RAIL_ITEMS);
  return headings
    .filter((_, index) => index % step === 0)
    .slice(0, MAX_RAIL_ITEMS);
}

function railWidthClass(level: number) {
  switch (level) {
    case 1:
      return "w-7";
    case 2:
      return "w-[1.375rem]";
    case 3:
      return "w-[1.125rem]";
    default:
      return "w-[0.875rem]";
  }
}

export function DocumentOutlineDock({
  markdown,
  onSelectHeading,
}: DocumentOutlineDockProps) {
  const headings = useMemo(
    () => extractOutlineHeadings(markdown ?? ""),
    [markdown],
  );
  const railItems = useMemo(() => buildOutlineRailItems(headings), [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-y-0 right-3 z-20 hidden items-center lg:flex">
      <div className="group/dock pointer-events-auto relative flex items-center justify-end">
        <button
          type="button"
          aria-label="阅读指引"
          className={[
            "flex min-h-[18rem] w-8 flex-col items-end justify-center gap-2 rounded-full px-1.5 py-4",
            "text-border/90 transition",
            "hover:text-muted focus-visible:bg-white/80 focus-visible:text-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
            "dark:text-white/18  dark:hover:text-white/45",
          ].join(" ")}
        >
          {railItems.map((heading) => (
            <span
              key={heading.id}
              className={[
                "block h-[3px] rounded-full bg-current transition-opacity",
                railWidthClass(heading.level),
              ].join(" ")}
            />
          ))}
        </button>

        <div
          className={[
            "pointer-events-none absolute right-10 top-1/2 w-[18rem] -translate-y-1/2 translate-x-3 opacity-0 transition duration-150 ease-out",
            "group-hover/dock:pointer-events-auto group-hover/dock:translate-x-0 group-hover/dock:opacity-100",
            "group-focus-within/dock:pointer-events-auto group-focus-within/dock:translate-x-0 group-focus-within/dock:opacity-100",
          ].join(" ")}
        >
          <section className="rounded-[1rem] border border-border/70 bg-bg/95 p-4 text-fg shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur">
            <header className="border-b border-border/60 pb-3">
              <p className="text-sm font-semibold tracking-tight text-fg">
                目录
              </p>
            </header>

            <div className="mt-3 max-h-[60vh] overflow-auto pr-2">
              <div className="space-y-1">
                {headings.map((heading) => (
                  <button
                    key={heading.id}
                    type="button"
                    className={[
                      "flex w-full items-start rounded-2xl px-3 py-2 text-left transition",
                      "hover:bg-accent/8 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
                    ].join(" ")}
                    style={{
                      paddingLeft: `${0.8 + (heading.level - 1) * 0.9}rem`,
                    }}
                    onClick={() => onSelectHeading?.(heading)}
                  >
                    <span className="text-sm leading-6 text-muted">
                      {heading.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default DocumentOutlineDock;

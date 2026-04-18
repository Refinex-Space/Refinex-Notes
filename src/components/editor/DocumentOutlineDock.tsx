import type { MutableRefObject } from "react";
import { useEffect, useMemo, useState } from "react";
import type { EditorView } from "prosemirror-view";

import type { OutlineHeading } from "../../types";
import { extractOutlineHeadings } from "../sidebar/sidebar-utils";

export interface DocumentOutlineDockProps {
  markdown?: string;
  onSelectHeading?: (heading: OutlineHeading) => void;
  editorViewRef?: MutableRefObject<EditorView | null>;
  scrollContainerRef?: MutableRefObject<HTMLDivElement | null>;
}

/**
 * Resolves which heading index is currently "active" by finding the last
 * heading whose DOM node is at or above the midpoint of the scroll container.
 */
function resolveActiveIndex(
  editorView: EditorView | null,
  scrollContainer: HTMLDivElement | null,
): number {
  if (!editorView || !scrollContainer) {
    return 0;
  }

  const scrollTop = scrollContainer.scrollTop;
  const midpoint = scrollTop + scrollContainer.clientHeight * 0.28;
  const headingNodes = Array.from(
    editorView.dom.querySelectorAll("h1, h2, h3, h4, h5, h6"),
  );

  let activeIdx = 0;
  for (let i = 0; i < headingNodes.length; i++) {
    const node = headingNodes[i] as HTMLElement;
    const offsetTop = node.offsetTop;
    if (offsetTop <= midpoint) {
      activeIdx = i;
    } else {
      break;
    }
  }
  return activeIdx;
}

export function DocumentOutlineDock({
  markdown,
  onSelectHeading,
  editorViewRef,
  scrollContainerRef,
}: DocumentOutlineDockProps) {
  const allHeadings = useMemo(
    () => extractOutlineHeadings(markdown ?? ""),
    [markdown],
  );
  // Only display H2 and below — H1 is the document title and is not shown
  const displayHeadings = useMemo(
    () => allHeadings.filter((h) => h.level >= 2),
    [allHeadings],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const scrollContainer = scrollContainerRef?.current ?? null;
    const view = editorViewRef?.current ?? null;
    if (!scrollContainer || !view) {
      return;
    }

    let frame = 0;
    const updateActive = () => {
      frame = 0;
      setActiveIndex(resolveActiveIndex(view, scrollContainer));
    };

    const scheduleUpdate = () => {
      if (frame !== 0) {
        return;
      }
      frame = window.requestAnimationFrame(updateActive);
    };

    scheduleUpdate();
    scrollContainer.addEventListener("scroll", scheduleUpdate, {
      passive: true,
    });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      scrollContainer.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [editorViewRef, scrollContainerRef]);

  if (displayHeadings.length === 0) {
    return null;
  }

  // The active heading id comes from allHeadings (which maps 1:1 to DOM nodes)
  const activeHeadingId = allHeadings[activeIndex]?.id;

  return (
    <div className="py-3">
      {/* "大纲" label — prototype style */}
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted/60">
        大纲
      </p>

      {displayHeadings.map((heading) => {
        const isActive = heading.id === activeHeadingId;
        return (
          <button
            key={heading.id}
            type="button"
            onClick={() => onSelectHeading?.(heading)}
            className={[
              "flex w-full cursor-pointer items-start border-l-2 py-[3px] text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
              isActive
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-fg",
            ].join(" ")}
            style={{
              paddingLeft: `${0.75 + (heading.level - 2) * 0.875}rem`,
              fontSize: "12.5px",
              fontWeight: isActive ? 500 : 400,
            }}
          >
            <span className="line-clamp-2 leading-[1.6]">{heading.text}</span>
          </button>
        );
      })}
    </div>
  );
}

export default DocumentOutlineDock;

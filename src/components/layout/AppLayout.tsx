import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
} from "../ui/collapsible";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 360;
const MIN_RIGHT_PANEL_WIDTH = 260;
const MAX_RIGHT_PANEL_WIDTH = 420;

export interface AppLayoutProps {
  title?: string;
  sidebar: ReactNode;
  tabBar: ReactNode;
  editor: ReactNode;
  rightPanel: ReactNode;
  statusBar: ReactNode;
  defaultSidebarWidth?: number;
  defaultRightPanelWidth?: number;
  sidebarTitle?: string;
  rightPanelTitle?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function AppLayout({
  title = "Refinex Notes",
  sidebar,
  tabBar,
  editor,
  rightPanel,
  statusBar,
  defaultSidebarWidth = 240,
  defaultRightPanelWidth = 320,
  sidebarTitle = "Workspace",
  rightPanelTitle = "Assistant",
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(
    clamp(defaultSidebarWidth, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH),
  );
  const [rightPanelWidth, setRightPanelWidth] = useState(
    clamp(defaultRightPanelWidth, MIN_RIGHT_PANEL_WIDTH, MAX_RIGHT_PANEL_WIDTH),
  );
  const [activeDrag, setActiveDrag] = useState<"sidebar" | "right-panel" | null>(
    null,
  );

  useEffect(() => {
    if (!activeDrag) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      const viewportWidth = window.innerWidth;

      if (activeDrag === "sidebar") {
        setSidebarWidth(
          clamp(event.clientX, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH),
        );
        return;
      }

      setRightPanelWidth(
        clamp(
          viewportWidth - event.clientX,
          MIN_RIGHT_PANEL_WIDTH,
          MAX_RIGHT_PANEL_WIDTH,
        ),
      );
    };

    const stopDragging = () => {
      setActiveDrag(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [activeDrag]);

  const gridTemplateColumns = useMemo(() => {
    const sidebarTrack = sidebarCollapsed ? "0px" : `${sidebarWidth}px`;
    const sidebarHandleTrack = sidebarCollapsed ? "0px" : "10px";
    const rightHandleTrack = rightPanelCollapsed ? "0px" : "10px";
    const rightTrack = rightPanelCollapsed ? "0px" : `${rightPanelWidth}px`;

    return `${sidebarTrack} ${sidebarHandleTrack} minmax(0, 1fr) ${rightHandleTrack} ${rightTrack}`;
  }, [rightPanelCollapsed, rightPanelWidth, sidebarCollapsed, sidebarWidth]);

  return (
    <div className="flex h-screen min-h-screen overflow-hidden flex-col bg-bg text-fg">
      <header className="flex h-12 items-center justify-between border-b border-border/70 bg-bg/90 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-bg/70 text-muted transition hover:border-accent/50 hover:text-fg"
            onClick={() => setSidebarCollapsed((current) => !current)}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
          <div data-tauri-drag-region className="space-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
              Phase 4.1
            </p>
            <h1 className="text-sm font-semibold text-fg">{title}</h1>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-bg/70 text-muted transition hover:border-accent/50 hover:text-fg"
          onClick={() => setRightPanelCollapsed((current) => !current)}
        >
          {rightPanelCollapsed ? (
            <PanelRightOpen className="h-4 w-4" />
          ) : (
            <PanelRightClose className="h-4 w-4" />
          )}
        </button>
      </header>

      <div
        className="grid min-h-0 flex-1 overflow-hidden"
        style={{ gridTemplateColumns }}
      >
        <Collapsible open={!sidebarCollapsed}>
          <CollapsibleContent
            forceMount
            className={[
              "min-h-0 overflow-hidden border-r border-border/70 bg-bg/60",
              sidebarCollapsed ? "pointer-events-none opacity-0" : "opacity-100",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <aside className="flex h-full min-h-0 flex-col">
              <div className="border-b border-border/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  {sidebarTitle}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">{sidebar}</div>
            </aside>
          </CollapsibleContent>
        </Collapsible>

        <div
          className={sidebarCollapsed ? "hidden" : "cursor-col-resize bg-border/40"}
          onPointerDown={() => setActiveDrag("sidebar")}
        />

        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] bg-bg">
          <div className="border-b border-border/70 bg-bg/80 px-3 py-2">
            {tabBar}
          </div>
          <div className="min-h-0 overflow-hidden">{editor}</div>
        </section>

        <div
          className={rightPanelCollapsed ? "hidden" : "cursor-col-resize bg-border/40"}
          onPointerDown={() => setActiveDrag("right-panel")}
        />

        <Collapsible open={!rightPanelCollapsed}>
          <CollapsibleContent
            forceMount
            className={[
              "min-h-0 overflow-hidden border-l border-border/70 bg-bg/60",
              rightPanelCollapsed ? "pointer-events-none opacity-0" : "opacity-100",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <aside className="flex h-full min-h-0 flex-col">
              <div className="border-b border-border/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  {rightPanelTitle}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">{rightPanel}</div>
            </aside>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {statusBar}
    </div>
  );
}

export default AppLayout;

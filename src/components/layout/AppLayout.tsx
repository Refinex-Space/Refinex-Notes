import {
  GitBranchPlus,
  PanelLeftClose,
  PanelLeftOpen,
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

export function isMacLikePlatform(platform = "", userAgent = "") {
  const platformLabel = platform.toLowerCase();
  const userAgentLabel = userAgent.toLowerCase();

  return (
    platformLabel.includes("mac") ||
    userAgentLabel.includes("mac os") ||
    userAgentLabel.includes("darwin")
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function AppLayout({
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
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
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
    const rightTrack = rightPanelCollapsed ? "0px" : `${rightPanelWidth}px`;

    return `${sidebarTrack} minmax(0, 1fr) ${rightTrack}`;
  }, [rightPanelCollapsed, rightPanelWidth, sidebarCollapsed, sidebarWidth]);

  const needsMacInset = useMemo(() => {
    if (typeof navigator === "undefined") {
      return false;
    }

    return isMacLikePlatform(navigator.platform, navigator.userAgent);
  }, []);

  const titlebarIconButtonClassName = [
    "inline-flex h-5 w-5 items-center justify-center p-0 text-muted transition",
    "hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
  ].join(" ");

  return (
    <div className="flex h-screen min-h-screen overflow-hidden flex-col bg-bg text-fg">
      <header className="border-b border-border/70 bg-bg/90 backdrop-blur">
        {needsMacInset ? (
          <div data-tauri-drag-region className="relative h-10 px-4">
            <button
              type="button"
              aria-label={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
              className={[titlebarIconButtonClassName, "absolute left-[6.9rem] top-[0.72rem]"].join(" ")}
              onClick={() => setSidebarCollapsed((current) => !current)}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              aria-label={rightPanelCollapsed ? "展开右侧面板" : "折叠右侧面板"}
              className={[titlebarIconButtonClassName, "absolute right-4 top-[0.72rem]"].join(" ")}
              onClick={() => setRightPanelCollapsed((current) => !current)}
            >
              <GitBranchPlus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div
            data-tauri-drag-region
            className="grid h-12 grid-cols-[auto_1fr_auto] items-center px-4"
          >
            <button
              type="button"
              aria-label={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
              className={titlebarIconButtonClassName}
              onClick={() => setSidebarCollapsed((current) => !current)}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              aria-label={rightPanelCollapsed ? "展开右侧面板" : "折叠右侧面板"}
              className={titlebarIconButtonClassName}
              onClick={() => setRightPanelCollapsed((current) => !current)}
            >
              <GitBranchPlus className="h-4 w-4" />
            </button>
          </div>
        )}

      </header>

      <div
        className="grid min-h-0 flex-1 overflow-hidden"
        style={{ gridTemplateColumns }}
      >
        <div className="h-full min-h-0 overflow-hidden">
          <Collapsible open={!sidebarCollapsed}>
            <CollapsibleContent
              forceMount
              className={[
                "h-full min-h-0 overflow-hidden border-r border-border/70 bg-[rgb(var(--color-bg)/0.9)]",
                sidebarCollapsed ? "pointer-events-none opacity-0" : "opacity-100",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <aside className="flex h-full min-h-0 flex-col">
                {sidebarTitle ? (
                  <div className="border-b border-border/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                      {sidebarTitle}
                    </p>
                  </div>
                ) : null}
                <div className="min-h-0 flex-1 overflow-hidden">{sidebar}</div>
              </aside>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <section className="relative grid min-h-0 grid-rows-[auto_minmax(0,1fr)] bg-bg">
          {!sidebarCollapsed ? (
            <div
              className="absolute inset-y-0 left-0 z-10 w-[10px] -translate-x-1/2 cursor-col-resize"
              onPointerDown={() => setActiveDrag("sidebar")}
            >
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/55" />
            </div>
          ) : null}

          {!rightPanelCollapsed ? (
            <div
              className="absolute inset-y-0 right-0 z-10 w-[10px] translate-x-1/2 cursor-col-resize"
              onPointerDown={() => setActiveDrag("right-panel")}
            >
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/55" />
            </div>
          ) : null}

          <div className="border-b border-border/70 bg-bg/80 px-3 py-2">
            {tabBar}
          </div>
          <div className="h-full min-h-0 overflow-hidden">{editor}</div>
        </section>

        <div className="h-full min-h-0 overflow-hidden">
          <Collapsible open={!rightPanelCollapsed}>
            <CollapsibleContent
              forceMount
              className={[
                "h-full min-h-0 overflow-hidden border-l border-border/70 bg-bg/60",
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
                <div className="min-h-0 flex-1 overflow-hidden">{rightPanel}</div>
              </aside>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {statusBar}
    </div>
  );
}

export default AppLayout;

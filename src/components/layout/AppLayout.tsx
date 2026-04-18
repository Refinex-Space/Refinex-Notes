import {
  AlignLeft,
  GitBranch,
  Moon,
  PanelLeft,
  Search,
  Settings,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Collapsible, CollapsibleContent } from "../ui/collapsible";

/**
 * TBtn-style button class matching the prototype's TBtn component:
 * 28×28px, rounded-md, accent when active, muted + hover-bg when inactive.
 */
function tbtnClass(active: boolean) {
  const base = [
    "inline-flex h-7 w-7 items-center justify-center rounded-md",
    "border-none cursor-pointer transition-all duration-[120ms]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
  ].join(" ");
  if (active) {
    return `${base} bg-fg/[0.08] text-accent hover:bg-fg/[0.08]`;
  }
  return `${base} bg-transparent text-muted hover:bg-fg/[0.06]`;
}

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
  /** Content rendered in the right panel when AI panel mode is active. */
  aiPanel?: ReactNode;
  statusBar: ReactNode;
  defaultSidebarWidth?: number;
  defaultRightPanelWidth?: number;
  sidebarTitle?: string;
  rightPanelTitle?: string;
  /** Filename displayed in the titlebar center. */
  activeTitle?: string;
  /** Current theme — controls the theme toggle icon. */
  theme?: "light" | "dark";
  onThemeToggle?: () => void;
  /** Whether the document outline dock is currently visible. */
  outlineVisible?: boolean;
  onOutlineToggle?: () => void;
  /** Called when the user clicks the settings button. */
  onSettingsClick?: () => void;
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
  aiPanel,
  statusBar,
  defaultSidebarWidth = 240,
  defaultRightPanelWidth = 320,
  sidebarTitle = "Workspace",
  rightPanelTitle = "Assistant",
  activeTitle,
  theme = "light",
  onThemeToggle,
  outlineVisible = true,
  onOutlineToggle,
  onSettingsClick,
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  /** null = collapsed; 'git' | 'ai' = open with that panel active */
  const [activeRightPanel, setActiveRightPanel] = useState<
    "git" | "ai" | null
  >(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(
    clamp(defaultSidebarWidth, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH),
  );
  const [rightPanelWidth, setRightPanelWidth] = useState(
    clamp(defaultRightPanelWidth, MIN_RIGHT_PANEL_WIDTH, MAX_RIGHT_PANEL_WIDTH),
  );
  const [activeDrag, setActiveDrag] = useState<
    "sidebar" | "right-panel" | null
  >(null);

  const toggleRightPanel = (mode: "git" | "ai") => {
    setActiveRightPanel((current) => (current === mode ? null : mode));
  };

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
    const rightTrack =
      activeRightPanel === null ? "0px" : `${rightPanelWidth}px`;

    return `${sidebarTrack} minmax(0, 1fr) ${rightTrack}`;
  }, [activeRightPanel, rightPanelWidth, sidebarCollapsed, sidebarWidth]);

  const needsMacInset = useMemo(() => {
    if (typeof navigator === "undefined") {
      return false;
    }

    return isMacLikePlatform(navigator.platform, navigator.userAgent);
  }, []);

  // Shared inline-search-bar input style
  const searchBarInputClassName =
    "flex-1 border-none bg-transparent text-[13px] text-fg outline-none placeholder:text-muted/50";

  /** Six right-side header buttons, shared across mac and non-mac layouts. */
  const rightActionButtons = (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        title="搜索"
        aria-label="搜索"
        className={tbtnClass(searchOpen)}
        onClick={() => setSearchOpen((s) => !s)}
      >
        <Search className="h-[15px] w-[15px]" />
      </button>
      <button
        type="button"
        title="AI 助手"
        aria-label="AI 助手"
        className={tbtnClass(activeRightPanel === "ai")}
        onClick={() => toggleRightPanel("ai")}
      >
        <Sparkles className="h-[15px] w-[15px]" />
      </button>
      <button
        type="button"
        title="Git"
        aria-label="Git"
        className={tbtnClass(activeRightPanel === "git")}
        onClick={() => toggleRightPanel("git")}
      >
        <GitBranch className="h-[15px] w-[15px]" />
      </button>
      <button
        type="button"
        title="大纲"
        aria-label="大纲"
        className={tbtnClass(outlineVisible)}
        onClick={onOutlineToggle}
      >
        <AlignLeft className="h-[15px] w-[15px]" />
      </button>
      <button
        type="button"
        title="切换主题"
        aria-label="切换主题"
        className={tbtnClass(false)}
        onClick={onThemeToggle}
      >
        {theme === "dark" ? (
          <Sun className="h-[15px] w-[15px]" />
        ) : (
          <Moon className="h-[15px] w-[15px]" />
        )}
      </button>
      <button
        type="button"
        title="设置"
        aria-label="设置"
        className={tbtnClass(false)}
        onClick={onSettingsClick}
      >
        <Settings className="h-[15px] w-[15px]" />
      </button>
    </div>
  );

  return (
    <div className="flex h-screen min-h-screen overflow-hidden flex-col bg-bg text-fg">
      <header className="border-b border-border/70 bg-bg/90 backdrop-blur">
        {needsMacInset ? (
          /* macOS: traffic lights occupy ~6.9rem on the left; sidebar btn is
             positioned right after them. Center title is absolutely centered.
             Right buttons are absolutely positioned at the trailing edge. */
          <div data-tauri-drag-region className="relative h-10">
            {/* Left: sidebar toggle */}
            <button
              type="button"
              aria-label={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
              title={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
              className={[
                tbtnClass(!sidebarCollapsed),
                "absolute left-[6.9rem] top-1.5",
              ].join(" ")}
              onClick={() => setSidebarCollapsed((c) => !c)}
            >
              <PanelLeft className="h-[15px] w-[15px]" />
            </button>

            {/* Center: file title — pointer-events-none so drag still works */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-full items-center justify-center gap-1.5">
              {activeTitle ? (
                <>
                  <span className="text-[12.5px] font-medium text-muted">
                    {activeTitle}
                  </span>
                  <span className="text-[10px] text-muted/60">
                    — Refinex-Notes
                  </span>
                </>
              ) : (
                <span className="text-[10px] text-muted/50">
                  Refinex-Notes
                </span>
              )}
            </div>

            {/* Right: action buttons */}
            <div className="absolute right-2 top-1.5">{rightActionButtons}</div>
          </div>
        ) : (
          /* Non-macOS: no traffic-lights inset — sidebar btn is at the far left. */
          <div data-tauri-drag-region className="relative h-10">
            {/* Left: sidebar toggle */}
            <button
              type="button"
              aria-label={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
              title={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
              className={[
                tbtnClass(!sidebarCollapsed),
                "absolute left-3 top-1.5",
              ].join(" ")}
              onClick={() => setSidebarCollapsed((c) => !c)}
            >
              <PanelLeft className="h-[15px] w-[15px]" />
            </button>

            {/* Center: file title */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-full items-center justify-center gap-1.5">
              {activeTitle ? (
                <>
                  <span className="text-[12.5px] font-medium text-muted">
                    {activeTitle}
                  </span>
                  <span className="text-[10px] text-muted/60">
                    — Refinex-Notes
                  </span>
                </>
              ) : (
                <span className="text-[10px] text-muted/50">
                  Refinex-Notes
                </span>
              )}
            </div>

            {/* Right: action buttons */}
            <div className="absolute right-2 top-1.5">{rightActionButtons}</div>
          </div>
        )}

        {/* Inline search bar — appears below the title row when searchOpen */}
        {searchOpen ? (
          <div className="flex items-center gap-2 border-t border-border/70 bg-bg/90 px-4 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted/60" />
            <input
              autoFocus
              type="text"
              placeholder="搜索文档..."
              className={searchBarInputClassName}
            />
            <span className="shrink-0 text-[11px] text-muted/60">0 结果</span>
            <button
              type="button"
              aria-label="关闭搜索"
              className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted/60 hover:text-muted"
              onClick={() => setSearchOpen(false)}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : null}
      </header>

      <div
        className="grid min-h-0 flex-1 overflow-hidden"
        style={{ gridTemplateColumns }}
      >
        <div className="h-full min-h-0 min-w-0 overflow-hidden">
          <Collapsible open={!sidebarCollapsed}>
            <CollapsibleContent
              forceMount
              className={[
                "h-full min-h-0 overflow-hidden border-r border-border/70 bg-[rgb(var(--color-bg)/0.9)]",
                sidebarCollapsed
                  ? "pointer-events-none opacity-0"
                  : "opacity-100",
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

        <section className="relative grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] bg-bg">
          {!sidebarCollapsed ? (
            <div
              className="absolute inset-y-0 left-0 z-10 w-[10px] -translate-x-1/2 cursor-col-resize"
              onPointerDown={() => setActiveDrag("sidebar")}
            >
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/55" />
            </div>
          ) : null}

          {activeRightPanel !== null ? (
            <div
              className="absolute inset-y-0 right-0 z-10 w-[10px] translate-x-1/2 cursor-col-resize"
              onPointerDown={() => setActiveDrag("right-panel")}
            >
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/55" />
            </div>
          ) : null}

          <div className="px-2.5 py-1.5">{tabBar}</div>
          <div className="h-full min-h-0 min-w-0 overflow-hidden">{editor}</div>
        </section>

        <div className="h-full min-h-0 min-w-0 overflow-hidden">
          <Collapsible open={activeRightPanel !== null}>
            <CollapsibleContent
              forceMount
              className={[
                "h-full min-h-0 overflow-hidden border-l border-border/70 bg-bg/60",
                activeRightPanel === null
                  ? "pointer-events-none opacity-0"
                  : "opacity-100",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <aside className="flex h-full min-h-0 flex-col">
                {rightPanelTitle ? (
                  <div className="border-b border-border/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                      {rightPanelTitle}
                    </p>
                  </div>
                ) : null}
                <div className="min-h-0 flex-1 overflow-hidden">
                  {activeRightPanel === "git"
                    ? rightPanel
                    : activeRightPanel === "ai"
                      ? (aiPanel ?? null)
                      : null}
                </div>
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

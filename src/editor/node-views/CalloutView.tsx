import {
  Info,
  Lightbulb,
  CircleAlert,
  TriangleAlert,
  OctagonAlert,
  ChevronDown,
  Quote,
} from "lucide-react";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { NodeView, ViewMutationRecord } from "prosemirror-view";
import { EditorView } from "prosemirror-view";
import { useState, useRef, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { createPortal } from "react-dom";
import { type Root, createRoot } from "react-dom/client";

// ---------------------------------------------------------------------------
// Per-type config
// ---------------------------------------------------------------------------

const CALLOUT_META = {
  note: { Icon: Info, label: "Note" },
  tip: { Icon: Lightbulb, label: "Tip" },
  important: { Icon: CircleAlert, label: "Important" },
  warning: { Icon: TriangleAlert, label: "Warning" },
  caution: { Icon: OctagonAlert, label: "Caution" },
} as const;

type CalloutType = keyof typeof CALLOUT_META;

const CALLOUT_ORDER: CalloutType[] = [
  "note",
  "tip",
  "important",
  "warning",
  "caution",
];

// ---------------------------------------------------------------------------
// React header component with type-switcher dropdown (portaled to body)
// ---------------------------------------------------------------------------

function CalloutHeader({
  calloutType,
  onChange,
}: {
  calloutType: CalloutType;
  onChange: (next: CalloutType | null) => void;
}) {
  const meta = CALLOUT_META[calloutType];
  const { Icon, label } = meta;

  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openMenu = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      zIndex: 10000,
    });
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(next: CalloutType | null) {
    setOpen(false);
    onChange(next);
  }

  const menu = open
    ? createPortal(
        <div
          className="refinex-callout-menu"
          role="listbox"
          aria-label="切换 Callout 类型"
          style={menuStyle}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {CALLOUT_ORDER.map((type) => {
            const { Icon: TypeIcon, label: typeLabel } = CALLOUT_META[type];
            return (
              <button
                key={type}
                type="button"
                role="option"
                aria-selected={type === calloutType}
                className={[
                  "refinex-callout-menu-item",
                  "refinex-callout-menu-item--" + type,
                  type === calloutType ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(type);
                }}
              >
                <TypeIcon size={13} strokeWidth={2.25} aria-hidden="true" />
                <span>{typeLabel}</span>
              </button>
            );
          })}
          <div className="refinex-callout-menu-divider" role="separator" />
          <button
            type="button"
            role="option"
            aria-selected={false}
            className="refinex-callout-menu-item refinex-callout-menu-item--plain"
            onMouseDown={(e) => {
              e.preventDefault();
              select(null);
            }}
          >
            <Quote size={13} strokeWidth={2.25} aria-hidden="true" />
            <span>普通引用块</span>
          </button>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="refinex-callout-header"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) {
            setOpen(false);
          } else {
            openMenu();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Icon size={14} strokeWidth={2.25} aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown
          size={11}
          strokeWidth={2.5}
          className="refinex-callout-chevron"
          aria-hidden="true"
        />
      </button>
      {menu}
    </>
  );
}

// ---------------------------------------------------------------------------
// ProseMirror NodeView
// ---------------------------------------------------------------------------

export class CalloutView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private headerHost: HTMLElement | null = null;
  private root: Root | null = null;

  constructor(
    private node: ProseMirrorNode,
    private readonly pmView: EditorView,
    private readonly getPos: () => number | undefined,
  ) {
    const calloutType = node.attrs.calloutType as string | null;

    this.dom = document.createElement("blockquote");

    if (calloutType && calloutType in CALLOUT_META) {
      this.dom.setAttribute("data-callout", calloutType);
      this.headerHost = document.createElement("div");
      this.headerHost.setAttribute("contenteditable", "false");
      this.dom.appendChild(this.headerHost);
      this.root = createRoot(this.headerHost);
      flushSync(() => {
        this.root!.render(
          <CalloutHeader
            calloutType={calloutType as CalloutType}
            onChange={(next) => this.changeType(next)}
          />,
        );
      });
    }

    this.contentDOM = document.createElement("div");
    this.contentDOM.className = "refinex-callout-body";
    this.dom.appendChild(this.contentDOM);
  }

  private changeType(next: CalloutType | null) {
    const pos = this.getPos();
    if (pos === undefined) return;
    const { tr, schema } = this.pmView.state;
    tr.setNodeMarkup(pos, schema.nodes.blockquote, {
      ...this.node.attrs,
      calloutType: next,
    });
    this.pmView.dispatch(tr);
    this.pmView.focus();
  }

  update(node: ProseMirrorNode): boolean {
    if (node.type.name !== "blockquote") return false;
    this.node = node;

    const calloutType = node.attrs.calloutType as string | null;

    if (calloutType && calloutType in CALLOUT_META) {
      this.dom.setAttribute("data-callout", calloutType);

      if (!this.headerHost) {
        this.headerHost = document.createElement("div");
        this.headerHost.setAttribute("contenteditable", "false");
        this.dom.insertBefore(this.headerHost, this.contentDOM);
        this.root = createRoot(this.headerHost);
      }

      flushSync(() => {
        this.root!.render(
          <CalloutHeader
            calloutType={calloutType as CalloutType}
            onChange={(next) => this.changeType(next)}
          />,
        );
      });
    } else {
      this.dom.removeAttribute("data-callout");
      if (this.headerHost) {
        this.root?.unmount();
        this.root = null;
        this.headerHost.remove();
        this.headerHost = null;
      }
    }

    return true;
  }

  stopEvent(event: Event): boolean {
    return this.headerHost?.contains(event.target as Node) ?? false;
  }

  /**
   * Ignore DOM mutations inside headerHost — caused by React rendering the
   * dropdown. Without this, PM's MutationObserver sees new DOM nodes, treats
   * them as unexpected edits, and immediately destroys/recreates the NodeView,
   * closing the dropdown before the user ever sees it.
   */
  ignoreMutation(record: ViewMutationRecord): boolean {
    if (record.target === this.dom) return true;
    return !!(
      this.headerHost && this.headerHost.contains(record.target as Node)
    );
  }

  destroy() {
    this.root?.unmount();
  }
}

import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { EditorView } from "prosemirror-view";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "../../components/ui/popover";
import {
  applyLinkMark,
  type LinkEditorRequest,
  type PopoverAnchorRect,
} from "../rich-ui";

export type LinkPopoverRequest = LinkEditorRequest & {
  anchor: PopoverAnchorRect;
};

export interface LinkPopoverProps {
  view: EditorView | null;
  request: LinkPopoverRequest | null;
  onClose: () => void;
}

const inputClasses = [
  "h-10 w-full rounded border border-border/70 bg-bg/80 px-3 text-sm text-fg outline-none transition",
  "focus:border-accent/60 focus:ring-2 focus:ring-accent/20",
].join(" ");

const actionButtonClasses = [
  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
].join(" ");

export function LinkPopover({ view, request, onClose }: LinkPopoverProps) {
  const [displayText, setDisplayText] = useState("");
  const [href, setHref] = useState("");
  const [title, setTitle] = useState("");
  const hrefInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (request && view) {
      setDisplayText(view.state.doc.textBetween(request.from, request.to));
    } else {
      setDisplayText("");
    }
    setHref(request?.href ?? "");
    setTitle(request?.title ?? "");
  }, [request, view]);

  if (!view || !request) {
    return null;
  }

  return (
    <Popover open>
      <PopoverAnchor asChild>
        <span
          aria-hidden="true"
          style={{
            position: "fixed",
            top: request.anchor.top,
            left: request.anchor.left,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={16}
        className="w-[28rem] max-w-[calc(100vw-2rem)] rounded-3xl p-2"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          hrefInputRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={() => {
          onClose();
          view.focus();
        }}
        onInteractOutside={() => {
          onClose();
          view.focus();
        }}
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            applyLinkMark(view.state, view.dispatch, {
              from: request.from,
              to: request.to,
              href,
              title,
              text: displayText,
            });
            onClose();
            view.focus();
          }}
        >
          {/* Editable display text */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              显示文字
            </label>
            <input
              className={inputClasses}
              value={displayText}
              onChange={(event) => setDisplayText(event.target.value)}
              placeholder="链接显示文字"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              页面或 URL
            </label>
            <input
              ref={hrefInputRef}
              className={inputClasses}
              value={href}
              onChange={(event) => setHref(event.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              链接标题
            </label>
            <input
              className={inputClasses}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="链接标题"
            />
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Remove link — left side */}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-red-400/80 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
              onClick={() => {
                applyLinkMark(view.state, view.dispatch, {
                  from: request.from,
                  to: request.to,
                  href: "",
                  title: "",
                });
                onClose();
                view.focus();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              移除链接
            </button>
            {/* Cancel + Apply — right side */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={[
                  actionButtonClasses,
                  "text-muted hover:bg-accent/10",
                ].join(" ")}
                onClick={() => {
                  onClose();
                  view.focus();
                }}
              >
                取消
              </button>
              <button
                type="submit"
                className={[
                  actionButtonClasses,
                  "bg-accent/15 text-fg hover:bg-accent/25",
                ].join(" ")}
              >
                应用链接
              </button>
            </div>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export default LinkPopover;

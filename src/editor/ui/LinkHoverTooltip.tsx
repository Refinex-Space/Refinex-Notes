import { Copy, Globe, Pencil } from "lucide-react";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "../../components/ui/popover";
import type { PopoverAnchorRect } from "../rich-ui";

export interface LinkHoverTooltipProps {
  href: string;
  anchor: PopoverAnchorRect;
  onEdit: () => void;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function truncateUrl(url: string, maxLength = 40): string {
  if (url.length <= maxLength) return url;
  try {
    const parsed = new URL(url);
    const origin = parsed.origin;
    const rest = parsed.pathname + parsed.search + parsed.hash;
    if (origin.length >= maxLength - 1) {
      return origin.slice(0, maxLength - 1) + "…";
    }
    const allowance = maxLength - origin.length - 1;
    if (rest.length > allowance) {
      return origin + rest.slice(0, allowance - 1) + "…";
    }
  } catch {
    // not a valid URL — fall through to dumb truncation
  }
  return url.slice(0, maxLength - 1) + "…";
}

export function LinkHoverTooltip({
  href,
  anchor,
  onEdit,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: LinkHoverTooltipProps) {
  const displayUrl = truncateUrl(href);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(href);
    } catch {
      // clipboard unavailable — silently ignore
    }
    onClose();
  };

  const handleEdit = () => {
    onEdit();
  };

  return (
    <Popover open>
      <PopoverAnchor asChild>
        <span
          aria-hidden="true"
          style={{
            position: "fixed",
            top: anchor.bottom,
            left: anchor.left,
            width: Math.max(1, anchor.width),
            height: 1,
            pointerEvents: "none",
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-auto max-w-[22rem] rounded-xl p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={onClose}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="flex items-center gap-1 px-2 py-1.5">
          {/* Globe icon */}
          <Globe className="h-3.5 w-3.5 flex-none text-muted" />

          {/* Truncated URL — clicking opens in browser */}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-[200px] truncate text-sm text-accent hover:underline"
            title={href}
            onClick={(e) => e.stopPropagation()}
          >
            {displayUrl}
          </a>

          {/* Divider */}
          <span className="mx-0.5 h-3.5 w-px bg-border/60 flex-none" />

          {/* Copy button */}
          <button
            type="button"
            className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg text-muted transition hover:bg-accent/10 hover:text-fg"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCopy}
            title="复制链接"
            aria-label="复制链接"
          >
            <Copy className="h-3 w-3" />
          </button>

          {/* Edit button */}
          <button
            type="button"
            className="inline-flex h-6 flex-none items-center justify-center rounded-lg px-1.5 text-xs text-muted transition hover:bg-accent/10 hover:text-fg"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleEdit}
            aria-label="编辑链接"
          >
            <Pencil className="mr-1 h-3 w-3" />
            编辑
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default LinkHoverTooltip;

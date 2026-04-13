import { useEffect, useRef, useState } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";

import { refinexInputRules } from "./plugins/input-rules";
import { refinexParser, parseMarkdown } from "./parser";
import { inlineSyncPlugin } from "./plugins/inline-sync";
import { refinexKeymap } from "./plugins/keymap";
import { placeholderPlugin } from "./plugins/placeholder";
import { slashMenuPlugin } from "./plugins/slash-menu";
import { refinexSerializer, serializeMarkdown } from "./serializer";
import {
  ensureTrailingParagraph,
  stripTrailingParagraph,
  trailingNodePlugin,
} from "./plugins/trailing-node";
import { CodeBlockView } from "./node-views/CodeBlockView";
import { ImageView } from "./node-views/ImageView";
import { LinkPopover, type LinkPopoverRequest } from "./ui/LinkPopover";
import { FloatingToolbar } from "./ui/FloatingToolbar";
import { SlashMenu, type SlashMenuRequest } from "./ui/SlashMenu";
import {
  getLinkEditorRequest,
  getSelectionAnchorRect,
  handleImageFileDrop,
} from "./rich-ui";
import "./editor.css";

export interface RefinexEditorProps {
  /** Markdown 内容（受控） */
  value: string;
  /** 内容变更时回调，参数为序列化后的 Markdown 字符串 */
  onChange?: (markdown: string) => void;
  /** 只读模式 */
  readOnly?: boolean;
  /** 容器 className */
  className?: string;
}

export function RefinexEditor({
  value,
  onChange,
  readOnly = false,
  className,
}: RefinexEditorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const readOnlyRef = useRef(readOnly);
  const openLinkPopoverRef = useRef<(view: EditorView) => boolean>(() => false);
  const slashMenuChangeRef = useRef(
    (_request: SlashMenuRequest | null) => {},
  );
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [overlayVersion, setOverlayVersion] = useState(0);
  const [linkPopoverRequest, setLinkPopoverRequest] =
    useState<LinkPopoverRequest | null>(null);
  const [slashMenuRequest, setSlashMenuRequest] =
    useState<SlashMenuRequest | null>(null);

  // Keep refs in sync with latest props without re-triggering effects
  onChangeRef.current = onChange;
  readOnlyRef.current = readOnly;
  openLinkPopoverRef.current = (view) => {
    const request = getLinkEditorRequest(view.state);
    if (!request) {
      return false;
    }

    setLinkPopoverRequest({
      ...request,
      anchor: getSelectionAnchorRect(view, request.from, request.to),
    });
    return true;
  };
  slashMenuChangeRef.current = (request) => {
    setSlashMenuRequest(request);
  };

  // Initialize EditorView once on mount
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const doc = ensureTrailingParagraph(parseMarkdown(value));

    const state = EditorState.create({
      doc,
      plugins: [
        refinexKeymap({
          onOpenLinkPopover: (view) => openLinkPopoverRef.current(view),
        }),
        keymap(baseKeymap),
        refinexInputRules(),
        inlineSyncPlugin(refinexParser, refinexSerializer),
        slashMenuPlugin({
          onChange: (trigger, view) => {
            slashMenuChangeRef.current(
              trigger
                ? {
                    ...trigger,
                    anchor: getSelectionAnchorRect(view, trigger.from, trigger.to),
                  }
                : null,
            );
          },
        }),
        trailingNodePlugin(),
        placeholderPlugin(),
        history(),
        dropCursor(),
        gapCursor(),
      ],
    });

    const view = new EditorView(mount, {
      state,
      editable: () => !readOnlyRef.current,
      handleDrop(view, event) {
        return handleImageFileDrop(view, event);
      },
      nodeViews: {
        code_block: (node, view, getPos) => new CodeBlockView(node, view, getPos),
        image: (node, view, getPos) => new ImageView(node, view, getPos),
      },
      dispatchTransaction(transaction) {
        const result = view.state.applyTransaction(transaction);
        view.updateState(result.state);
        setOverlayVersion((current) => current + 1);

        if (result.transactions.some((nextTransaction) => nextTransaction.docChanged) && onChangeRef.current) {
          const markdown = serializeMarkdown(stripTrailingParagraph(result.state.doc));
          onChangeRef.current(markdown);
        }
      },
    });

    viewRef.current = view;
    setEditorView(view);

    return () => {
      view.destroy();
      viewRef.current = null;
      setEditorView(null);
      setLinkPopoverRequest(null);
      setSlashMenuRequest(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only — intentional: we manage value updates via the effect below

  // Sync readOnly changes without re-creating the view
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    // Re-applying state triggers an editable re-evaluation
    view.setProps({
      editable: () => !readOnly,
      handleDrop(innerView, event) {
        return handleImageFileDrop(innerView, event);
      },
      nodeViews: {
        code_block: (node, innerView, getPos) =>
          new CodeBlockView(node, innerView, getPos),
        image: (node, innerView, getPos) => new ImageView(node, innerView, getPos),
      },
    });
  }, [readOnly]);

  // Sync value prop into ProseMirror when it changes externally
  // Only replace the document when the incoming text differs from the
  // current serialized state (avoids an infinite update loop).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const current = serializeMarkdown(stripTrailingParagraph(view.state.doc));
    if (current === value) return;

    const doc = ensureTrailingParagraph(parseMarkdown(value));
    const newState = EditorState.create({
      doc,
      plugins: view.state.plugins,
    });
    view.updateState(newState);
  }, [value]);

  return (
    <div className={className} data-refinex-editor-shell>
      <div ref={mountRef} data-refinex-editor />
      <FloatingToolbar
        view={editorView}
        version={overlayVersion}
        onRequestLinkEdit={(view) => openLinkPopoverRef.current(view)}
      />
      <LinkPopover
        view={editorView}
        request={linkPopoverRequest}
        onClose={() => setLinkPopoverRequest(null)}
      />
      <SlashMenu
        view={editorView}
        request={slashMenuRequest}
        onClose={() => setSlashMenuRequest(null)}
      />
    </div>
  );
}

export default RefinexEditor;

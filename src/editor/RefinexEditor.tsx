import { useEffect, useRef } from "react";
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
import { refinexSerializer, serializeMarkdown } from "./serializer";
import {
  ensureTrailingParagraph,
  stripTrailingParagraph,
  trailingNodePlugin,
} from "./plugins/trailing-node";
import { CodeBlockView } from "./node-views/CodeBlockView";
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

  // Keep refs in sync with latest props without re-triggering effects
  onChangeRef.current = onChange;
  readOnlyRef.current = readOnly;

  // Initialize EditorView once on mount
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const doc = ensureTrailingParagraph(parseMarkdown(value));

    const state = EditorState.create({
      doc,
      plugins: [
        refinexKeymap(),
        keymap(baseKeymap),
        refinexInputRules(),
        inlineSyncPlugin(refinexParser, refinexSerializer),
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
      nodeViews: {
        code_block: (node, view, getPos) => new CodeBlockView(node, view, getPos),
      },
      dispatchTransaction(transaction) {
        const result = view.state.applyTransaction(transaction);
        view.updateState(result.state);

        if (result.transactions.some((nextTransaction) => nextTransaction.docChanged) && onChangeRef.current) {
          const markdown = serializeMarkdown(stripTrailingParagraph(result.state.doc));
          onChangeRef.current(markdown);
        }
      },
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only — intentional: we manage value updates via the effect below

  // Sync readOnly changes without re-creating the view
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    // Re-applying state triggers an editable re-evaluation
    view.setProps({ editable: () => !readOnly });
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

  return <div ref={mountRef} className={className} data-refinex-editor />;
}

export default RefinexEditor;

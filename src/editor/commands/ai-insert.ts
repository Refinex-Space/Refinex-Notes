import { closeHistory } from "prosemirror-history";
import type { EditorView } from "prosemirror-view";

import {
  refinexAIWriteHighlightKey,
  setAIWriteHighlightMeta,
  type AIWriteHighlightState,
} from "../plugins/ai-write-highlight";
import { refinexForceInlineSyncMetaKey } from "../plugins/inline-sync";
import { useNoteStore } from "../../stores/noteStore";

export type EditorAIOutputMode =
  | "replace-selection"
  | "insert-at-cursor"
  | "new-document"
  | "chat-response";

export interface AIStreamHandler {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: () => void;
  flush: () => Promise<void>;
}

export interface AIStreamHandlerOptions {
  requestId?: string;
  skillId?: string;
  targetPath?: string;
  onChatToken?: (token: string) => void;
  onChatComplete?: (content: string) => void;
}

function createRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `ai-write-${Date.now()}`;
}

function getInitialRange(view: EditorView, outputMode: EditorAIOutputMode) {
  const { from, to } = view.state.selection;
  if (outputMode === "replace-selection") {
    return { from, to };
  }

  return { from: to, to };
}

function buildGeneratedDocumentPath(skillId?: string) {
  const noteState = useNoteStore.getState();
  const currentPath = noteState.currentFile ?? noteState.openFiles[0] ?? "";
  const parentPath = currentPath.split("/").slice(0, -1).filter(Boolean).join("/");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${skillId ?? "ai-draft"}-${timestamp}.md`;

  return parentPath ? `${parentPath}/${fileName}` : fileName;
}

function createHighlight(
  from: number,
  to: number,
  phase: AIWriteHighlightState["phase"],
) {
  return from < to ? { from, to, phase } : null;
}

function updateEditorRange(
  view: EditorView,
  requestId: string,
  token: string,
  insertAt: number,
  currentRangeStart: number,
  nextRangeEnd: number,
  isolateHistory: boolean,
) {
  const baseTransaction = view.state.tr.insertText(token, insertAt, insertAt);
  const transaction = (isolateHistory
    ? closeHistory(baseTransaction)
    : baseTransaction
  ).setMeta("composition", requestId);

  setAIWriteHighlightMeta(
    transaction,
    createHighlight(currentRangeStart, nextRangeEnd, "active"),
  );
  view.dispatch(transaction.scrollIntoView());
}

function fadeEditorHighlight(view: EditorView, requestId: string) {
  const currentHighlight = refinexAIWriteHighlightKey.getState(view.state);
  const transaction = closeHistory(view.state.tr).setMeta(
    "composition",
    requestId,
  );
  setAIWriteHighlightMeta(
    transaction,
    currentHighlight
      ? {
          ...currentHighlight,
          phase: "fading",
        }
      : null,
  );
  transaction.setMeta(refinexForceInlineSyncMetaKey, true);
  view.dispatch(transaction);

  globalThis.setTimeout(() => {
    if (view.isDestroyed) {
      return;
    }

    view.dispatch(setAIWriteHighlightMeta(view.state.tr, null));
  }, 1200);
}

export function createAIStreamHandler(
  view: EditorView,
  outputMode: EditorAIOutputMode,
  options: AIStreamHandlerOptions = {},
): AIStreamHandler {
  const requestId = options.requestId ?? createRequestId();
  const initialRange = getInitialRange(view, outputMode);
  let accumulatedText = "";
  let currentInsertPosition = initialRange.to;
  let hasInserted = false;
  let activeDocumentPath: string | null = null;
  let newDocumentPromise: Promise<void> | null = null;
  let sequence = Promise.resolve();

  const queue = (job: () => void | Promise<void>) => {
    sequence = sequence.then(job);
    sequence = sequence.catch((error) => {
      console.error("AI 写入任务执行失败", error);
    });
    return sequence;
  };

  const ensureNewDocument = () => {
    if (newDocumentPromise) {
      return newDocumentPromise;
    }

    newDocumentPromise = (async () => {
      activeDocumentPath = options.targetPath ?? buildGeneratedDocumentPath(options.skillId);
      await useNoteStore.getState().createFile(activeDocumentPath);
      useNoteStore.getState().updateFileContent(activeDocumentPath, "");
    })();

    return newDocumentPromise;
  };

  return {
    onToken(token) {
      if (!token) {
        return;
      }

      accumulatedText += token;

      if (outputMode === "chat-response") {
        options.onChatToken?.(token);
        return;
      }

      if (outputMode === "new-document") {
        void queue(async () => {
          await ensureNewDocument();
          if (activeDocumentPath) {
            useNoteStore.getState().updateFileContent(activeDocumentPath, accumulatedText);
          }
        });
        return;
      }

      void queue(() => {
        if (view.isDestroyed) {
          return;
        }

        const nextRangeEnd = initialRange.from + accumulatedText.length;
        if (!hasInserted && outputMode === "replace-selection") {
          const transaction = closeHistory(
            view.state.tr.insertText(token, initialRange.from, initialRange.to),
          ).setMeta("composition", requestId);
          setAIWriteHighlightMeta(
            transaction,
            createHighlight(initialRange.from, nextRangeEnd, "active"),
          );
          view.dispatch(transaction.scrollIntoView());
          currentInsertPosition = initialRange.from + token.length;
        } else {
          updateEditorRange(
            view,
            requestId,
            token,
            currentInsertPosition,
            initialRange.from,
            nextRangeEnd,
            !hasInserted,
          );
          currentInsertPosition += token.length;
        }
        hasInserted = true;
      });
    },

    onComplete() {
      if (outputMode === "chat-response") {
        options.onChatComplete?.(accumulatedText);
        return;
      }

      if (outputMode === "new-document") {
        void queue(async () => {
          await ensureNewDocument();
          if (activeDocumentPath) {
            useNoteStore.getState().updateFileContent(activeDocumentPath, accumulatedText);
          }
        });
        return;
      }

      void queue(() => {
        if (!view.isDestroyed) {
          fadeEditorHighlight(view, requestId);
        }
      });
    },

    onError() {
      if (outputMode === "chat-response" || outputMode === "new-document") {
        return;
      }

      void queue(() => {
        if (!view.isDestroyed) {
          view.dispatch(setAIWriteHighlightMeta(view.state.tr, null));
        }
      });
    },

    flush() {
      return sequence;
    },
  };
}

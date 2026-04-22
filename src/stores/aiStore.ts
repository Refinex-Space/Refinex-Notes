import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { aiService } from "../services/aiService";
import { fileService } from "../services/fileService";
import type {
  AICommandMessage,
  AIMessage,
  AIModelInfo,
  AIProviderInfo,
  AIStore,
} from "../types/ai";
import type { NoteDocument } from "../types/notes";
import { getCurrentDocument, useNoteStore } from "./noteStore";
import { useEditorStore } from "./editorStore";
import {
  buildAIContext,
  buildDirectoryTreeSummary,
  buildSystemPrompt,
} from "../components/ai/ContextBuilder";

function createMessageId() {
  return globalThis.crypto?.randomUUID?.() ?? `ai-${Date.now()}-${Math.random()}`;
}

function pickDefaultModel(models: readonly AIModelInfo[]) {
  return models.find((model) => model.isDefault) ?? models[0] ?? null;
}

const REMOVED_CURRENT_DOCUMENT_LABEL = "（当前文档上下文已移除）";

function getFileName(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

function excludeCurrentDocumentPath(paths: readonly string[], currentPath?: string) {
  if (!currentPath) {
    return [...paths];
  }

  return paths.filter((path) => path !== currentPath);
}

async function loadReferenceDocument(path: string): Promise<NoteDocument | null> {
  const cachedDocument = useNoteStore.getState().documents[path];
  if (cachedDocument) {
    return cachedDocument;
  }

  if (!fileService.isNativeAvailable()) {
    return null;
  }

  try {
    const content = await fileService.readFile(path);
    return {
      path,
      name: getFileName(path),
      content,
      savedContent: content,
      language: "Markdown",
      gitStatus: "clean",
      isMarkdown: /\.md$/i.test(path),
    };
  } catch {
    return null;
  }
}

async function buildContextSnapshot(args?: {
  selectedText?: string;
  includeCurrentDocument?: boolean;
  attachedDocumentPaths?: string[];
}) {
  const currentDocument = getCurrentDocument();
  const noteState = useNoteStore.getState();
  const editorState = useEditorStore.getState();
  const includeCurrentDocument = args?.includeCurrentDocument ?? true;
  const attachedDocumentPaths = Array.from(
    new Set(
      (args?.attachedDocumentPaths ?? []).filter(
        (path) => path && path !== currentDocument?.path,
      ),
    ),
  );
  const referencedDocuments = (
    await Promise.all(attachedDocumentPaths.map((path) => loadReferenceDocument(path)))
  )
    .filter((document): document is NoteDocument => Boolean(document))
    .map((document) => ({
      path: document.path,
      title: document.name.replace(/\.md$/i, ""),
      content: document.content,
    }));

  return buildAIContext({
    content: includeCurrentDocument ? currentDocument?.content ?? "" : "",
    filePath: includeCurrentDocument
      ? currentDocument?.path ?? "（当前没有打开文档）"
      : REMOVED_CURRENT_DOCUMENT_LABEL,
    cursorPosition: editorState.cursorPosition,
    selectedText: includeCurrentDocument ? args?.selectedText : undefined,
    directoryTree: buildDirectoryTreeSummary(noteState.files),
    openFiles: includeCurrentDocument
      ? noteState.openFiles
      : excludeCurrentDocumentPath(noteState.openFiles, currentDocument?.path),
    recentFiles: includeCurrentDocument
      ? noteState.recentFiles
      : excludeCurrentDocumentPath(noteState.recentFiles, currentDocument?.path),
    referencedDocuments,
  });
}

function toCommandMessages(
  messages: readonly AIMessage[],
  systemPrompt: string,
): AICommandMessage[] {
  return [
    { role: "system", content: systemPrompt },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

function replaceMessageContent(
  messages: readonly AIMessage[],
  messageId: string,
  updater: (current: string) => string,
): AIMessage[] {
  return messages.map((message) =>
    message.id === messageId
      ? {
          ...message,
          content: updater(message.content),
        }
      : message,
  );
}

function trimTrailingEmptyAssistant(messages: readonly AIMessage[]) {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "assistant" || lastMessage.content.length > 0) {
    return [...messages];
  }

  return messages.slice(0, -1);
}

function ensureActiveModel(
  modelsByProvider: Record<string, AIModelInfo[]>,
  providerId: string | null,
  currentModel: string | null,
) {
  if (!providerId) {
    return null;
  }

  const models = modelsByProvider[providerId] ?? [];
  if (models.some((model) => model.modelId === currentModel)) {
    return currentModel;
  }

  return pickDefaultModel(models)?.modelId ?? null;
}

function createInitialState() {
  return {
    messages: [] as AIMessage[],
    isStreaming: false,
    isLoadingProviders: false,
    providers: [] as AIProviderInfo[],
    modelsByProvider: {} as Record<string, AIModelInfo[]>,
    activeProvider: null as string | null,
    activeModel: null as string | null,
    errorMessage: null as string | null,
    activeRequestId: null as string | null,
  };
}

export function resetAIStore() {
  useAIStore.setState(createInitialState());
}

export const useAIStore = create<AIStore>()(
  immer((set, get) => ({
    ...createInitialState(),

    loadProviders: async () => {
      if (!aiService.isNativeAvailable()) {
        set((state) => {
          state.providers = [];
          state.modelsByProvider = {};
          state.activeProvider = null;
          state.activeModel = null;
          state.errorMessage = "AI 功能仅在 Tauri 桌面环境可用";
        });
        return;
      }

      set((state) => {
        state.isLoadingProviders = true;
        state.errorMessage = null;
      });

      try {
        const providers = await aiService.listProviders();
        const previousProvider = get().activeProvider;
        const nextProvider =
          providers.find((provider) => provider.id === previousProvider)?.id ??
          providers[0]?.id ??
          null;

        set((state) => {
          state.providers = providers;
          state.activeProvider = nextProvider;
          state.activeModel = ensureActiveModel(
            state.modelsByProvider,
            nextProvider,
            state.activeModel,
          );
          state.errorMessage =
            providers.length === 0 ? "当前没有可用的 AI Provider" : null;
        });

        if (nextProvider) {
          await get().loadModels(nextProvider);
        }
      } catch (error) {
        set((state) => {
          state.errorMessage =
            error instanceof Error ? error.message : String(error);
        });
      } finally {
        set((state) => {
          state.isLoadingProviders = false;
        });
      }
    },

    loadModels: async (providerId) => {
      if (!providerId || !aiService.isNativeAvailable()) {
        return;
      }

      const models = await aiService.listModels(providerId);

      set((state) => {
        state.modelsByProvider[providerId] = models;
        if (state.activeProvider === providerId) {
          state.activeModel = ensureActiveModel(
            state.modelsByProvider,
            providerId,
            state.activeModel,
          );
        }
      });
    },

    selectProvider: async (providerId) => {
      set((state) => {
        state.activeProvider = providerId;
        state.activeModel = ensureActiveModel(
          state.modelsByProvider,
          providerId,
          state.activeModel,
        );
        state.errorMessage = null;
      });

      if (!(get().modelsByProvider[providerId]?.length > 0)) {
        try {
          await get().loadModels(providerId);
        } catch (error) {
          set((state) => {
            state.errorMessage =
              error instanceof Error ? error.message : String(error);
          });
        }
      }
    },

    selectModel: (modelId) => {
      set((state) => {
        state.activeModel = modelId;
      });
    },

    streamPrompt: async ({
      userMessage,
      promptContent,
      selectedText,
      includeCurrentDocument = true,
      attachedDocumentPaths = [],
    }) => {
      const trimmedUserMessage = userMessage.trim();
      const trimmedPrompt = promptContent.trim();
      if (!trimmedUserMessage || !trimmedPrompt || get().isStreaming) {
        return;
      }

      const providerId = get().activeProvider;
      const modelId = get().activeModel;
      if (!providerId || !modelId) {
        set((state) => {
          state.errorMessage = "请先选择可用的 Provider 和模型";
        });
        return;
      }

      const userMessageId = createMessageId();
      const assistantMessageId = createMessageId();
      const requestId = createMessageId();
      const visibleUserMessage: AIMessage = {
        id: userMessageId,
        role: "user",
        content: trimmedUserMessage,
        timestamp: Date.now(),
      };
      const assistantMessage: AIMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      const systemPrompt = buildSystemPrompt(
        await buildContextSnapshot({
          selectedText,
          includeCurrentDocument,
          attachedDocumentPaths,
        }),
      );
      const commandMessages = toCommandMessages(
        [
          ...get().messages,
          {
            role: "user",
            content: trimmedPrompt,
            id: userMessageId,
            timestamp: visibleUserMessage.timestamp,
          },
        ],
        systemPrompt,
      );

      set((state) => {
        state.messages.push(visibleUserMessage, assistantMessage);
        state.isStreaming = true;
        state.errorMessage = null;
        state.activeRequestId = requestId;
      });

      try {
        await aiService.stream({
          messages: commandMessages,
          providerId,
          model: modelId,
          onToken: (token) => {
            if (get().activeRequestId !== requestId) {
              return;
            }

            set((state) => {
              state.messages = replaceMessageContent(
                state.messages,
                assistantMessageId,
                (current) => current + token,
              );
            });
          },
        });
      } catch (error) {
        const isStillActive = get().activeRequestId === requestId;
        if (isStillActive) {
          set((state) => {
            state.messages = trimTrailingEmptyAssistant(state.messages);
            state.errorMessage =
              error instanceof Error ? error.message : String(error);
          });
        }
      } finally {
        if (get().activeRequestId === requestId) {
          set((state) => {
            state.isStreaming = false;
            state.activeRequestId = null;
          });
        }
      }
    },

    sendMessage: async (content, options) => {
      await get().streamPrompt({
        userMessage: content,
        promptContent: content,
        includeCurrentDocument: options?.includeCurrentDocument,
        attachedDocumentPaths: options?.attachedDocumentPaths,
      });
    },

    cancelStream: async () => {
      const activeRequestId = get().activeRequestId;
      if (!activeRequestId) {
        return;
      }

      set((state) => {
        state.isStreaming = false;
        state.activeRequestId = null;
        state.messages = trimTrailingEmptyAssistant(state.messages);
      });

      try {
        await aiService.cancelStream();
      } catch (error) {
        set((state) => {
          state.errorMessage =
            error instanceof Error ? error.message : String(error);
        });
      }
    },

    clearHistory: () => {
      set((state) => {
        state.messages = [];
        state.errorMessage = null;
      });
    },
  })),
);

import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { aiService } from "../services/aiService";
import { fileService } from "../services/fileService";
import type {
  AICommandMessage,
  AIConversation,
  AIMessage,
  AIMessageAttachment,
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

const AI_CHAT_STORAGE_KEY = "refinex-ai-chat-store";
const DEFAULT_CONVERSATION_TITLE = "新会话";
const CONVERSATION_TITLE_MAX_LENGTH = 28;
const REMOVED_CURRENT_DOCUMENT_LABEL = "（当前文档上下文已移除）";
const inMemoryStorage = new Map<string, string>();

const fallbackStorage: StateStorage = {
  getItem: (name) => inMemoryStorage.get(name) ?? null,
  setItem: (name, value) => {
    inMemoryStorage.set(name, value);
  },
  removeItem: (name) => {
    inMemoryStorage.delete(name);
  },
};

const aiConversationStorage = createJSONStorage(() => {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  return fallbackStorage;
});

function getFileName(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

function sanitizeConversationTitle(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : DEFAULT_CONVERSATION_TITLE;
}

function buildConversationTitleFromMessage(value: string) {
  const normalized = sanitizeConversationTitle(value);
  if (normalized === DEFAULT_CONVERSATION_TITLE) {
    return normalized;
  }

  return normalized.length > CONVERSATION_TITLE_MAX_LENGTH
    ? `${normalized.slice(0, CONVERSATION_TITLE_MAX_LENGTH).trimEnd()}…`
    : normalized;
}

function createConversationRecord(overrides?: Partial<AIConversation>): AIConversation {
  const now = Date.now();

  return {
    id: overrides?.id ?? createMessageId(),
    title: overrides?.title ?? DEFAULT_CONVERSATION_TITLE,
    titleSource: overrides?.titleSource ?? "auto",
    messages: overrides?.messages ?? [],
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? overrides?.createdAt ?? now,
  };
}

function sanitizePersistedConversations(conversations: unknown): AIConversation[] {
  if (!Array.isArray(conversations) || conversations.length === 0) {
    return [createConversationRecord()];
  }

  const sanitized = conversations
    .map((conversation) => {
      if (!conversation || typeof conversation !== "object") {
        return null;
      }

      const candidate = conversation as Partial<AIConversation>;
      return createConversationRecord({
        id:
          typeof candidate.id === "string" && candidate.id.length > 0
            ? candidate.id
            : createMessageId(),
        title:
          typeof candidate.title === "string"
            ? sanitizeConversationTitle(candidate.title)
            : DEFAULT_CONVERSATION_TITLE,
        titleSource: candidate.titleSource === "manual" ? "manual" : "auto",
        messages: Array.isArray(candidate.messages) ? candidate.messages : [],
        createdAt:
          typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now(),
        updatedAt:
          typeof candidate.updatedAt === "number"
            ? candidate.updatedAt
            : typeof candidate.createdAt === "number"
              ? candidate.createdAt
              : Date.now(),
      });
    })
    .filter((conversation): conversation is AIConversation => Boolean(conversation));

  return sanitized.length > 0 ? sanitized : [createConversationRecord()];
}

function resolveActiveConversationId(
  conversations: readonly AIConversation[],
  candidateId: unknown,
) {
  if (typeof candidateId === "string") {
    const matchedConversation = conversations.find(
      (conversation) => conversation.id === candidateId,
    );
    if (matchedConversation) {
      return matchedConversation.id;
    }
  }

  return conversations[0]?.id ?? null;
}

function getConversationById(
  conversations: readonly AIConversation[],
  conversationId: string | null,
) {
  if (!conversationId) {
    return null;
  }

  return conversations.find((conversation) => conversation.id === conversationId) ?? null;
}

function syncActiveConversationMessages(state: {
  conversations: AIConversation[];
  activeConversationId: string | null;
  messages: AIMessage[];
}) {
  const activeConversation =
    getConversationById(state.conversations, state.activeConversationId) ??
    state.conversations[0] ??
    null;

  if (!activeConversation) {
    const createdConversation = createConversationRecord();
    state.conversations = [createdConversation];
    state.activeConversationId = createdConversation.id;
    state.messages = createdConversation.messages;
    return createdConversation;
  }

  state.activeConversationId = activeConversation.id;
  state.messages = activeConversation.messages;
  return activeConversation;
}

function ensureConversationDraft(
  state: {
    conversations: AIConversation[];
    activeConversationId: string | null;
    messages: AIMessage[];
  },
  conversationId: string | null,
) {
  const existingConversation = getConversationById(state.conversations, conversationId);
  if (existingConversation) {
    return existingConversation;
  }

  const createdConversation = createConversationRecord({
    id: conversationId ?? createMessageId(),
  });
  state.conversations.unshift(createdConversation);
  state.activeConversationId = createdConversation.id;
  state.messages = createdConversation.messages;
  return createdConversation;
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
      attachments: message.attachments,
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
  const initialConversation = createConversationRecord();

  return {
    conversations: [initialConversation] as AIConversation[],
    activeConversationId: initialConversation.id as string | null,
    messages: initialConversation.messages as AIMessage[],
    isStreaming: false,
    isLoadingProviders: false,
    providers: [] as AIProviderInfo[],
    modelsByProvider: {} as Record<string, AIModelInfo[]>,
    activeProvider: null as string | null,
    activeModel: null as string | null,
    errorMessage: null as string | null,
    activeRequestId: null as string | null,
    activeRequestConversationId: null as string | null,
  };
}

export function resetAIStore() {
  useAIStore.persist.clearStorage();
  useAIStore.setState(createInitialState());
}

export const useAIStore = create<AIStore>()(
  persist(
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

      createConversation: () => {
        if (get().isStreaming) {
          return get().activeConversationId ?? "";
        }

        const conversation = createConversationRecord();
        set((state) => {
          state.conversations.unshift(conversation);
          state.activeConversationId = conversation.id;
          state.messages = conversation.messages;
          state.errorMessage = null;
        });
        return conversation.id;
      },

      switchConversation: (conversationId) => {
        if (get().isStreaming) {
          return;
        }

        set((state) => {
          state.activeConversationId = conversationId;
          syncActiveConversationMessages(state);
          state.errorMessage = null;
        });
      },

      renameConversation: (conversationId, title) => {
        const nextTitle = sanitizeConversationTitle(title);
        set((state) => {
          const conversation = state.conversations.find((item) => item.id === conversationId);
          if (!conversation) {
            return;
          }

          conversation.title = nextTitle;
          conversation.titleSource = "manual";
          syncActiveConversationMessages(state);
        });
      },

      deleteConversation: (conversationId) => {
        if (get().isStreaming) {
          return;
        }

        set((state) => {
          state.conversations = state.conversations.filter(
            (conversation) => conversation.id !== conversationId,
          );
          if (state.conversations.length === 0) {
            state.conversations = [createConversationRecord()];
          }
          if (state.activeConversationId === conversationId) {
            state.activeConversationId = state.conversations[0]?.id ?? null;
          }
          syncActiveConversationMessages(state);
          state.errorMessage = null;
        });
      },

      streamPrompt: async ({
        userMessage,
        promptContent,
        selectedText,
        includeCurrentDocument = true,
        attachedDocumentPaths = [],
        attachments = [],
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

        let conversationId = get().activeConversationId;
        if (!getConversationById(get().conversations, conversationId)) {
          conversationId = get().createConversation();
        }

        const existingMessages =
          getConversationById(get().conversations, conversationId)?.messages ?? [];
        const userMessageId = createMessageId();
        const assistantMessageId = createMessageId();
        const requestId = createMessageId();
        const visibleUserMessage: AIMessage = {
          id: userMessageId,
          role: "user",
          content: trimmedUserMessage,
          timestamp: Date.now(),
          attachments,
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
            ...existingMessages,
            {
              role: "user",
              content: trimmedPrompt,
              id: userMessageId,
              timestamp: visibleUserMessage.timestamp,
              attachments,
            },
          ],
          systemPrompt,
        );

        set((state) => {
          const conversation = ensureConversationDraft(state, conversationId);
          const isFirstUserMessage = conversation.messages.length === 0;

          conversation.messages.push(visibleUserMessage, assistantMessage);
          conversation.updatedAt = visibleUserMessage.timestamp;
          if (isFirstUserMessage && conversation.titleSource !== "manual") {
            conversation.title = buildConversationTitleFromMessage(trimmedUserMessage);
            conversation.titleSource = "auto";
          }

          state.activeConversationId = conversation.id;
          state.isStreaming = true;
          state.errorMessage = null;
          state.activeRequestId = requestId;
          state.activeRequestConversationId = conversation.id;
          syncActiveConversationMessages(state);
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
                const requestConversationId =
                  state.activeRequestConversationId ?? conversationId;
                const conversation = state.conversations.find(
                  (item) => item.id === requestConversationId,
                );
                if (!conversation) {
                  return;
                }

                conversation.messages = replaceMessageContent(
                  conversation.messages,
                  assistantMessageId,
                  (current) => current + token,
                );
                conversation.updatedAt = Date.now();
                syncActiveConversationMessages(state);
              });
            },
          });
        } catch (error) {
          const isStillActive = get().activeRequestId === requestId;
          if (isStillActive) {
            set((state) => {
              const requestConversationId =
                state.activeRequestConversationId ?? conversationId;
              const conversation = state.conversations.find(
                (item) => item.id === requestConversationId,
              );
              if (conversation) {
                conversation.messages = trimTrailingEmptyAssistant(conversation.messages);
              }
              syncActiveConversationMessages(state);
              state.errorMessage =
                error instanceof Error ? error.message : String(error);
            });
          }
        } finally {
          if (get().activeRequestId === requestId) {
            set((state) => {
              state.isStreaming = false;
              state.activeRequestId = null;
              state.activeRequestConversationId = null;
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
          attachments: options?.attachments,
        });
      },

      cancelStream: async () => {
        const activeRequestId = get().activeRequestId;
        if (!activeRequestId) {
          return;
        }

        set((state) => {
          const requestConversationId = state.activeRequestConversationId;
          if (requestConversationId) {
            const conversation = state.conversations.find(
              (item) => item.id === requestConversationId,
            );
            if (conversation) {
              conversation.messages = trimTrailingEmptyAssistant(conversation.messages);
            }
          }

          state.isStreaming = false;
          state.activeRequestId = null;
          state.activeRequestConversationId = null;
          syncActiveConversationMessages(state);
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
          const activeConversation = syncActiveConversationMessages(state);
          activeConversation.messages = [];
          if (activeConversation.titleSource !== "manual") {
            activeConversation.title = DEFAULT_CONVERSATION_TITLE;
            activeConversation.titleSource = "auto";
          }
          activeConversation.updatedAt = Date.now();
          syncActiveConversationMessages(state);
          state.errorMessage = null;
        });
      },
    })),
    {
      name: AI_CHAT_STORAGE_KEY,
      storage: aiConversationStorage,
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as
          | Partial<Pick<AIStore, "conversations" | "activeConversationId">>
          | undefined;
        const conversations = sanitizePersistedConversations(persisted?.conversations);
        const activeConversationId = resolveActiveConversationId(
          conversations,
          persisted?.activeConversationId,
        );
        const activeConversation =
          getConversationById(conversations, activeConversationId) ?? conversations[0]!;

        return {
          ...currentState,
          conversations,
          activeConversationId,
          messages: activeConversation.messages,
          isStreaming: false,
          errorMessage: null,
          activeRequestId: null,
          activeRequestConversationId: null,
        };
      },
    },
  ),
);

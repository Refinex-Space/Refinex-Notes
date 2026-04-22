import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Send,
  Square,
  Wand2,
  X,
} from "lucide-react";

import { aiAttachmentService } from "../../services/aiAttachmentService";
import { searchService } from "../../services/searchService";
import { useAIStore } from "../../stores/aiStore";
import { useNoteStore } from "../../stores/noteStore";
import { useSettingsStore } from "../../stores/settingsStore";
import type { AIMessageAttachment } from "../../types/ai";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  buildDocumentMentionSections,
  buildDocumentMentionText,
  flattenDocumentPaths,
  getDocumentMentionTrigger,
  replaceDocumentMentionTrigger,
  searchLoadedDocumentPaths,
} from "./documentMentions";
import { ProviderSelect } from "./ProviderSelect";
import { StreamRenderer } from "./StreamRenderer";

const ATTACHMENT_ACCEPT =
  "image/*,.md,.txt,.json,.js,.jsx,.ts,.tsx,.html,.css,.scss,.rs,.py,.java,.kt,.go,.sh,.yaml,.yml,.toml,.xml,.csv,.sql";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPromptHighlightParts(draft: string, mentionTexts: string[]) {
  if (!draft) {
    return [{ text: "", isMention: false }];
  }

  const uniqueMentionTexts = Array.from(
    new Set(
      mentionTexts
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  ).sort((left, right) => right.length - left.length);

  if (uniqueMentionTexts.length === 0) {
    return [{ text: draft, isMention: false }];
  }

  const pattern = new RegExp(
    `(${uniqueMentionTexts.map((value) => escapeRegExp(value)).join("|")})`,
    "g",
  );
  const parts: Array<{ text: string; isMention: boolean }> = [];
  let lastIndex = 0;

  draft.replace(pattern, (match, _group, offset: number) => {
    if (offset > lastIndex) {
      parts.push({ text: draft.slice(lastIndex, offset), isMention: false });
    }
    parts.push({ text: match, isMention: true });
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < draft.length) {
    parts.push({ text: draft.slice(lastIndex), isMention: false });
  }

  return parts.length > 0 ? parts : [{ text: draft, isMention: false }];
}

function EmptyChatState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center">
        <Wand2 className="h-5 w-5 text-muted" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-fg">Refinex AI</p>
        <p className="text-xs leading-5 text-muted">{message}</p>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div
      data-testid="assistant-thinking"
      className="flex items-center py-2 text-sm text-muted"
    >
      <span className="font-medium tracking-[0.01em] text-fg/82">探索中</span>
      <span className="ml-1 inline-flex items-center gap-1" aria-hidden="true">
        <span
          className="h-1.5 w-1.5 rounded-full bg-accent/65 animate-pulse"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-accent/65 animate-pulse"
          style={{ animationDelay: "180ms" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-accent/65 animate-pulse"
          style={{ animationDelay: "360ms" }}
        />
      </span>
    </div>
  );
}

function buildAttachmentImageSource(attachment: AIMessageAttachment) {
  if (attachment.kind !== "image") {
    return null;
  }

  return `data:${attachment.mimeType};base64,${attachment.base64Data}`;
}

function AttachmentPreviewList({
  attachments,
  removable = false,
  onRemove,
}: {
  attachments: readonly AIMessageAttachment[];
  removable?: boolean;
  onRemove?: (attachmentId: string) => void;
}) {
  if (attachments.length === 0) {
    return null;
  }

  const imageAttachments = attachments.filter((attachment) => attachment.kind === "image");
  const textAttachments = attachments.filter((attachment) => attachment.kind === "text");

  return (
    <div className="flex flex-col gap-1.5">
      {imageAttachments.length > 0 ? (
        <div
          data-testid="attachment-preview-images"
          className="flex flex-wrap gap-1.5"
        >
          {imageAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="group relative h-14 w-14 overflow-hidden rounded-lg border border-border/55 bg-fg/[0.035]"
            >
              <img
                src={buildAttachmentImageSource(attachment) ?? ""}
                alt={attachment.name}
                className="h-full w-full object-cover"
              />
              {removable && onRemove ? (
                <button
                  type="button"
                  aria-label={`移除附件 ${attachment.name}`}
                  onClick={() => onRemove(attachment.id)}
                  className="absolute right-1 top-1 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {textAttachments.length > 0 ? (
        <div
          data-testid="attachment-preview-texts"
          className="flex flex-wrap gap-1.5"
        >
          {textAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="group inline-flex min-w-0 max-w-[min(100%,14rem)] items-center gap-1.5 rounded-full border border-border/60 bg-bg/88 px-2.5 py-1 text-xs text-muted"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-fg/82">{attachment.name}</span>
              {removable && onRemove ? (
                <button
                  type="button"
                  aria-label={`移除附件 ${attachment.name}`}
                  onClick={() => onRemove(attachment.id)}
                  className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition hover:text-fg group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MessageBubble({
  role,
  content,
  attachments,
  isStreaming,
}: {
  role: "user" | "assistant";
  content: string;
  attachments?: AIMessageAttachment[];
  isStreaming: boolean;
}) {
  if (role === "user") {
    return (
      <div
        data-testid="user-message-group"
        className="ml-auto flex max-w-[85%] flex-col items-end gap-2"
      >
        {attachments && attachments.length > 0 ? (
          <div
            data-testid="user-message-attachments"
            className="max-w-full"
          >
            <AttachmentPreviewList attachments={attachments} />
          </div>
        ) : null}
        {content.trim().length > 0 ? (
          <div
            data-testid="user-message"
            className="rounded-[1.2rem] rounded-br-md bg-accent px-4 py-3 text-sm leading-6 text-white shadow-sm"
          >
            <p className="whitespace-pre-wrap break-words">{content}</p>
          </div>
        ) : null}
      </div>
    );
  }

  if (isStreaming && content.trim().length === 0) {
    return (
      <div data-testid="assistant-message" className="w-full py-1">
        <ThinkingIndicator />
      </div>
    );
  }

  return (
    <div data-testid="assistant-message" className="w-full py-1">
      <StreamRenderer
        content={content}
        isStreaming={isStreaming}
        showCursor={isStreaming}
      />
    </div>
  );
}

export function ChatPanel() {
  const [draft, setDraft] = useState("");
  const [conversationListOpen, setConversationListOpen] = useState(false);
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<AIMessageAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [includeCurrentDocumentContext, setIncludeCurrentDocumentContext] =
    useState(false);
  const [attachedDocumentMentions, setAttachedDocumentMentions] = useState<
    Array<{ path: string; text: string }>
  >([]);
  const [caretPosition, setCaretPosition] = useState(0);
  const [mentionCandidatePaths, setMentionCandidatePaths] = useState<string[]>([]);
  const [mentionExpanded, setMentionExpanded] = useState(false);
  const [highlightedMentionIndex, setHighlightedMentionIndex] = useState(0);
  const [dismissedMentionKey, setDismissedMentionKey] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    conversations,
    activeConversationId,
    providers,
    modelsByProvider,
    activeProvider,
    activeModel,
    messages,
    isStreaming,
    isLoadingProviders,
    errorMessage,
    loadProviders,
    loadModels,
    selectProvider,
    selectModel,
    sendMessage,
    cancelStream,
    createConversation,
    switchConversation,
    renameConversation,
    deleteConversation,
  } = useAIStore((state) => state);
  const defaultProviderId = useSettingsStore(
    (state) => state.settings.ai.defaultProviderId,
  );
  const defaultModelId = useSettingsStore(
    (state) => state.settings.ai.defaultModelId,
  );
  const currentDocument = useNoteStore((state) =>
    state.currentFile ? state.documents[state.currentFile] ?? null : null,
  );
  const fileTree = useNoteStore((state) => state.files);
  const openFiles = useNoteStore((state) => state.openFiles);
  const recentFiles = useNoteStore((state) => state.recentFiles);
  const requestedCatalogRef = useRef<Set<string>>(new Set());

  const deferredMessages = useDeferredValue(messages);
  const sortedConversations = useMemo(
    () => [...conversations].sort((left, right) => right.updatedAt - left.updatedAt),
    [conversations],
  );
  const currentConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeConversationId) ??
      conversations[0] ??
      null,
    [activeConversationId, conversations],
  );

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    startTransition(() => {
      setDraft("");
      setCaretPosition(0);
      setAttachedDocumentMentions([]);
      setPendingAttachments([]);
      setMentionExpanded(false);
      setDismissedMentionKey(null);
    });
    setConversationListOpen(false);
    setConversationMenuOpen(false);
    setAttachmentError(null);
  }, [activeConversationId]);

  useEffect(() => {
    if (!defaultProviderId) {
      return;
    }

    if (!providers.some((provider) => provider.id === defaultProviderId)) {
      return;
    }

    void Promise.resolve(selectProvider(defaultProviderId)).then(() => {
      if (defaultModelId) {
        selectModel(defaultModelId);
      }
    });
  }, [defaultModelId, defaultProviderId, providers, selectModel, selectProvider]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
  }, [deferredMessages, isStreaming]);

  useEffect(() => {
    providers.forEach((provider) => {
      if (modelsByProvider[provider.id]?.length || requestedCatalogRef.current.has(provider.id)) {
        return;
      }

      requestedCatalogRef.current.add(provider.id);
      void loadModels(provider.id).catch(() => {
        requestedCatalogRef.current.delete(provider.id);
      });
    });
  }, [loadModels, modelsByProvider, providers]);

  useEffect(() => {
    setIncludeCurrentDocumentContext(Boolean(currentDocument));
    if (!currentDocument?.path) {
      return;
    }

    setAttachedDocumentMentions((mentions) =>
      mentions.filter((item) => item.path !== currentDocument.path),
    );
  }, [currentDocument?.path]);

  const loadedDocumentPaths = useMemo(
    () => flattenDocumentPaths(fileTree),
    [fileTree],
  );
  const defaultMentionCandidatePaths = useMemo(
    () =>
      Array.from(
        new Set([...openFiles, ...recentFiles, ...loadedDocumentPaths]),
      ).filter((path) => path !== currentDocument?.path),
    [currentDocument?.path, loadedDocumentPaths, openFiles, recentFiles],
  );
  const mentionTrigger = useMemo(
    () => getDocumentMentionTrigger(draft, caretPosition),
    [caretPosition, draft],
  );
  const mentionKey = mentionTrigger
    ? `${mentionTrigger.start}:${mentionTrigger.end}:${mentionTrigger.query}`
    : null;

  useEffect(() => {
    setMentionExpanded(false);
    setHighlightedMentionIndex(0);
    setDismissedMentionKey(null);
  }, [mentionKey]);

  useEffect(() => {
    if (!mentionTrigger) {
      setMentionCandidatePaths([]);
      return;
    }

    const query = mentionTrigger.query.trim();
    const localResults = query
      ? searchLoadedDocumentPaths(loadedDocumentPaths, query)
      : defaultMentionCandidatePaths;

    if (!query || !searchService.isNativeAvailable()) {
      setMentionCandidatePaths(localResults);
      return;
    }

    let disposed = false;
    void searchService
      .searchFiles(query)
      .then((results) => {
        if (disposed) {
          return;
        }

        const resolvedPaths = Array.from(new Set(results.map((result) => result.path)));
        setMentionCandidatePaths(resolvedPaths.length > 0 ? resolvedPaths : localResults);
      })
      .catch(() => {
        if (!disposed) {
          setMentionCandidatePaths(localResults);
        }
      });

    return () => {
      disposed = true;
    };
  }, [defaultMentionCandidatePaths, loadedDocumentPaths, mentionTrigger]);

  const mentionSections = useMemo(
    () =>
      buildDocumentMentionSections({
        currentDocumentPath: currentDocument?.path,
        currentDocumentTitle: currentDocument?.name.replace(/\.md$/i, "") ?? null,
        candidatePaths: mentionCandidatePaths,
        attachedDocumentPaths: attachedDocumentMentions.map((item) => item.path),
        expanded: mentionExpanded,
      }),
    [
      attachedDocumentMentions,
      currentDocument?.name,
      currentDocument?.path,
      mentionCandidatePaths,
      mentionExpanded,
    ],
  );

  const mentionMenuItems = useMemo(
    () => [
      ...(mentionSections.currentPage
        ? [{ type: "document" as const, option: mentionSections.currentPage }]
        : []),
      ...mentionSections.visibleLinkedPages.map((option) => ({
        type: "document" as const,
        option,
      })),
      ...(mentionSections.hiddenCount > 0
        ? [{ type: "expand" as const, hiddenCount: mentionSections.hiddenCount }]
        : []),
    ],
    [mentionSections.currentPage, mentionSections.hiddenCount, mentionSections.visibleLinkedPages],
  );

  const mentionMenuOpen =
    Boolean(mentionTrigger) &&
    mentionMenuItems.length > 0 &&
    dismissedMentionKey !== mentionKey;
  const promptHighlightParts = useMemo(
    () =>
      buildPromptHighlightParts(
        draft,
        attachedDocumentMentions.map((item) => item.text),
      ),
    [attachedDocumentMentions, draft],
  );

  const activeAttachedDocumentPaths = useMemo(
    () =>
      attachedDocumentMentions
        .filter((item) => draft.includes(item.text))
        .map((item) => item.path),
    [attachedDocumentMentions, draft],
  );

  useEffect(() => {
    if (!mentionMenuOpen) {
      setHighlightedMentionIndex(0);
      return;
    }

    setHighlightedMentionIndex((index) =>
      Math.max(0, Math.min(index, mentionMenuItems.length - 1)),
    );
  }, [mentionMenuItems.length, mentionMenuOpen]);

  const canSend =
    (draft.trim().length > 0 || pendingAttachments.length > 0) &&
    !isStreaming &&
    !isLoadingProviders &&
    Boolean(activeProvider && activeModel);

  const emptyMessage = useMemo(() => {
    if (isLoadingProviders) {
      return "正在从原生层加载 Provider 与模型目录…";
    }

    if (providers.length === 0) {
      return "当前没有可用的 AI Provider，请先在设置页配置并启用。";
    }

    return "今天有什么可以帮你的吗？";
  }, [isLoadingProviders, providers.length]);

  const handleSubmit = async () => {
    const content = draft.trim();
    if (!content && pendingAttachments.length === 0) {
      return;
    }

    startTransition(() => {
      setDraft("");
      setPendingAttachments([]);
      setAttachmentError(null);
    });
    await sendMessage(content, {
      includeCurrentDocument: includeCurrentDocumentContext,
      attachedDocumentPaths: activeAttachedDocumentPaths,
      attachments: pendingAttachments,
    });
  };

  const handleModelSelect = async (providerId: string, modelId: string) => {
    if (providerId !== activeProvider) {
      await selectProvider(providerId);
    }
    selectModel(modelId);
  };

  const syncCaretPosition = () => {
    setCaretPosition(textareaRef.current?.selectionStart ?? 0);
  };

  const applyMentionSelection = (item: (typeof mentionMenuItems)[number]) => {
    if (!mentionTrigger) {
      return;
    }

    if (item.type === "expand") {
      setMentionExpanded(true);
      return;
    }

    const mentionText = buildDocumentMentionText(item.option.path);
    const nextDraft = replaceDocumentMentionTrigger(
      draft,
      mentionTrigger,
      `${mentionText} `,
    );
    startTransition(() => {
      setDraft(nextDraft.value);
      setCaretPosition(nextDraft.caretPosition);
      setMentionExpanded(false);
      setDismissedMentionKey(null);
      if (item.option.isCurrentDocument) {
        setIncludeCurrentDocumentContext(true);
      } else {
        setAttachedDocumentMentions((mentions) =>
          mentions.some((entry) => entry.path === item.option.path)
            ? mentions
            : [...mentions, { path: item.option.path, text: mentionText }],
        );
      }
    });

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(
        nextDraft.caretPosition,
        nextDraft.caretPosition,
      );
    });
  };

  const handleCreateConversation = () => {
    createConversation();
  };

  const handleRenameConversation = () => {
    if (!currentConversation) {
      return;
    }

    setRenameDraft(currentConversation.title);
    setRenameDialogOpen(true);
    setConversationMenuOpen(false);
  };

  const handleConfirmRenameConversation = () => {
    if (!currentConversation) {
      return;
    }

    renameConversation(currentConversation.id, renameDraft);
    setRenameDialogOpen(false);
  };

  const handleRemovePendingAttachment = (attachmentId: string) => {
    setPendingAttachments((attachments) =>
      attachments.filter((attachment) => attachment.id !== attachmentId),
    );
  };

  const handleAttachmentSelection = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const selectedFiles = Array.from(files);
    if (
      pendingAttachments.length + selectedFiles.length >
      aiAttachmentService.maxAttachmentCount
    ) {
      setAttachmentError(
        `一次最多只能添加 ${aiAttachmentService.maxAttachmentCount} 个附件`,
      );
      return;
    }

    try {
      const attachments = await aiAttachmentService.createAttachments(selectedFiles);
      setPendingAttachments((current) => [...current, ...attachments]);
      setAttachmentError(null);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0))]">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Popover open={conversationListOpen} onOpenChange={setConversationListOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="打开会话列表"
                className="inline-flex min-w-0 max-w-[min(100%,18rem)] items-center gap-2 rounded-full bg-fg/[0.06] px-3 py-2 text-left transition hover:bg-fg/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isStreaming}
              >
                <span className="min-w-0 truncate text-sm font-semibold text-fg">
                  {currentConversation?.title ?? "新会话"}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              className="w-[min(24rem,calc(100vw-2rem))] p-2"
            >
              <div className="max-h-[18rem] overflow-y-auto">
                {sortedConversations.map((conversation) => {
                  const isActive = conversation.id === currentConversation?.id;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      aria-label={`切换会话 ${conversation.title}`}
                      onClick={() => {
                        switchConversation(conversation.id);
                        setConversationListOpen(false);
                      }}
                      className={[
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                        isActive ? "bg-fg/[0.06]" : "hover:bg-fg/[0.04]",
                      ].join(" ")}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                        {conversation.title}
                      </span>
                      {isActive ? (
                        <Check className="h-4 w-4 shrink-0 text-accent" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="新建会话"
              onClick={handleCreateConversation}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-[rgb(var(--color-bg)/0.7)] text-muted transition hover:border-border hover:bg-fg/[0.04] hover:text-fg disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isStreaming}
            >
              <Plus className="h-4 w-4" />
            </button>

            <Popover open={conversationMenuOpen} onOpenChange={setConversationMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="打开会话菜单"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-[rgb(var(--color-bg)/0.7)] text-muted transition hover:border-border hover:bg-fg/[0.04] hover:text-fg disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isStreaming || !currentConversation}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-1.5">
                <button
                  type="button"
                  aria-label="重命名当前会话"
                  onClick={handleRenameConversation}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg transition hover:bg-fg/[0.04]"
                >
                  <Pencil className="h-4 w-4 text-muted" />
                  <span>重命名</span>
                </button>
                <button
                  type="button"
                  aria-label="删除当前会话"
                  onClick={() => {
                    if (!currentConversation) {
                      return;
                    }
                    deleteConversation(currentConversation.id);
                    setConversationMenuOpen(false);
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-rose-500/10"
                >
                  <X className="h-4 w-4" />
                  <span>删除</span>
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {deferredMessages.length === 0 ? (
          <EmptyChatState message={emptyMessage} />
        ) : (
          <div
            ref={viewportRef}
            className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-4 py-4"
          >
            {deferredMessages.map((message, index) => {
              const isLastAssistant =
                message.role === "assistant" &&
                index === deferredMessages.length - 1 &&
                isStreaming;

              return (
                <MessageBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  attachments={message.attachments}
                  isStreaming={isLastAssistant}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 py-4">
        <Dialog
          open={renameDialogOpen}
          onOpenChange={(open) => {
            setRenameDialogOpen(open);
            if (!open) {
              setRenameDraft("");
            }
          }}
        >
          <DialogContent className="w-[min(28rem,calc(100vw-2rem))] p-6">
            <DialogHeader>
              <DialogTitle>重命名会话</DialogTitle>
              <DialogDescription>
                更新当前 AI 会话标题，方便后续从历史会话继续聊天。
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <input
                aria-label="会话名称"
                value={renameDraft}
                onChange={(event) => setRenameDraft(event.target.value)}
                className="w-full rounded-xl border border-border/70 bg-bg px-3 py-2.5 text-sm text-fg outline-none transition focus:border-accent/60"
                placeholder="输入会话名称"
                maxLength={80}
              />
            </div>
            <DialogFooter className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameDialogOpen(false)}
                className="rounded-xl border border-border/70 px-3 py-2 text-sm text-muted transition hover:bg-fg/[0.04] hover:text-fg"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmRenameConversation}
                className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white transition hover:brightness-110"
              >
                保存
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {attachmentError ?? errorMessage ? (
          <div className="mb-3 rounded-xl border border-rose-300/35 bg-rose-500/8 px-3 py-2 text-xs leading-5 text-rose-300">
            {attachmentError ?? errorMessage}
          </div>
        ) : null}

        <div className="relative rounded-[1.25rem] border border-border/70 bg-[rgb(var(--color-bg)/0.92)] p-3 shadow-sm">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            className="hidden"
            onChange={(event) => {
              void handleAttachmentSelection(event.target.files);
              event.target.value = "";
            }}
          />

          {mentionMenuOpen ? (
            <div className="absolute inset-x-3 bottom-[calc(100%+0.75rem)] z-20 rounded-[1.1rem] border border-border/80 bg-[rgb(var(--color-bg)/0.98)] p-2 shadow-panel">
              <div className="max-h-[18rem] overflow-y-auto">
                {mentionSections.currentPage ? (
                  <>
                    <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                      当前页面
                    </div>
                    <button
                      type="button"
                      aria-label={`引用当前页面 ${mentionSections.currentPage.title}`}
                      onMouseEnter={() => setHighlightedMentionIndex(0)}
                      onClick={() => applyMentionSelection(mentionMenuItems[0]!)}
                      className={[
                        "mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                        highlightedMentionIndex === 0
                          ? "bg-fg/[0.06]"
                          : "hover:bg-fg/[0.04]",
                      ].join(" ")}
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fg/[0.04]">
                        <FileText className="h-4 w-4 text-muted" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">
                          {mentionSections.currentPage.title}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {includeCurrentDocumentContext
                            ? "已作为实时上下文"
                            : "选择后加入实时上下文"}
                        </span>
                      </span>
                    </button>
                  </>
                ) : null}

                <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  链接到页面
                </div>

                {mentionSections.visibleLinkedPages.map((option, index) => {
                  const itemIndex = mentionSections.currentPage ? index + 1 : index;

                  return (
                    <button
                      key={option.path}
                      type="button"
                      aria-label={`引用文档 ${option.title}`}
                      onMouseEnter={() => setHighlightedMentionIndex(itemIndex)}
                      onClick={() => applyMentionSelection(mentionMenuItems[itemIndex]!)}
                      className={[
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                        highlightedMentionIndex === itemIndex
                          ? "bg-fg/[0.06]"
                          : "hover:bg-fg/[0.04]",
                      ].join(" ")}
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fg/[0.04]">
                        <FileText className="h-4 w-4 text-muted" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">
                          {option.title}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {option.subtitle}
                        </span>
                      </span>
                    </button>
                  );
                })}

                {mentionSections.hiddenCount > 0 ? (
                  <button
                    type="button"
                    aria-label={`展开其余 ${mentionSections.hiddenCount} 个结果`}
                    onMouseEnter={() =>
                      setHighlightedMentionIndex(mentionMenuItems.length - 1)
                    }
                    onClick={() =>
                      applyMentionSelection(mentionMenuItems[mentionMenuItems.length - 1]!)
                    }
                    className={[
                      "mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-muted transition",
                      highlightedMentionIndex === mentionMenuItems.length - 1
                        ? "bg-fg/[0.06] text-fg"
                        : "hover:bg-fg/[0.04] hover:text-fg",
                    ].join(" ")}
                  >
                    <ChevronRight className="h-4 w-4 shrink-0" />
                    <span>其余 {mentionSections.hiddenCount} 个结果</span>
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {currentDocument && includeCurrentDocumentContext ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {currentDocument && includeCurrentDocumentContext ? (
                <div className="group inline-flex min-w-0 max-w-[min(100%,28rem)] items-center gap-2 rounded-full border border-border/70 bg-bg/90 px-3 py-1.5 text-sm text-muted transition hover:border-border hover:bg-bg">
                  <FileText className="h-4 w-4 shrink-0 text-muted" />
                  <span className="min-w-0 truncate font-medium text-fg/80">
                    {currentDocument.name.replace(/\.md$/i, "")}
                  </span>
                  <button
                    type="button"
                    aria-label="移除当前文档上下文"
                    onClick={() => setIncludeCurrentDocumentContext(false)}
                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition hover:text-fg group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {pendingAttachments.length > 0 ? (
            <div className="mb-3">
              <AttachmentPreviewList
                attachments={pendingAttachments}
                removable
                onRemove={handleRemovePendingAttachment}
              />
            </div>
          ) : null}

          <div className="relative">
            {draft ? (
              <div
                data-testid="prompt-highlight"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-sm leading-6 text-fg"
              >
                {promptHighlightParts.map((part, index) =>
                  part.isMention ? (
                    <span
                      key={`${part.text}-${index}`}
                      data-mention-highlight={part.text}
                      className="rounded-[0.5rem] bg-accent/[0.12] text-accent shadow-[inset_0_0_0_1px_rgba(var(--color-accent),0.14)]"
                    >
                      {part.text}
                    </span>
                  ) : (
                    <span key={`${part.text}-${index}`}>{part.text}</span>
                  ),
                )}
              </div>
            ) : null}

            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setCaretPosition(event.target.selectionStart ?? event.target.value.length);
              }}
              onClick={syncCaretPosition}
              onKeyUp={syncCaretPosition}
              onKeyDown={(event) => {
                if (mentionMenuOpen) {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setHighlightedMentionIndex((index) =>
                      mentionMenuItems.length === 0
                        ? 0
                        : (index + 1) % mentionMenuItems.length,
                    );
                    return;
                  }

                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setHighlightedMentionIndex((index) =>
                      mentionMenuItems.length === 0
                        ? 0
                        : (index - 1 + mentionMenuItems.length) % mentionMenuItems.length,
                    );
                    return;
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    setDismissedMentionKey(mentionKey);
                    return;
                  }

                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    const item = mentionMenuItems[highlightedMentionIndex];
                    if (item) {
                      applyMentionSelection(item);
                    }
                    return;
                  }
                }

                if (event.key !== "Enter" || event.shiftKey) {
                  return;
                }
                event.preventDefault();
                void handleSubmit();
              }}
              placeholder="使用 AI 处理各种任务 …"
              className={[
                "relative min-h-[88px] w-full resize-none border-0 bg-transparent text-sm leading-6 outline-none placeholder:text-muted",
                draft
                  ? "text-transparent caret-fg selection:bg-accent/20"
                  : "text-fg",
              ].join(" ")}
              disabled={isLoadingProviders}
            />
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div
              data-testid="composer-actions-left"
              className="flex shrink-0 items-center"
            >
              <button
                type="button"
                aria-label="添加附件"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || isLoadingProviders}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-fg/[0.05] hover:text-fg disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Paperclip className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div
              data-testid="composer-actions-right"
              className="ml-auto flex min-w-0 items-center justify-end gap-2"
            >
              <ProviderSelect
                providers={providers}
                modelsByProvider={modelsByProvider}
                activeProvider={activeProvider}
                activeModel={activeModel}
                onSelect={handleModelSelect}
                disabled={isStreaming || isLoadingProviders}
              />

              <button
                type="button"
                aria-label={isStreaming ? "停止生成" : "发送消息"}
                onClick={() => {
                  if (isStreaming) {
                    void cancelStream();
                    return;
                  }
                  void handleSubmit();
                }}
                disabled={isLoadingProviders || (!isStreaming && !canSend)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingProviders ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isStreaming ? (
                  <Square className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

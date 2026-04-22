import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2, Send, Square, Trash2, Wand2 } from "lucide-react";

import { useAIStore } from "../../stores/aiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { ProviderSelect } from "./ProviderSelect";
import { StreamRenderer } from "./StreamRenderer";

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

function MessageBubble({
  role,
  content,
  isStreaming,
}: {
  role: "user" | "assistant";
  content: string;
  isStreaming: boolean;
}) {
  if (role === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-[1.2rem] rounded-br-md bg-accent px-4 py-3 text-sm leading-6 text-white shadow-sm">
        <p className="whitespace-pre-wrap break-words">{content}</p>
      </div>
    );
  }

  return (
    <div className="mr-auto max-w-[88%] rounded-[1.2rem] rounded-bl-md border border-border/70 bg-[rgb(var(--color-bg)/0.9)] px-4 py-3 shadow-sm">
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
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const {
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
    clearHistory,
  } = useAIStore((state) => state);
  const defaultProviderId = useSettingsStore(
    (state) => state.settings.ai.defaultProviderId,
  );
  const defaultModelId = useSettingsStore(
    (state) => state.settings.ai.defaultModelId,
  );
  const requestedCatalogRef = useRef<Set<string>>(new Set());

  const deferredMessages = useDeferredValue(messages);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

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

  const canSend =
    draft.trim().length > 0 &&
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
    if (!content) {
      return;
    }

    startTransition(() => {
      setDraft("");
    });
    await sendMessage(content);
  };

  const handleModelSelect = async (providerId: string, modelId: string) => {
    if (providerId !== activeProvider) {
      await selectProvider(providerId);
    }
    selectModel(modelId);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0))]">
      <div className="px-4 py-3">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={clearHistory}
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-[rgb(var(--color-bg)/0.7)] px-3 py-2 text-xs font-medium text-muted transition hover:border-border hover:bg-fg/[0.04] hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isStreaming || messages.length === 0}
          >
            <Trash2 className="h-3.5 w-3.5" />
            清空历史
          </button>
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
                  isStreaming={isLastAssistant}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 py-4">
        {errorMessage ? (
          <div className="mb-3 rounded-xl border border-rose-300/35 bg-rose-500/8 px-3 py-2 text-xs leading-5 text-rose-300">
            {errorMessage}
          </div>
        ) : null}

        <div className="rounded-[1.25rem] border border-border/70 bg-[rgb(var(--color-bg)/0.92)] p-3 shadow-sm">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) {
                return;
              }
              event.preventDefault();
              void handleSubmit();
            }}
            placeholder="使用 AI 处理各种任务 …"
            className="min-h-[88px] w-full resize-none border-0 bg-transparent text-sm leading-6 text-fg outline-none placeholder:text-muted"
            disabled={isLoadingProviders}
          />

          <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
            <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={() => {
                    void cancelStream();
                  }}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm text-fg transition hover:bg-fg/[0.05]"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  停止生成
                </button>
              ) : null}

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
                aria-label="发送消息"
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={!canSend}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingProviders ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
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

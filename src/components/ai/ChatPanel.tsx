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
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-fg/[0.04]">
        <Wand2 className="h-5 w-5 text-muted" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-fg">AI 写作助手</p>
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

  const deferredMessages = useDeferredValue(messages);
  const models = useMemo(
    () => (activeProvider ? modelsByProvider[activeProvider] ?? [] : []),
    [activeProvider, modelsByProvider],
  );

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

    void selectProvider(defaultProviderId).then(() => {
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

    return "选择模型后，基于当前文档与工作区上下文开始对话。";
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0))]">
      <div className="border-b border-border/70 px-4 py-4">
        <ProviderSelect
          providers={providers}
          models={models}
          activeProvider={activeProvider}
          activeModel={activeModel}
          onProviderChange={selectProvider}
          onModelChange={selectModel}
          disabled={isStreaming || isLoadingProviders}
        />
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

      <div className="border-t border-border/70 px-4 py-4">
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
            placeholder="问我当前文档、改写、总结，或基于工作区继续展开…"
            className="min-h-[88px] w-full resize-none border-0 bg-transparent text-sm leading-6 text-fg outline-none placeholder:text-muted"
            disabled={isLoadingProviders}
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={clearHistory}
              className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted transition hover:bg-fg/[0.05] hover:text-fg disabled:opacity-50"
              disabled={isStreaming || messages.length === 0}
            >
              <Trash2 className="h-3.5 w-3.5" />
              清空历史
            </button>

            <div className="flex items-center gap-2">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={() => {
                    void cancelStream();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm text-fg transition hover:bg-fg/[0.05]"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  停止生成
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={!canSend}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingProviders ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                发送
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

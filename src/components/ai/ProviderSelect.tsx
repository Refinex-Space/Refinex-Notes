import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import anthropicIcon from "../../assets/provider-icons/claude.svg";
import deepseekIcon from "../../assets/provider-icons/deepseek.svg";
import kimiIcon from "../../assets/provider-icons/kimi.svg";
import minimaxIcon from "../../assets/provider-icons/minimax.svg";
import openaiIcon from "../../assets/provider-icons/openai.svg";
import qwenIcon from "../../assets/provider-icons/qwen.svg";
import glmIcon from "../../assets/provider-icons/zdotai.svg";
import type { AIModelInfo, AIProviderInfo } from "../../types/ai";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const PROVIDER_KIND_ICONS: Record<string, string> = {
  anthropic: anthropicIcon,
  openai: openaiIcon,
  deepseek: deepseekIcon,
  qwen: qwenIcon,
  glm: glmIcon,
  kimi: kimiIcon,
  minimax: minimaxIcon,
};

function getProviderIcon(provider: AIProviderInfo | undefined) {
  if (!provider) {
    return null;
  }

  return PROVIDER_KIND_ICONS[provider.providerKind] ?? null;
}

function getActiveModelLabel(
  modelsByProvider: Record<string, AIModelInfo[]>,
  activeProvider: string | null,
  activeModel: string | null,
) {
  if (!activeProvider) {
    return "选择模型";
  }

  const models = modelsByProvider[activeProvider] ?? [];
  return (
    models.find((model) => model.modelId === activeModel)?.label ??
    models[0]?.label ??
    "选择模型"
  );
}

export function ProviderSelect({
  providers,
  modelsByProvider,
  activeProvider,
  activeModel,
  onSelect,
  disabled = false,
}: {
  providers: readonly AIProviderInfo[];
  modelsByProvider: Record<string, AIModelInfo[]>;
  activeProvider: string | null;
  activeModel: string | null;
  onSelect: (providerId: string, modelId: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);

  const activeProviderRecord = useMemo(
    () => providers.find((provider) => provider.id === activeProvider),
    [activeProvider, providers],
  );
  const activeModelLabel = useMemo(
    () => getActiveModelLabel(modelsByProvider, activeProvider, activeModel),
    [activeModel, activeProvider, modelsByProvider],
  );

  const groupedOptions = useMemo(
    () =>
      providers.map((provider) => ({
        provider,
        models: modelsByProvider[provider.id] ?? [],
      })),
    [modelsByProvider, providers],
  );

  const triggerIcon = getProviderIcon(activeProviderRecord);

  const handleSelect = async (providerId: string, modelId: string) => {
    const selectionId = `${providerId}:${modelId}`;
    setPendingSelection(selectionId);
    try {
      await onSelect(providerId, modelId);
      setOpen(false);
    } finally {
      setPendingSelection(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="选择当前 AI 模型"
          disabled={disabled || providers.length === 0}
          className={[
            "group inline-flex h-10 max-w-[14rem] min-w-0 items-center gap-2 rounded-full px-3 text-sm text-fg transition",
            "bg-transparent hover:bg-fg/[0.06] data-[state=open]:bg-fg/[0.06]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
            "disabled:cursor-not-allowed disabled:opacity-50",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fg/[0.04]">
            {triggerIcon ? (
              <img
                src={triggerIcon}
                alt=""
                aria-hidden="true"
                className="h-3.5 w-3.5 object-contain"
              />
            ) : (
              <span className="text-[10px] font-semibold uppercase text-muted">
                AI
              </span>
            )}
          </span>
          <span className="truncate font-medium">{activeModelLabel}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted transition group-hover:text-fg" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        sideOffset={12}
        className="w-[22rem] rounded-[1.25rem] p-1.5"
      >
        <div className="space-y-1">
          {groupedOptions.map(({ provider, models }) => {
            const providerIcon = getProviderIcon(provider);

            return (
              <section
                key={provider.id}
                className="rounded-[1rem] border border-transparent px-1 py-1"
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fg/[0.04]">
                    {providerIcon ? (
                      <img
                        src={providerIcon}
                        alt=""
                        aria-hidden="true"
                        className="h-3.5 w-3.5 object-contain"
                      />
                    ) : null}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                    {provider.name}
                  </span>
                </div>

                <div className="space-y-1">
                  {models.length > 0 ? (
                    models.map((model) => {
                      const isSelected =
                        provider.id === activeProvider &&
                        model.modelId === activeModel;
                      const selectionId = `${provider.id}:${model.modelId}`;

                      return (
                        <button
                          key={model.modelId}
                          type="button"
                          onClick={() => {
                            void handleSelect(provider.id, model.modelId);
                          }}
                          disabled={disabled || pendingSelection !== null}
                          className={[
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                            isSelected
                              ? "bg-accent/10 text-fg"
                              : "hover:bg-fg/[0.05] text-fg",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                            "disabled:cursor-not-allowed disabled:opacity-60",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {model.label}
                            </span>
                            <span className="block truncate text-xs text-muted">
                              {model.modelId}
                            </span>
                          </span>
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                            {pendingSelection === selectionId ? (
                              <span className="h-2 w-2 rounded-full bg-accent" />
                            ) : isSelected ? (
                              <Check className="h-4 w-4 text-accent" />
                            ) : null}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-xs leading-5 text-muted">
                      暂无可用模型
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

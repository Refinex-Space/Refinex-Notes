import { Eye, EyeOff, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import anthropicIcon from "../../assets/provider-icons/claude.svg";
import deepseekIcon from "../../assets/provider-icons/deepseek.svg";
import kimiIcon from "../../assets/provider-icons/kimi.svg";
import minimaxIcon from "../../assets/provider-icons/minimax.svg";
import openaiIcon from "../../assets/provider-icons/openai.svg";
import qwenIcon from "../../assets/provider-icons/qwen.svg";
import glmIcon from "../../assets/provider-icons/zdotai.svg";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { useSettingsStore } from "../../stores/settingsStore";

const PROVIDER_KIND_ICONS: Record<string, string> = {
  anthropic: anthropicIcon,
  openai: openaiIcon,
  deepseek: deepseekIcon,
  qwen: qwenIcon,
  glm: glmIcon,
  kimi: kimiIcon,
  minimax: minimaxIcon,
};

function providerKindLabel(kind: string) {
  switch (kind) {
    case "anthropic":
      return "Anthropic";
    case "openai":
      return "OpenAI";
    case "deepseek":
      return "DeepSeek";
    case "qwen":
      return "Qwen";
    case "glm":
      return "GLM";
    case "kimi":
      return "Kimi";
    case "minimax":
      return "MiniMax";
    case "custom-openai-compatible":
      return "自定义";
    default:
      return kind;
  }
}

function ProviderKindBadge({ kind }: { kind: string }) {
  const icon = PROVIDER_KIND_ICONS[kind];

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
      {icon ? (
        <img
          src={icon}
          alt=""
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 object-contain"
        />
      ) : null}
      <span>{providerKindLabel(kind)}</span>
    </span>
  );
}

function ProviderCard({ providerId }: { providerId: string }) {
  const [showSecret, setShowSecret] = useState(false);
  const provider = useSettingsStore((state) =>
    state.providerDrafts.find((entry) => entry.id === providerId),
  );
  const models = useSettingsStore(
    (state) => state.modelsByProvider[providerId] ?? [],
  );
  const apiKeyDraft = useSettingsStore(
    (state) => state.apiKeyDrafts[providerId] ?? { value: "", isDirty: false },
  );
  const settings = useSettingsStore((state) => state.settings);
  const updateProviderDraft = useSettingsStore(
    (state) => state.updateProviderDraft,
  );
  const setProviderApiKeyDraft = useSettingsStore(
    (state) => state.setProviderApiKeyDraft,
  );
  const addProviderModel = useSettingsStore((state) => state.addProviderModel);
  const updateProviderModel = useSettingsStore(
    (state) => state.updateProviderModel,
  );
  const removeProviderModel = useSettingsStore(
    (state) => state.removeProviderModel,
  );
  const setDefaultProviderAndModel = useSettingsStore(
    (state) => state.setDefaultProviderAndModel,
  );
  const removeCustomProvider = useSettingsStore(
    (state) => state.removeCustomProvider,
  );
  const testProviderConnection = useSettingsStore(
    (state) => state.testProviderConnection,
  );
  const testingProviderId = useSettingsStore(
    (state) => state.testingProviderId,
  );
  const lastTestResult = useSettingsStore((state) => state.lastTestResult);

  if (!provider) {
    return null;
  }

  const isDefaultProvider = settings.ai.defaultProviderId === provider.id;
  const testedSuccessfully =
    lastTestResult?.providerId === provider.id && lastTestResult.ready;

  return (
    <article className="space-y-4 rounded-[1.75rem] border border-border/70 bg-bg/80 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ProviderKindBadge kind={provider.providerKind} />
            {isDefaultProvider ? (
              <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
                默认 Provider
              </span>
            ) : null}
            {testedSuccessfully ? (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-500">
                最近测试通过
              </span>
            ) : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                名称
              </span>
              <input
                value={provider.name}
                readOnly={!provider.isCustom}
                onChange={(event) =>
                  updateProviderDraft(provider.id, { name: event.target.value })
                }
                className="h-11 w-full rounded-xl border border-border/70 bg-bg/90 px-3 text-sm text-fg outline-none transition focus-visible:ring-2 focus-visible:ring-accent/35 read-only:cursor-default read-only:bg-fg/[0.04]"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                API Base URL
              </span>
              <input
                value={provider.baseUrl ?? ""}
                onChange={(event) =>
                  updateProviderDraft(provider.id, {
                    baseUrl: event.target.value,
                  })
                }
                className="h-11 w-full rounded-xl border border-border/70 bg-bg/90 px-3 text-sm text-fg outline-none transition focus-visible:ring-2 focus-visible:ring-accent/35"
                placeholder="https://api.example.com/v1"
              />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start">
          <div className="flex items-center gap-2 rounded-full border border-border/70 px-3 py-2 text-xs font-medium text-muted">
            <span>{provider.enabled ? "已启用" : "已禁用"}</span>
            <Switch
              checked={provider.enabled}
              onCheckedChange={(enabled) =>
                updateProviderDraft(provider.id, { enabled })
              }
            />
          </div>
          {provider.isCustom ? (
            <button
              type="button"
              onClick={() => removeCustomProvider(provider.id)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-400/25 bg-rose-400/10 text-rose-500 transition hover:bg-rose-400/15"
              aria-label="删除自定义 Provider"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            API Key
          </span>
          <div className="relative">
            <input
              value={apiKeyDraft.value}
              type={showSecret ? "text" : "password"}
              onChange={(event) =>
                setProviderApiKeyDraft(provider.id, event.target.value)
              }
              className="h-11 w-full rounded-xl border border-border/70 bg-bg/90 px-3 pr-11 text-sm text-fg outline-none transition focus-visible:ring-2 focus-visible:ring-accent/35"
              placeholder={
                provider.hasApiKey && !apiKeyDraft.value
                  ? "••••••••（已配置）"
                  : "输入 API Key"
              }
            />
            <button
              type="button"
              onClick={() => setShowSecret((current) => !current)}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-fg/[0.06] hover:text-fg"
              aria-label={showSecret ? "隐藏 API Key" : "显示 API Key"}
            >
              {showSecret ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </label>

        <button
          type="button"
          onClick={() => {
            void testProviderConnection(provider.id);
          }}
          disabled={testingProviderId === provider.id}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border/70 px-4 text-sm font-medium text-fg transition hover:bg-fg/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw
            className={`h-4 w-4 ${testingProviderId === provider.id ? "animate-spin" : ""}`}
          />
          测试连接
        </button>
      </div>

      <div className="space-y-3 rounded-2xl border border-border/70 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-fg">可用模型目录</h3>
            <p className="text-sm leading-6 text-muted">
              这些模型会成为原生层模型目录的当前覆盖结果。
            </p>
          </div>
          <button
            type="button"
            onClick={() => addProviderModel(provider.id)}
            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-bg px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-fg/[0.06]"
          >
            <Plus className="h-3.5 w-3.5" />
            添加模型
          </button>
        </div>

        <div className="space-y-3">
          {models.map((model) => {
            const isDefaultModel =
              settings.ai.defaultProviderId === provider.id &&
              settings.ai.defaultModelId === model.modelId;

            return (
              <div
                key={`${provider.id}-${model.modelId}`}
                className="grid gap-3 rounded-2xl border border-border/60 bg-bg/90 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
              >
                <input
                  value={model.modelId}
                  onChange={(event) =>
                    updateProviderModel(provider.id, model.modelId, {
                      modelId: event.target.value,
                    })
                  }
                  className="h-10 rounded-xl border border-border/70 bg-bg px-3 text-sm text-fg outline-none transition focus-visible:ring-2 focus-visible:ring-accent/35"
                  placeholder="model-id"
                />
                <input
                  value={model.label}
                  onChange={(event) =>
                    updateProviderModel(provider.id, model.modelId, {
                      label: event.target.value,
                    })
                  }
                  className="h-10 rounded-xl border border-border/70 bg-bg px-3 text-sm text-fg outline-none transition focus-visible:ring-2 focus-visible:ring-accent/35"
                  placeholder="展示名"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDefaultProviderAndModel(provider.id, model.modelId)
                  }
                  className={`inline-flex h-10 items-center justify-center rounded-xl px-3 text-xs font-medium transition ${
                    isDefaultModel
                      ? "bg-accent/12 text-accent"
                      : "border border-border/70 bg-bg text-muted hover:bg-fg/[0.06] hover:text-fg"
                  }`}
                >
                  {isDefaultModel ? "默认模型" : "设为默认"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    removeProviderModel(provider.id, model.modelId)
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-bg text-muted transition hover:border-rose-400/25 hover:bg-rose-400/10 hover:text-rose-500"
                  aria-label="删除模型"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export function AIProviderConfig() {
  const providerDrafts = useSettingsStore((state) => state.providerDrafts);
  const settings = useSettingsStore((state) => state.settings);
  const modelsByProvider = useSettingsStore((state) => state.modelsByProvider);
  const addCustomProvider = useSettingsStore(
    (state) => state.addCustomProvider,
  );
  const setDefaultProviderAndModel = useSettingsStore(
    (state) => state.setDefaultProviderAndModel,
  );

  const enabledProviders = useMemo(
    () => providerDrafts.filter((provider) => provider.enabled),
    [providerDrafts],
  );
  const availableModels = settings.ai.defaultProviderId
    ? (modelsByProvider[settings.ai.defaultProviderId] ?? [])
    : [];

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-fg">AI 模型</h2>
          <p className="text-sm leading-6 text-muted">
            Provider 元数据、模型目录和默认模型都由原生层统一保存。
          </p>
        </div>
        <button
          type="button"
          onClick={() => addCustomProvider()}
          className="inline-flex items-center gap-2 rounded-2xl border border-border/70 px-4 py-2 text-sm font-medium text-fg transition hover:bg-fg/[0.08]"
        >
          <Plus className="h-4 w-4" />
          添加自定义 Provider
        </button>
      </header>

      <div className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-bg/80 p-5 lg:grid-cols-2">
        <div className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            默认 Provider
          </span>
          <Select
            value={settings.ai.defaultProviderId ?? undefined}
            onValueChange={(providerId) =>
              setDefaultProviderAndModel(
                providerId || null,
                providerId
                  ? (modelsByProvider[providerId]?.find(
                      (model) => model.isDefault,
                    )?.modelId ??
                      modelsByProvider[providerId]?.[0]?.modelId ??
                      null)
                  : null,
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="选择默认 Provider" />
            </SelectTrigger>
            <SelectContent>
              {enabledProviders.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            默认模型
          </span>
          <Select
            value={settings.ai.defaultModelId ?? undefined}
            onValueChange={(modelId) =>
              setDefaultProviderAndModel(
                settings.ai.defaultProviderId,
                modelId || null,
              )
            }
            disabled={!settings.ai.defaultProviderId}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择默认模型" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model.modelId} value={model.modelId}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {providerDrafts.map((provider) => (
          <ProviderCard key={provider.id} providerId={provider.id} />
        ))}
      </div>
    </section>
  );
}

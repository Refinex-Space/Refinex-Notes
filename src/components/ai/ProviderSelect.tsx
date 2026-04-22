import type { AIModelInfo, AIProviderInfo } from "../../types/ai";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

function getProviderSummary(
  providers: readonly AIProviderInfo[],
  activeProvider: string | null,
) {
  return providers.find((provider) => provider.id === activeProvider)?.name ?? "选择 Provider";
}

function getModelSummary(
  models: readonly AIModelInfo[],
  activeModel: string | null,
) {
  return models.find((model) => model.modelId === activeModel)?.modelId ?? "选择模型";
}

export function ProviderSelect({
  providers,
  models,
  activeProvider,
  activeModel,
  onProviderChange,
  onModelChange,
  disabled = false,
}: {
  providers: readonly AIProviderInfo[];
  models: readonly AIModelInfo[];
  activeProvider: string | null;
  activeModel: string | null;
  onProviderChange: (providerId: string) => void | Promise<void>;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-fg/[0.03] px-3 py-2">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">当前模型</p>
        <p className="mt-1 truncate text-sm font-medium text-fg">
          {getProviderSummary(providers, activeProvider)} / {getModelSummary(models, activeModel)}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          value={activeProvider ?? ""}
          onValueChange={(providerId) => {
            void onProviderChange(providerId);
          }}
          disabled={disabled || providers.length === 0}
        >
          <SelectTrigger aria-label="选择 AI Provider">
            <SelectValue placeholder="选择 Provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={activeModel ?? ""}
          onValueChange={onModelChange}
          disabled={disabled || models.length === 0}
        >
          <SelectTrigger aria-label="选择 AI 模型">
            <SelectValue placeholder="选择模型" />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.modelId} value={model.modelId}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

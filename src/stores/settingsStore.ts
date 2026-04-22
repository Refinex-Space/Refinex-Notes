import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { settingsService } from "../services/settingsService";
import type {
  AIModelInfo,
  AIProviderDraft,
  AIProviderSettingsRecord,
  AITestConnectionResult,
  AppSettings,
  SettingsStore,
} from "../types";
import {
  createDefaultProviderApiKeyDraft,
  createDefaultSettings,
  isCustomProviderKind,
} from "../types/settings";
import { useAIStore } from "./aiStore";

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "设置保存失败";
}

function createCustomProviderId() {
  return `custom-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}

function createModelId() {
  return `model-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}

function toProviderDraft(record: AIProviderSettingsRecord): AIProviderDraft {
  return {
    id: record.id,
    name: record.name,
    providerKind: record.providerKind,
    enabled: record.enabled,
    baseUrl: record.baseUrl ?? null,
    hasApiKey: record.hasApiKey,
    isCustom: isCustomProviderKind(record.providerKind),
  };
}

function flattenModels(modelsByProvider: Record<string, AIModelInfo[]>) {
  return Object.values(modelsByProvider).flatMap((models) => models);
}

function pickFirstAvailableModel(modelsByProvider: Record<string, AIModelInfo[]>, providerId: string | null) {
  if (!providerId) {
    return null;
  }

  const models = modelsByProvider[providerId] ?? [];
  return models.find((model) => model.isDefault)?.modelId ?? models[0]?.modelId ?? null;
}

function ensureDefaultAISelection(
  settings: AppSettings,
  providerDrafts: AIProviderDraft[],
  modelsByProvider: Record<string, AIModelInfo[]>,
) {
  const providerExists = providerDrafts.some(
    (provider) => provider.id === settings.ai.defaultProviderId,
  );
  if (!providerExists) {
    settings.ai.defaultProviderId = null;
    settings.ai.defaultModelId = null;
  }

  if (settings.ai.defaultProviderId) {
    const models = modelsByProvider[settings.ai.defaultProviderId] ?? [];
    const hasDefaultModel = models.some(
      (model) => model.modelId === settings.ai.defaultModelId,
    );
    if (!hasDefaultModel) {
      settings.ai.defaultModelId = pickFirstAvailableModel(
        modelsByProvider,
        settings.ai.defaultProviderId,
      );
    }
  }
}

function createInitialState() {
  return {
    settings: createDefaultSettings(),
    providerDrafts: [] as AIProviderDraft[],
    modelsByProvider: {} as Record<string, AIModelInfo[]>,
    apiKeyDrafts: {} as Record<
      string,
      ReturnType<typeof createDefaultProviderApiKeyDraft>
    >,
    isLoading: false,
    isSaving: false,
    isLoaded: false,
    testingProviderId: null as string | null,
    lastTestResult: null as AITestConnectionResult | null,
    errorMessage: null as string | null,
  };
}

export function resetSettingsStore() {
  useSettingsStore.setState(createInitialState());
}

export const useSettingsStore = create<SettingsStore>()(
  immer((set, get) => {
    async function refreshAIStore(settings: AppSettings) {
      const aiStore = useAIStore.getState();
      await aiStore.loadProviders();

      const defaultProviderId = settings.ai.defaultProviderId;
      if (
        defaultProviderId &&
        useAIStore.getState().providers.some((provider) => provider.id === defaultProviderId)
      ) {
        await aiStore.selectProvider(defaultProviderId);
        if (settings.ai.defaultModelId) {
          aiStore.selectModel(settings.ai.defaultModelId);
        }
      }
    }

    async function persistDrafts(options?: { silent?: boolean; refreshAI?: boolean }) {
      const state = get();
      const apiKeys = Object.entries(state.apiKeyDrafts)
        .filter(([, draft]) => draft.isDirty)
        .map(([providerId, draft]) => ({
          providerId,
          apiKey: draft.value,
        }));

      set((draft) => {
        draft.isSaving = true;
        if (!options?.silent) {
          draft.errorMessage = null;
        }
      });

      try {
        const savedSettings = await settingsService.saveSettings(state.settings);
        const savedProviders = await settingsService.saveProviderSettings({
          providers: state.providerDrafts,
          modelCatalog: flattenModels(state.modelsByProvider),
          apiKeys,
        });
        const savedModelsByProvider = Object.fromEntries(
          await Promise.all(
            savedProviders.map(async (provider) => [
              provider.id,
              await settingsService.listModels(provider.id),
            ]),
          ),
        ) as Record<string, AIModelInfo[]>;

        set((draft) => {
          draft.settings = savedSettings;
          draft.providerDrafts = savedProviders.map(toProviderDraft);
          draft.modelsByProvider = savedModelsByProvider;
          draft.apiKeyDrafts = Object.fromEntries(
            savedProviders.map((provider) => [
              provider.id,
              createDefaultProviderApiKeyDraft(),
            ]),
          );
          ensureDefaultAISelection(
            draft.settings,
            draft.providerDrafts,
            draft.modelsByProvider,
          );
          draft.errorMessage = null;
        });

        if (options?.refreshAI !== false && settingsService.isNativeAvailable()) {
          await refreshAIStore(savedSettings);
        }
      } catch (error) {
        set((draft) => {
          draft.errorMessage = normalizeError(error);
        });
        throw error;
      } finally {
        set((draft) => {
          draft.isSaving = false;
        });
      }
    }

    return {
      ...createInitialState(),

      loadSettings: async () => {
        if (!settingsService.isNativeAvailable()) {
          set((draft) => {
            draft.isLoaded = true;
          });
          return;
        }

        set((draft) => {
          draft.isLoading = true;
          draft.errorMessage = null;
        });

        try {
          const [settings, providerSettings] = await Promise.all([
            settingsService.loadSettings(),
            settingsService.listProviderSettings(),
          ]);
          const nextSettings = settings ?? createDefaultSettings();
          const modelsByProvider = Object.fromEntries(
            await Promise.all(
              providerSettings.map(async (provider) => [
                provider.id,
                await settingsService.listModels(provider.id),
              ]),
            ),
          ) as Record<string, AIModelInfo[]>;

          set((draft) => {
            draft.settings = nextSettings;
            draft.providerDrafts = providerSettings.map(toProviderDraft);
            draft.modelsByProvider = modelsByProvider;
            draft.apiKeyDrafts = Object.fromEntries(
              providerSettings.map((provider) => [
                provider.id,
                createDefaultProviderApiKeyDraft(),
              ]),
            );
            ensureDefaultAISelection(
              draft.settings,
              draft.providerDrafts,
              draft.modelsByProvider,
            );
            draft.isLoaded = true;
          });
        } catch (error) {
          set((draft) => {
            draft.errorMessage = normalizeError(error);
            draft.isLoaded = true;
          });
        } finally {
          set((draft) => {
            draft.isLoading = false;
          });
        }
      },

      saveSettings: async (options) => {
        await persistDrafts({ silent: options?.silent, refreshAI: true });
      },

      setThemeMode: (themeMode) => {
        set((draft) => {
          draft.settings.themeMode = themeMode;
        });
      },

      setLanguage: (language) => {
        set((draft) => {
          draft.settings.language = language;
        });
      },

      setReopenLastWorkspaceOnStartup: (enabled) => {
        set((draft) => {
          draft.settings.reopenLastWorkspaceOnStartup = enabled;
        });
      },

      updateEditorSettings: (patch) => {
        set((draft) => {
          Object.assign(draft.settings.editor, patch);
        });
      },

      updateGitSyncSettings: (patch) => {
        set((draft) => {
          Object.assign(draft.settings.gitSync, patch);
        });
      },

      updateAISettings: (patch) => {
        set((draft) => {
          Object.assign(draft.settings.ai, patch);
        });
      },

      updateProviderDraft: (providerId, patch) => {
        set((draft) => {
          const provider = draft.providerDrafts.find((entry) => entry.id === providerId);
          if (!provider) {
            return;
          }

          Object.assign(provider, patch);
          if (!provider.enabled && draft.settings.ai.defaultProviderId === providerId) {
            draft.settings.ai.defaultProviderId = null;
            draft.settings.ai.defaultModelId = null;
          }
        });
      },

      addCustomProvider: () => {
        const providerId = createCustomProviderId();
        set((draft) => {
          draft.providerDrafts.push({
            id: providerId,
            name: "自定义 Provider",
            providerKind: "custom-openai-compatible",
            enabled: true,
            baseUrl: "",
            hasApiKey: false,
            isCustom: true,
          });
          draft.modelsByProvider[providerId] = [
            {
              providerId,
              modelId: createModelId(),
              label: "新模型",
              isDefault: true,
            },
          ];
          draft.apiKeyDrafts[providerId] = createDefaultProviderApiKeyDraft();
        });
        return providerId;
      },

      removeCustomProvider: (providerId) => {
        set((draft) => {
          draft.providerDrafts = draft.providerDrafts.filter(
            (provider) => provider.id !== providerId || !provider.isCustom,
          );
          delete draft.modelsByProvider[providerId];
          delete draft.apiKeyDrafts[providerId];
          if (draft.settings.ai.defaultProviderId === providerId) {
            draft.settings.ai.defaultProviderId = null;
            draft.settings.ai.defaultModelId = null;
          }
        });
      },

      setProviderApiKeyDraft: (providerId, value) => {
        set((draft) => {
          draft.apiKeyDrafts[providerId] = {
            value,
            isDirty: true,
          };
        });
      },

      addProviderModel: (providerId) => {
        set((draft) => {
          const models = draft.modelsByProvider[providerId] ?? [];
          models.push({
            providerId,
            modelId: createModelId(),
            label: "新模型",
            isDefault: models.length === 0,
          });
          draft.modelsByProvider[providerId] = models;
        });
      },

      updateProviderModel: (providerId, modelId, patch) => {
        set((draft) => {
          const models = draft.modelsByProvider[providerId];
          if (!models) {
            return;
          }

          draft.modelsByProvider[providerId] = models.map((model) => {
            if (model.modelId !== modelId) {
              return patch.isDefault
                ? { ...model, isDefault: false }
                : model;
            }

            const next = { ...model, ...patch };
            if (patch.modelId) {
              next.modelId = patch.modelId;
            }
            return next;
          });

          if (
            draft.settings.ai.defaultProviderId === providerId &&
            draft.settings.ai.defaultModelId === modelId &&
            patch.modelId
          ) {
            draft.settings.ai.defaultModelId = patch.modelId;
          }

          if (patch.isDefault) {
            draft.settings.ai.defaultProviderId = providerId;
            draft.settings.ai.defaultModelId =
              patch.modelId ?? modelId;
          }
        });
      },

      removeProviderModel: (providerId, modelId) => {
        set((draft) => {
          const models = draft.modelsByProvider[providerId] ?? [];
          const nextModels = models.filter((model) => model.modelId !== modelId);
          if (nextModels.length > 0 && !nextModels.some((model) => model.isDefault)) {
            nextModels[0] = { ...nextModels[0], isDefault: true };
          }
          draft.modelsByProvider[providerId] = nextModels;

          if (draft.settings.ai.defaultProviderId === providerId) {
            const stillExists = nextModels.some(
              (model) => model.modelId === draft.settings.ai.defaultModelId,
            );
            if (!stillExists) {
              draft.settings.ai.defaultModelId =
                nextModels.find((model) => model.isDefault)?.modelId ??
                nextModels[0]?.modelId ??
                null;
            }
          }
        });
      },

      setDefaultProviderAndModel: (providerId, modelId) => {
        set((draft) => {
          draft.settings.ai.defaultProviderId = providerId;
          draft.settings.ai.defaultModelId =
            modelId ?? pickFirstAvailableModel(draft.modelsByProvider, providerId);

          if (!providerId) {
            return;
          }

          const models = draft.modelsByProvider[providerId] ?? [];
          draft.modelsByProvider[providerId] = models.map((model) => ({
            ...model,
            isDefault: model.modelId === draft.settings.ai.defaultModelId,
          }));
        });
      },

      testProviderConnection: async (providerId) => {
        set((draft) => {
          draft.testingProviderId = providerId;
          draft.errorMessage = null;
          draft.lastTestResult = null;
        });

        try {
          await persistDrafts({ silent: true, refreshAI: false });
          const modelId =
            get().settings.ai.defaultProviderId === providerId
              ? get().settings.ai.defaultModelId
              : pickFirstAvailableModel(get().modelsByProvider, providerId);
          const result = await settingsService.testConnection(providerId, modelId);
          set((draft) => {
            draft.lastTestResult = result;
          });
          return result;
        } catch (error) {
          set((draft) => {
            draft.errorMessage = normalizeError(error);
          });
          throw error;
        } finally {
          set((draft) => {
            draft.testingProviderId = null;
          });
        }
      },

      clearError: () => {
        set((draft) => {
          draft.errorMessage = null;
        });
      },
    };
  }),
);

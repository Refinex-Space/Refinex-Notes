use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use keyring::{Entry, Error as KeyringError};
use serde::{Deserialize, Serialize};

pub mod providers;
pub mod streaming;

pub use streaming::{stream_sse_response, SseEvent, StreamControl, StreamOutcome};

pub const AI_PROVIDERS_SETTINGS_KEY: &str = "ai_providers";
pub const AI_MODEL_CATALOG_SETTINGS_KEY: &str = "ai_model_catalog";
pub const DEFAULT_DEEPSEEK_BASE_URL: &str = "https://api.deepseek.com/v1";
pub const DEFAULT_QWEN_BASE_URL: &str = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
pub const DEFAULT_GLM_BASE_URL: &str = "https://open.bigmodel.cn/api/paas/v4";
pub const DEFAULT_KIMI_BASE_URL: &str = "https://api.moonshot.cn/v1";
pub const DEFAULT_MINIMAX_BASE_URL: &str = "https://api.minimax.chat/v1";
pub const DEFAULT_OPENAI_BASE_URL: &str = "https://api.openai.com/v1";
pub const DEFAULT_ANTHROPIC_BASE_URL: &str = "https://api.anthropic.com";

const AI_KEYRING_SERVICE: &str = "refinex-notes-ai";

pub type TokenEmitter = Arc<dyn Fn(String) -> Result<(), String> + Send + Sync>;
pub type AIResult<T> = Result<T, String>;
pub type AIProviderFuture<'a> = Pin<Box<dyn Future<Output = AIResult<()>> + Send + 'a>>;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AIMessage {
    pub role: String,
    pub content: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub attachments: Vec<AIAttachment>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum AIAttachment {
    Image {
        id: String,
        name: String,
        mime_type: String,
        base64_data: String,
        size: usize,
    },
    Text {
        id: String,
        name: String,
        mime_type: String,
        text_content: String,
        size: usize,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AIProviderConfig {
    pub id: String,
    pub name: String,
    pub provider_kind: AIProviderKind,
    #[serde(default = "default_provider_enabled")]
    pub enabled: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
}

impl AIProviderConfig {
    pub fn resolved_base_url(&self) -> &str {
        self.base_url
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| self.provider_kind.default_base_url())
    }

    pub fn is_openai_compatible(&self) -> bool {
        !matches!(self.provider_kind, AIProviderKind::Anthropic)
    }

    pub fn default_model_catalog(&self) -> Vec<AIModelCatalogEntry> {
        self.provider_kind.default_model_catalog(&self.id)
    }

    pub fn validate(&self) -> Result<(), String> {
        if self.id.trim().is_empty() {
            return Err("AI Provider id 不能为空".to_string());
        }

        if self.name.trim().is_empty() {
            return Err(format!("AI Provider `{}` 名称不能为空", self.id));
        }

        if matches!(
            self.provider_kind,
            AIProviderKind::CustomOpenAICompatible
        ) && self
            .base_url
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .is_none()
        {
            return Err(format!(
                "自定义 Provider `{}` 必须提供 API Base URL",
                self.id
            ));
        }

        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AIProviderKind {
    #[serde(rename = "deepseek")]
    DeepSeek,
    #[serde(rename = "qwen")]
    Qwen,
    #[serde(rename = "glm")]
    Glm,
    #[serde(rename = "kimi")]
    Kimi,
    #[serde(rename = "minimax")]
    MiniMax,
    #[serde(rename = "openai")]
    OpenAI,
    #[serde(rename = "anthropic")]
    Anthropic,
    #[serde(rename = "custom-openai-compatible")]
    CustomOpenAICompatible,
}

impl AIProviderKind {
    pub fn default_base_url(&self) -> &'static str {
        match self {
            Self::DeepSeek => DEFAULT_DEEPSEEK_BASE_URL,
            Self::Qwen => DEFAULT_QWEN_BASE_URL,
            Self::Glm => DEFAULT_GLM_BASE_URL,
            Self::Kimi => DEFAULT_KIMI_BASE_URL,
            Self::MiniMax => DEFAULT_MINIMAX_BASE_URL,
            Self::OpenAI => DEFAULT_OPENAI_BASE_URL,
            Self::Anthropic => DEFAULT_ANTHROPIC_BASE_URL,
            Self::CustomOpenAICompatible => "",
        }
    }

    pub fn default_model_catalog(&self, provider_id: &str) -> Vec<AIModelCatalogEntry> {
        let entries = match self {
            Self::DeepSeek => vec![
                ("deepseek-chat", "DeepSeek Chat", true),
                ("deepseek-reasoner", "DeepSeek Reasoner", false),
            ],
            Self::Qwen => vec![
                ("qwen-plus", "Qwen Plus", true),
                ("qwen-turbo", "Qwen Turbo", false),
                ("qwen-max", "Qwen Max", false),
            ],
            Self::Glm => vec![
                ("glm-4-flash", "GLM-4 Flash", true),
                ("glm-4-air", "GLM-4 Air", false),
                ("glm-4-plus", "GLM-4 Plus", false),
            ],
            Self::Kimi => vec![
                ("kimi-k2.5", "Kimi K2.5", true),
                ("moonshot-v1-32k", "Moonshot V1 32K", false),
                ("moonshot-v1-128k", "Moonshot V1 128K", false),
            ],
            Self::MiniMax => vec![
                ("MiniMax-M2.7", "MiniMax M2.7", true),
                ("MiniMax-M2.5", "MiniMax M2.5", false),
                ("MiniMax-M2.1", "MiniMax M2.1", false),
            ],
            Self::OpenAI => vec![
                ("gpt-4o", "GPT-4o", true),
                ("gpt-4o-mini", "GPT-4o Mini", false),
                ("gpt-4.1-mini", "GPT-4.1 Mini", false),
            ],
            Self::Anthropic => vec![
                ("claude-sonnet-4-20250514", "Claude Sonnet 4", true),
                ("claude-3-5-haiku-20241022", "Claude Haiku 3.5", false),
            ],
            Self::CustomOpenAICompatible => Vec::new(),
        };

        normalize_model_catalog(
            entries
                .into_iter()
                .map(|(model_id, label, is_default)| AIModelCatalogEntry {
                    provider_id: provider_id.to_string(),
                    model_id: model_id.to_string(),
                    label: label.to_string(),
                    is_default,
                })
                .collect(),
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AIModelCatalogEntry {
    pub provider_id: String,
    pub model_id: String,
    pub label: String,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AITestConnectionResult {
    pub provider_id: String,
    pub model_id: String,
    pub ready: bool,
    pub check_mode: AITestConnectionMode,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum AITestConnectionMode {
    ConfigOnly,
    LiveRequest,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AIProviderSettingsRecord {
    pub id: String,
    pub name: String,
    pub provider_kind: AIProviderKind,
    pub enabled: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
    pub has_api_key: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AIProviderSecretInput {
    pub provider_id: String,
    pub api_key: String,
}

pub fn default_provider_enabled() -> bool {
    true
}

pub fn builtin_provider_configs() -> Vec<AIProviderConfig> {
    vec![
        AIProviderConfig {
            id: "anthropic".to_string(),
            name: "Anthropic".to_string(),
            provider_kind: AIProviderKind::Anthropic,
            enabled: false,
            base_url: None,
        },
        AIProviderConfig {
            id: "openai".to_string(),
            name: "OpenAI".to_string(),
            provider_kind: AIProviderKind::OpenAI,
            enabled: false,
            base_url: None,
        },
        AIProviderConfig {
            id: "deepseek".to_string(),
            name: "DeepSeek".to_string(),
            provider_kind: AIProviderKind::DeepSeek,
            enabled: false,
            base_url: None,
        },
        AIProviderConfig {
            id: "qwen".to_string(),
            name: "Qwen".to_string(),
            provider_kind: AIProviderKind::Qwen,
            enabled: false,
            base_url: None,
        },
        AIProviderConfig {
            id: "glm".to_string(),
            name: "GLM".to_string(),
            provider_kind: AIProviderKind::Glm,
            enabled: false,
            base_url: None,
        },
        AIProviderConfig {
            id: "kimi".to_string(),
            name: "Kimi".to_string(),
            provider_kind: AIProviderKind::Kimi,
            enabled: false,
            base_url: None,
        },
        AIProviderConfig {
            id: "minimax".to_string(),
            name: "MiniMax".to_string(),
            provider_kind: AIProviderKind::MiniMax,
            enabled: false,
            base_url: None,
        },
    ]
}

pub fn normalize_provider_configs(
    providers: Vec<AIProviderConfig>,
) -> Result<Vec<AIProviderConfig>, String> {
    let mut normalized = Vec::new();

    for provider in providers {
        let next = AIProviderConfig {
            id: provider.id.trim().to_string(),
            name: provider.name.trim().to_string(),
            provider_kind: provider.provider_kind,
            enabled: provider.enabled,
            base_url: provider
                .base_url
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty()),
        };
        next.validate()?;

        if normalized.iter().any(|entry: &AIProviderConfig| entry.id == next.id) {
            return Err(format!("AI Provider `{}` 重复", next.id));
        }

        normalized.push(next);
    }

    Ok(normalized)
}

pub fn resolve_model_catalog(
    providers: &[AIProviderConfig],
    overrides: &[AIModelCatalogEntry],
) -> Vec<AIModelCatalogEntry> {
    providers
        .iter()
        .flat_map(|provider| {
            let provider_overrides = overrides
                .iter()
                .filter(|entry| entry.provider_id == provider.id)
                .cloned()
                .collect::<Vec<_>>();

            if provider_overrides.is_empty() {
                provider.default_model_catalog()
            } else {
                normalize_model_catalog(provider_overrides)
            }
        })
        .collect()
}

pub fn normalize_model_catalog(entries: Vec<AIModelCatalogEntry>) -> Vec<AIModelCatalogEntry> {
    let mut normalized = entries
        .into_iter()
        .filter_map(|entry| {
            let provider_id = entry.provider_id.trim().to_string();
            let model_id = entry.model_id.trim().to_string();
            let label = entry.label.trim().to_string();

            if provider_id.is_empty() || model_id.is_empty() || label.is_empty() {
                None
            } else {
                Some(AIModelCatalogEntry {
                    provider_id,
                    model_id,
                    label,
                    is_default: entry.is_default,
                })
            }
        })
        .collect::<Vec<_>>();

    if normalized.is_empty() {
        return normalized;
    }

    let default_index = normalized
        .iter()
        .position(|entry| entry.is_default)
        .unwrap_or(0);

    normalized = normalized
        .into_iter()
        .enumerate()
        .map(|(index, entry)| AIModelCatalogEntry {
            is_default: index == default_index,
            ..entry
        })
        .collect();

    normalized
}

pub trait AIProvider: Send + Sync {
    fn chat_stream<'a>(
        &'a self,
        messages: Vec<AIMessage>,
        model: String,
        on_token: TokenEmitter,
    ) -> AIProviderFuture<'a>;
}

fn provider_keyring_account(provider_id: &str) -> String {
    format!("provider:{provider_id}:api-key")
}

fn provider_keyring_entry(provider_id: &str) -> Result<Entry, String> {
    Entry::new(AI_KEYRING_SERVICE, &provider_keyring_account(provider_id))
        .map_err(|error| format!("初始化 AI Provider 钥匙串条目失败: {error}"))
}

fn normalize_api_key(raw_value: String) -> Result<String, String> {
    let trimmed = raw_value.trim();
    if trimmed.is_empty() {
        Err("AI Provider API Key 为空".to_string())
    } else {
        Ok(trimmed.to_string())
    }
}

fn load_provider_api_key_with<F>(provider_id: &str, mut load_raw: F) -> Result<String, String>
where
    F: FnMut(&str, &str) -> Result<Option<String>, String>,
{
    let account = provider_keyring_account(provider_id);
    let raw_value = load_raw(AI_KEYRING_SERVICE, &account)?
        .ok_or_else(|| format!("Provider `{provider_id}` 尚未在系统钥匙串中配置 API Key"))?;
    normalize_api_key(raw_value)
}

pub fn load_provider_api_key(provider_id: &str) -> Result<String, String> {
    let entry = provider_keyring_entry(provider_id)?;
    load_provider_api_key_with(provider_id, move |_, _| match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(error) => Err(format!("访问系统钥匙串失败: {error}")),
    })
}

pub fn provider_has_api_key(provider_id: &str) -> Result<bool, String> {
    let entry = provider_keyring_entry(provider_id)?;
    match entry.get_password() {
        Ok(value) => Ok(!value.trim().is_empty()),
        Err(KeyringError::NoEntry) => Ok(false),
        Err(error) => Err(format!("访问系统钥匙串失败: {error}")),
    }
}

pub fn store_provider_api_key(provider_id: &str, api_key: &str) -> Result<(), String> {
    let value = normalize_api_key(api_key.to_string())?;
    let entry = provider_keyring_entry(provider_id)?;
    entry
        .set_password(&value)
        .map_err(|error| format!("写入系统钥匙串失败: {error}"))
}

pub fn clear_provider_api_key(provider_id: &str) -> Result<(), String> {
    let entry = provider_keyring_entry(provider_id)?;
    match entry.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(error) => Err(format!("删除系统钥匙串条目失败: {error}")),
    }
}

#[cfg(test)]
mod tests {
    use super::{
        builtin_provider_configs, load_provider_api_key_with, normalize_model_catalog,
        normalize_provider_configs, resolve_model_catalog, AIModelCatalogEntry, AIProviderConfig,
        AIProviderKind, DEFAULT_ANTHROPIC_BASE_URL, DEFAULT_GLM_BASE_URL,
        DEFAULT_OPENAI_BASE_URL,
    };

    #[test]
    fn provider_config_uses_default_base_url_when_missing() {
        let glm = AIProviderConfig {
            id: "glm".to_string(),
            name: "GLM".to_string(),
            provider_kind: AIProviderKind::Glm,
            enabled: true,
            base_url: None,
        };
        let anthropic = AIProviderConfig {
            id: "anthropic".to_string(),
            name: "Anthropic".to_string(),
            provider_kind: AIProviderKind::Anthropic,
            enabled: true,
            base_url: Some("   ".to_string()),
        };

        assert_eq!(glm.resolved_base_url(), DEFAULT_GLM_BASE_URL);
        assert_eq!(anthropic.resolved_base_url(), DEFAULT_ANTHROPIC_BASE_URL);
    }

    #[test]
    fn provider_config_allows_custom_base_url_override() {
        let provider = AIProviderConfig {
            id: "openai".to_string(),
            name: "OpenAI".to_string(),
            provider_kind: AIProviderKind::OpenAI,
            enabled: true,
            base_url: Some("https://proxy.example.com/v1".to_string()),
        };

        assert_eq!(provider.resolved_base_url(), "https://proxy.example.com/v1");
        assert!(provider.is_openai_compatible());
        assert_ne!(provider.resolved_base_url(), DEFAULT_OPENAI_BASE_URL);
    }

    #[test]
    fn load_provider_api_key_uses_stable_keyring_account_and_trims_value() {
        let api_key = load_provider_api_key_with("deepseek-main", |service, account| {
            assert_eq!(service, "refinex-notes-ai");
            assert_eq!(account, "provider:deepseek-main:api-key");
            Ok(Some("  sk-test  ".to_string()))
        })
        .expect("api key");

        assert_eq!(api_key, "sk-test");
    }

    #[test]
    fn load_provider_api_key_rejects_blank_values() {
        let error = load_provider_api_key_with("anthropic", |_, _| Ok(Some("   ".to_string())))
            .expect_err("blank api key should fail");

        assert!(error.contains("为空"));
    }

    #[test]
    fn provider_default_model_catalog_matches_provider_kind() {
        let provider = AIProviderConfig {
            id: "deepseek-main".to_string(),
            name: "DeepSeek".to_string(),
            provider_kind: AIProviderKind::DeepSeek,
            enabled: true,
            base_url: None,
        };

        let models = provider.default_model_catalog();
        assert_eq!(models.len(), 2);
        assert_eq!(models[0].provider_id, "deepseek-main");
        assert_eq!(models[0].model_id, "deepseek-chat");
        assert!(models[0].is_default);
    }

    #[test]
    fn resolve_model_catalog_falls_back_to_builtin_entries_per_provider() {
        let providers = vec![
            AIProviderConfig {
                id: "openai-main".to_string(),
                name: "OpenAI".to_string(),
                provider_kind: AIProviderKind::OpenAI,
                enabled: true,
                base_url: None,
            },
            AIProviderConfig {
                id: "anthropic-main".to_string(),
                name: "Anthropic".to_string(),
                provider_kind: AIProviderKind::Anthropic,
                enabled: true,
                base_url: None,
            },
        ];

        let models = resolve_model_catalog(&providers, &[]);
        assert_eq!(
            models
                .iter()
                .filter(|entry| entry.provider_id == "openai-main")
                .count(),
            3
        );
        assert_eq!(
            models
                .iter()
                .find(|entry| entry.provider_id == "anthropic-main" && entry.is_default)
                .map(|entry| entry.model_id.as_str()),
            Some("claude-sonnet-4-20250514")
        );
    }

    #[test]
    fn normalize_model_catalog_discards_blank_entries_and_keeps_one_default() {
        let entries = vec![
            AIModelCatalogEntry {
                provider_id: " provider-a ".to_string(),
                model_id: " model-1 ".to_string(),
                label: " Model 1 ".to_string(),
                is_default: false,
            },
            AIModelCatalogEntry {
                provider_id: "provider-a".to_string(),
                model_id: "model-2".to_string(),
                label: "Model 2".to_string(),
                is_default: true,
            },
            AIModelCatalogEntry {
                provider_id: "provider-a".to_string(),
                model_id: " ".to_string(),
                label: "Broken".to_string(),
                is_default: true,
            },
        ];

        let normalized = normalize_model_catalog(entries);
        assert_eq!(normalized.len(), 2);
        assert_eq!(normalized[0].provider_id, "provider-a");
        assert_eq!(normalized[0].model_id, "model-1");
        assert!(normalized[1].is_default);
        assert!(!normalized[0].is_default);
    }

    #[test]
    fn builtin_provider_configs_ship_all_presets_disabled_by_default() {
        let providers = builtin_provider_configs();
        assert_eq!(providers.len(), 7);
        assert!(providers.iter().all(|provider| !provider.enabled));
        assert!(providers.iter().any(|provider| provider.id == "anthropic"));
    }

    #[test]
    fn normalize_provider_configs_rejects_duplicate_ids() {
        let error = normalize_provider_configs(vec![
            AIProviderConfig {
                id: " openai ".to_string(),
                name: "OpenAI".to_string(),
                provider_kind: AIProviderKind::OpenAI,
                enabled: true,
                base_url: None,
            },
            AIProviderConfig {
                id: "openai".to_string(),
                name: "Proxy".to_string(),
                provider_kind: AIProviderKind::CustomOpenAICompatible,
                enabled: true,
                base_url: Some("https://proxy.example.com/v1".to_string()),
            },
        ])
        .expect_err("duplicate ids should fail");

        assert!(error.contains("重复"));
    }

    #[test]
    fn normalize_provider_configs_requires_custom_base_url() {
        let error = normalize_provider_configs(vec![AIProviderConfig {
            id: "custom".to_string(),
            name: "自定义".to_string(),
            provider_kind: AIProviderKind::CustomOpenAICompatible,
            enabled: true,
            base_url: None,
        }])
        .expect_err("custom provider should require base url");

        assert!(error.contains("Base URL"));
    }
}

use std::sync::{Mutex, OnceLock};

use keyring::{Entry, Error as KeyringError};
use serde::{Deserialize, Serialize};

pub const ACCESS_TOKEN_REFRESH_SKEW_SECONDS: u64 = 60;

const KEYRING_SERVICE: &str = "refinex-notes";
const KEYRING_ACCOUNT: &str = "github-token";

static GITHUB_SESSION_CACHE: OnceLock<Mutex<Option<String>>> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StoredGithubSession {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub access_token_expires_at: Option<u64>,
    pub refresh_token_expires_at: Option<u64>,
    pub token_type: Option<String>,
}

impl StoredGithubSession {
    pub fn from_legacy_access_token(token: String) -> Self {
        Self {
            access_token: token,
            refresh_token: None,
            access_token_expires_at: None,
            refresh_token_expires_at: None,
            token_type: Some("bearer".to_string()),
        }
    }

    pub fn should_refresh_access_token(&self, now: u64) -> bool {
        self.access_token_expires_at.is_some_and(|expires_at| {
            expires_at <= now.saturating_add(ACCESS_TOKEN_REFRESH_SKEW_SECONDS)
        })
    }

    pub fn can_refresh(&self, now: u64) -> bool {
        self.refresh_token.is_some()
            && self
                .refresh_token_expires_at
                .is_none_or(|expires_at| expires_at > now)
    }
}

fn session_cache() -> &'static Mutex<Option<String>> {
    GITHUB_SESSION_CACHE.get_or_init(|| Mutex::new(None))
}

fn keyring_entry() -> Result<Entry, String> {
    Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
        .map_err(|error| format!("初始化系统钥匙串条目失败: {error}"))
}

fn set_cached_raw_session(raw_value: Option<String>) -> Result<(), String> {
    let mut guard = session_cache()
        .lock()
        .map_err(|_| "GitHub session 缓存锁获取失败".to_string())?;
    *guard = raw_value;
    Ok(())
}

fn cached_raw_session() -> Result<Option<String>, String> {
    session_cache()
        .lock()
        .map(|guard| guard.clone())
        .map_err(|_| "GitHub session 缓存锁获取失败".to_string())
}

fn serialize_session(session: &StoredGithubSession) -> Result<String, String> {
    serde_json::to_string(session).map_err(|error| format!("序列化 GitHub 会话失败: {error}"))
}

fn load_raw_session_from_keyring() -> Result<Option<String>, String> {
    let entry = keyring_entry()?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(error) => Err(format!("访问系统钥匙串失败: {error}")),
    }
}

fn load_session_with<F>(mut load_raw_session: F) -> Result<Option<StoredGithubSession>, String>
where
    F: FnMut() -> Result<Option<String>, String>,
{
    if let Some(raw_value) = cached_raw_session()? {
        return parse_stored_session(&raw_value).map(Some);
    }

    let raw_value = match load_raw_session()? {
        Some(raw_value) => raw_value,
        None => return Ok(None),
    };

    set_cached_raw_session(Some(raw_value.clone()))?;
    parse_stored_session(&raw_value).map(Some)
}

pub fn load_stored_session() -> Result<Option<StoredGithubSession>, String> {
    load_session_with(load_raw_session_from_keyring)
}

pub fn load_access_token() -> Result<Option<String>, String> {
    load_stored_session().map(|session| session.map(|session| session.access_token))
}

pub fn store_session(session: &StoredGithubSession) -> Result<(), String> {
    let raw_value = serialize_session(session)?;
    keyring_entry()?
        .set_password(&raw_value)
        .map_err(|error| format!("写入系统钥匙串失败: {error}"))?;
    set_cached_raw_session(Some(raw_value))
}

pub fn delete_stored_session() -> Result<(), String> {
    set_cached_raw_session(None)?;
    let entry = keyring_entry()?;
    match entry.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(error) => Err(format!("访问系统钥匙串失败: {error}")),
    }
}

pub fn parse_stored_session(raw_value: &str) -> Result<StoredGithubSession, String> {
    serde_json::from_str::<StoredGithubSession>(raw_value).or_else(|_| {
        let trimmed = raw_value.trim();
        if trimmed.is_empty() {
            Err("系统钥匙串中的 GitHub 会话为空".to_string())
        } else {
            Ok(StoredGithubSession::from_legacy_access_token(
                trimmed.to_string(),
            ))
        }
    })
}

#[cfg(test)]
mod tests {
    use super::{
        load_session_with, parse_stored_session, set_cached_raw_session, StoredGithubSession,
        ACCESS_TOKEN_REFRESH_SKEW_SECONDS,
    };
    use std::sync::Mutex;

    static TEST_GUARD: Mutex<()> = Mutex::new(());

    #[test]
    fn parse_stored_session_accepts_structured_json() {
        let session = StoredGithubSession {
            access_token: "ghu_access".to_string(),
            refresh_token: Some("ghr_refresh".to_string()),
            access_token_expires_at: Some(120),
            refresh_token_expires_at: Some(240),
            token_type: Some("bearer".to_string()),
        };
        let raw_value = serde_json::to_string(&session).expect("session json");

        assert_eq!(
            parse_stored_session(&raw_value).expect("parsed session"),
            session
        );
    }

    #[test]
    fn parse_stored_session_accepts_legacy_plain_token() {
        let session = parse_stored_session("gho_legacy_token").expect("legacy session");

        assert_eq!(session.access_token, "gho_legacy_token");
        assert_eq!(session.refresh_token, None);
    }

    #[test]
    fn stored_session_refresh_window_obeys_skew() {
        let session = StoredGithubSession {
            access_token: "ghu_access".to_string(),
            refresh_token: Some("ghr_refresh".to_string()),
            access_token_expires_at: Some(ACCESS_TOKEN_REFRESH_SKEW_SECONDS + 10),
            refresh_token_expires_at: Some(600),
            token_type: Some("bearer".to_string()),
        };

        assert!(session.can_refresh(0));
        assert!(!session.should_refresh_access_token(0));
        assert!(session.should_refresh_access_token(15));
    }

    #[test]
    fn load_session_uses_process_cache_after_first_read() {
        let _guard = TEST_GUARD.lock().expect("test guard");
        set_cached_raw_session(None).expect("clear cache");

        let mut load_count = 0;
        let first = load_session_with(|| {
            load_count += 1;
            Ok(Some(
                r#"{"access_token":"ghu_cached","refresh_token":null,"access_token_expires_at":null,"refresh_token_expires_at":null,"token_type":"bearer"}"#
                    .to_string(),
            ))
        })
        .expect("first load");
        let second = load_session_with(|| {
            load_count += 1;
            Ok(None)
        })
        .expect("second load");

        assert_eq!(load_count, 1);
        assert_eq!(first, second);

        set_cached_raw_session(None).expect("clear cache");
    }
}

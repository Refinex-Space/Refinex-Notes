use git2::{Cred, RemoteCallbacks};
use keyring::{Entry, Error as KeyringError};
use serde::Deserialize;

const KEYRING_SERVICE: &str = "refinex-notes";
const KEYRING_ACCOUNT: &str = "github-token";

#[derive(Debug, Deserialize)]
struct StoredGithubSession {
    access_token: String,
}

pub fn load_github_token() -> Result<Option<String>, String> {
    let entry = keyring_entry()?;
    let raw_value = match entry.get_password() {
        Ok(value) => value,
        Err(KeyringError::NoEntry) => return Ok(None),
        Err(error) => return Err(format!("读取 GitHub token 失败: {error}")),
    };

    Ok(Some(parse_stored_token(&raw_value)?))
}

pub fn remote_callbacks() -> Result<RemoteCallbacks<'static>, String> {
    let token = load_github_token()?;
    let mut callbacks = RemoteCallbacks::new();

    callbacks.credentials(move |url, _username_from_url, _allowed_types| {
        if let Some(token) = token.as_deref() {
            if url.starts_with("https://") || url.starts_with("http://") {
                return Cred::userpass_plaintext("x-access-token", token);
            }
        }

        Cred::default()
    });

    Ok(callbacks)
}

fn keyring_entry() -> Result<Entry, String> {
    Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
        .map_err(|error| format!("初始化系统钥匙串条目失败: {error}"))
}

fn parse_stored_token(raw_value: &str) -> Result<String, String> {
    serde_json::from_str::<StoredGithubSession>(raw_value)
        .map(|session| session.access_token)
        .or_else(|_| {
            let trimmed = raw_value.trim();
            if trimmed.is_empty() {
                Err("系统钥匙串中的 GitHub token 为空".to_string())
            } else {
                Ok(trimmed.to_string())
            }
        })
}

#[cfg(test)]
mod tests {
    use super::parse_stored_token;

    #[test]
    fn parse_stored_token_supports_structured_session() {
        let token = parse_stored_token(r#"{"access_token":"ghu_test"}"#).unwrap();
        assert_eq!(token, "ghu_test");
    }

    #[test]
    fn parse_stored_token_supports_legacy_plain_token() {
        let token = parse_stored_token("ghu_plain").unwrap();
        assert_eq!(token, "ghu_plain");
    }

    #[test]
    fn parse_stored_token_rejects_empty_value() {
        let error = parse_stored_token("   ").unwrap_err();
        assert!(error.contains("为空"));
    }
}

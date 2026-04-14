use std::process::Command;
use std::time::Duration;
use std::time::{SystemTime, UNIX_EPOCH};

use keyring::{Entry, Error as KeyringError};
use serde::{Deserialize, Serialize};
use tauri::{ipc::Channel, State};

use crate::state::AppState;

const GITHUB_DEVICE_CODE_URL: &str = "https://github.com/login/device/code";
const GITHUB_ACCESS_TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL: &str = "https://api.github.com/user";
const GITHUB_API_ACCEPT: &str = "application/vnd.github+json";
const GITHUB_BROWSER_URL_PREFIX: &str = "https://github.com/";
const DEFAULT_POLL_INTERVAL_SECONDS: u64 = 5;
const ACCESS_TOKEN_REFRESH_SKEW_SECONDS: u64 = 60;
const KEYRING_SERVICE: &str = "refinex-notes";
const KEYRING_ACCOUNT: &str = "github-token";
const USER_AGENT: &str = "Refinex-Notes";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceCodeResponse {
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UserProfile {
    pub login: String,
    pub name: Option<String>,
    pub avatar_url: String,
    pub email: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AuthEvent {
    Polling {
        attempt: u32,
        interval_seconds: u64,
        message: String,
    },
    SlowDown {
        interval_seconds: u64,
        message: String,
    },
    Success {
        login: String,
        message: String,
    },
}

#[derive(Debug, Deserialize)]
struct DeviceCodeApiResponse {
    device_code: String,
    user_code: String,
    verification_uri: String,
    expires_in: u64,
    interval: Option<u64>,
}

#[derive(Debug, Clone, Deserialize)]
struct AccessTokenApiResponse {
    access_token: Option<String>,
    expires_in: Option<u64>,
    refresh_token: Option<String>,
    refresh_token_expires_in: Option<u64>,
    token_type: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
    interval: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
struct StoredGithubSession {
    access_token: String,
    refresh_token: Option<String>,
    access_token_expires_at: Option<u64>,
    refresh_token_expires_at: Option<u64>,
    token_type: Option<String>,
}

impl StoredGithubSession {
    fn from_token_payload(payload: &AccessTokenApiResponse, now: u64) -> Result<Self, String> {
        let access_token = payload
            .access_token
            .as_ref()
            .cloned()
            .ok_or_else(|| "GitHub 未返回 user access token".to_string())?;

        Ok(Self {
            access_token,
            refresh_token: payload.refresh_token.clone(),
            access_token_expires_at: payload.expires_in.map(|seconds| now.saturating_add(seconds)),
            refresh_token_expires_at: payload
                .refresh_token_expires_in
                .map(|seconds| now.saturating_add(seconds)),
            token_type: payload.token_type.clone(),
        })
    }

    fn should_refresh_access_token(&self, now: u64) -> bool {
        self.access_token_expires_at
            .is_some_and(|expires_at| expires_at <= now.saturating_add(ACCESS_TOKEN_REFRESH_SKEW_SECONDS))
    }

    fn can_refresh(&self, now: u64) -> bool {
        self.refresh_token.is_some()
            && self
                .refresh_token_expires_at
                .is_none_or(|expires_at| expires_at > now)
    }
}

#[derive(Debug)]
enum UserProfileFetchError {
    Unauthorized,
    Other(String),
}

#[tauri::command]
pub async fn github_auth_start(state: State<'_, AppState>) -> Result<DeviceCodeResponse, String> {
    let client_id = require_github_client_id(&state)?;
    let client = github_client()?;
    let response = client
        .post(GITHUB_DEVICE_CODE_URL)
        .header("Accept", "application/json")
        .form(&[("client_id", client_id.as_str())])
        .send()
        .await
        .map_err(|error| format!("发起 GitHub Device Flow 失败: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("GitHub Device Flow 初始化失败（{status}）: {body}"));
    }

    let payload = response
        .json::<DeviceCodeApiResponse>()
        .await
        .map_err(|error| format!("解析 GitHub Device Flow 响应失败: {error}"))?;

    set_pending_device_code(&state, Some(payload.device_code.clone()))?;

    Ok(DeviceCodeResponse {
        user_code: payload.user_code,
        verification_uri: payload.verification_uri,
        expires_in: payload.expires_in,
        interval: payload.interval.unwrap_or(DEFAULT_POLL_INTERVAL_SECONDS),
    })
}

#[tauri::command]
pub async fn github_auth_poll(
    state: State<'_, AppState>,
    progress: Channel<AuthEvent>,
    interval_seconds: Option<u64>,
) -> Result<UserProfile, String> {
    let client_id = require_github_client_id(&state)?;
    let device_code = get_pending_device_code(&state)?
        .ok_or_else(|| "当前没有待完成的 GitHub 授权请求".to_string())?;
    let client = github_client()?;
    let mut poll_interval = interval_seconds
        .unwrap_or(DEFAULT_POLL_INTERVAL_SECONDS)
        .max(1);
    let mut attempt = 0_u32;

    loop {
        tokio::time::sleep(Duration::from_secs(poll_interval)).await;
        attempt += 1;
        let _ = progress.send(AuthEvent::Polling {
            attempt,
            interval_seconds: poll_interval,
            message: "等待浏览器授权...".to_string(),
        });

        let response = client
            .post(GITHUB_ACCESS_TOKEN_URL)
            .header("Accept", "application/json")
            .form(&[
                ("client_id", client_id.as_str()),
                ("device_code", device_code.as_str()),
                ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
            ])
            .send()
            .await
            .map_err(|error| format!("轮询 GitHub 授权状态失败: {error}"))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            clear_pending_device_code(&state)?;
            return Err(format!("GitHub 授权轮询失败（{status}）: {body}"));
        }

        let payload = response
            .json::<AccessTokenApiResponse>()
            .await
            .map_err(|error| format!("解析 GitHub 授权轮询响应失败: {error}"))?;

        if payload.access_token.is_some() {
            let session = StoredGithubSession::from_token_payload(&payload, unix_timestamp_now()?)?;
            store_session(&session)?;
            match fetch_user_profile(&client, &session.access_token).await {
                Ok(user) => {
                    clear_pending_device_code(&state)?;
                    let _ = progress.send(AuthEvent::Success {
                        login: user.login.clone(),
                        message: "GitHub 授权成功".to_string(),
                    });
                    return Ok(user);
                }
                Err(UserProfileFetchError::Unauthorized) | Err(UserProfileFetchError::Other(_)) => {
                    let _ = delete_stored_session();
                    clear_pending_device_code(&state)?;
                    return Err("GitHub 用户信息校验失败，请重新登录".to_string());
                }
            }
        }

        match payload.error.as_deref() {
            Some("authorization_pending") => continue,
            Some("slow_down") => {
                poll_interval = next_poll_interval(poll_interval, payload.interval);
                let _ = progress.send(AuthEvent::SlowDown {
                    interval_seconds: poll_interval,
                    message: "GitHub 要求放慢轮询速度，已自动延长等待时间".to_string(),
                });
            }
            Some(error_code) => {
                clear_pending_device_code(&state)?;
                return Err(describe_device_flow_error(
                    error_code,
                    payload.error_description.as_deref(),
                ));
            }
            None => {
                clear_pending_device_code(&state)?;
                return Err("GitHub 未返回 access token".to_string());
            }
        }
    }
}

#[tauri::command]
pub async fn check_auth_status(state: State<'_, AppState>) -> Result<Option<UserProfile>, String> {
    let mut session = match load_stored_session()? {
        Some(session) => session,
        None => return Ok(None),
    };
    let client_id = require_github_client_id(&state)?;
    let client = github_client()?;
    let now = unix_timestamp_now()?;

    if session.should_refresh_access_token(now) {
        match refresh_user_access_token(&client, &client_id, &session).await? {
            Some(refreshed_session) => {
                store_session(&refreshed_session)?;
                session = refreshed_session;
            }
            None => {
                let _ = delete_stored_session();
                return Ok(None);
            }
        }
    }

    match fetch_user_profile(&client, &session.access_token).await {
        Ok(user) => Ok(Some(user)),
        Err(UserProfileFetchError::Unauthorized) => {
            match refresh_user_access_token(&client, &client_id, &session).await? {
                Some(refreshed_session) => {
                    store_session(&refreshed_session)?;
                    match fetch_user_profile(&client, &refreshed_session.access_token).await {
                        Ok(user) => Ok(Some(user)),
                        Err(UserProfileFetchError::Unauthorized) => {
                            let _ = delete_stored_session();
                            Ok(None)
                        }
                        Err(UserProfileFetchError::Other(message)) => Err(message),
                    }
                }
                None => {
                    let _ = delete_stored_session();
                    Ok(None)
                }
            }
        }
        Err(UserProfileFetchError::Other(message)) => Err(message),
    }
}

#[tauri::command]
pub fn github_logout(state: State<'_, AppState>) -> Result<(), String> {
    clear_pending_device_code(&state)?;
    match delete_stored_session() {
        Ok(()) | Err(KeyringMessage::NoEntry) => Ok(()),
        Err(KeyringMessage::Other(message)) => Err(message),
    }
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    if !is_allowed_browser_url(&url) {
        return Err("仅允许打开 GitHub 授权链接".to_string());
    }

    open_url_in_system_browser(&url)
}

fn github_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .build()
        .map_err(|error| format!("初始化 GitHub HTTP 客户端失败: {error}"))
}

fn require_github_client_id(state: &State<'_, AppState>) -> Result<String, String> {
    let client_id = state.github_client_id.trim();
    if client_id.is_empty() {
        Err("当前应用构建未嵌入 GitHub App client_id，无法启动 GitHub 登录".to_string())
    } else {
        Ok(client_id.to_string())
    }
}

fn get_pending_device_code(state: &State<'_, AppState>) -> Result<Option<String>, String> {
    state
        .pending_device_code
        .lock()
        .map(|guard| guard.clone())
        .map_err(|_| "获取待授权 Device Code 失败".to_string())
}

fn set_pending_device_code(
    state: &State<'_, AppState>,
    value: Option<String>,
) -> Result<(), String> {
    let mut guard = state
        .pending_device_code
        .lock()
        .map_err(|_| "更新待授权 Device Code 失败".to_string())?;
    *guard = value;
    Ok(())
}

fn clear_pending_device_code(state: &State<'_, AppState>) -> Result<(), String> {
    set_pending_device_code(state, None)
}

async fn fetch_user_profile(
    client: &reqwest::Client,
    token: &str,
) -> Result<UserProfile, UserProfileFetchError> {
    let response = client
        .get(GITHUB_USER_URL)
        .header("Accept", GITHUB_API_ACCEPT)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|error| UserProfileFetchError::Other(format!("读取 GitHub 用户信息失败: {error}")))?;

    if response.status() == reqwest::StatusCode::UNAUTHORIZED {
        return Err(UserProfileFetchError::Unauthorized);
    }

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(UserProfileFetchError::Other(format!(
            "GitHub 用户信息校验失败（{status}）: {body}"
        )));
    }

    response
        .json::<UserProfile>()
        .await
        .map_err(|error| UserProfileFetchError::Other(format!("解析 GitHub 用户信息失败: {error}")))
}

async fn refresh_user_access_token(
    client: &reqwest::Client,
    client_id: &str,
    session: &StoredGithubSession,
) -> Result<Option<StoredGithubSession>, String> {
    let now = unix_timestamp_now()?;
    if !session.can_refresh(now) {
        return Ok(None);
    }

    let refresh_token = session
        .refresh_token
        .as_deref()
        .ok_or_else(|| "当前会话缺少 refresh token，无法续期".to_string())?;
    let response = client
        .post(GITHUB_ACCESS_TOKEN_URL)
        .header("Accept", "application/json")
        .form(&[
            ("client_id", client_id),
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token),
        ])
        .send()
        .await
        .map_err(|error| format!("刷新 GitHub user access token 失败: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("GitHub token 刷新失败（{status}）: {body}"));
    }

    let payload = response
        .json::<AccessTokenApiResponse>()
        .await
        .map_err(|error| format!("解析 GitHub token 刷新响应失败: {error}"))?;

    if payload.access_token.is_some() {
        return StoredGithubSession::from_token_payload(&payload, now).map(Some);
    }

    match payload.error.as_deref() {
        Some("bad_refresh_token") | Some("incorrect_client_credentials") => Ok(None),
        Some(error_code) => Err(describe_refresh_error(
            error_code,
            payload.error_description.as_deref(),
        )),
        None => Err("GitHub 未返回新的 user access token".to_string()),
    }
}

fn keyring_entry() -> Result<Entry, String> {
    Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
        .map_err(|error| format!("初始化系统钥匙串条目失败: {error}"))
}

fn load_stored_session() -> Result<Option<StoredGithubSession>, String> {
    let entry = keyring_entry()?;
    let raw_value = match entry.get_password().map_err(keyring_error_to_string) {
        Ok(value) => value,
        Err(KeyringMessage::NoEntry) => return Ok(None),
        Err(KeyringMessage::Other(message)) => return Err(message),
    };

    parse_stored_session(&raw_value).map(Some)
}

fn parse_stored_session(raw_value: &str) -> Result<StoredGithubSession, String> {
    serde_json::from_str::<StoredGithubSession>(raw_value).or_else(|_| {
        if raw_value.trim().is_empty() {
            Err("系统钥匙串中的 GitHub 会话为空".to_string())
        } else {
            Ok(StoredGithubSession {
                access_token: raw_value.to_string(),
                refresh_token: None,
                access_token_expires_at: None,
                refresh_token_expires_at: None,
                token_type: Some("bearer".to_string()),
            })
        }
    })
}

fn store_session(session: &StoredGithubSession) -> Result<(), String> {
    let raw_value = serde_json::to_string(session)
        .map_err(|error| format!("序列化 GitHub 会话失败: {error}"))?;
    keyring_entry()?
        .set_password(&raw_value)
        .map_err(|error| format!("写入系统钥匙串失败: {error}"))
}

fn delete_stored_session() -> Result<(), KeyringMessage> {
    keyring_entry()
        .map_err(KeyringMessage::Other)?
        .delete_credential()
        .map_err(keyring_error_to_string)
}

fn unix_timestamp_now() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .map_err(|error| format!("读取系统时间失败: {error}"))
}

fn next_poll_interval(current: u64, suggested: Option<u64>) -> u64 {
    suggested
        .unwrap_or_else(|| current.saturating_add(5))
        .max(1)
}

fn describe_device_flow_error(error_code: &str, description: Option<&str>) -> String {
    match error_code {
        "expired_token" => "GitHub 验证码已过期，请重新登录".to_string(),
        "access_denied" => "GitHub 授权已被取消".to_string(),
        "incorrect_client_credentials" => "当前应用内置的 GitHub App client_id 无效".to_string(),
        "device_flow_disabled" => "当前 GitHub App 未启用 Device Flow".to_string(),
        "incorrect_device_code" | "bad_verification_code" => {
            "当前设备验证码无效，请重新登录".to_string()
        }
        "unsupported_grant_type" => "GitHub Device Flow grant_type 不受支持".to_string(),
        other => description
            .map(ToString::to_string)
            .unwrap_or_else(|| format!("GitHub 授权失败: {other}")),
    }
}

fn describe_refresh_error(error_code: &str, description: Option<&str>) -> String {
    match error_code {
        "bad_refresh_token" => "GitHub refresh token 已失效，请重新登录".to_string(),
        "incorrect_client_credentials" => "当前应用内置的 GitHub App client_id 无效".to_string(),
        "unsupported_grant_type" => "GitHub refresh_token grant_type 不受支持".to_string(),
        other => description
            .map(ToString::to_string)
            .unwrap_or_else(|| format!("GitHub token 刷新失败: {other}")),
    }
}

fn is_allowed_browser_url(url: &str) -> bool {
    url.starts_with(GITHUB_BROWSER_URL_PREFIX)
}

fn open_url_in_system_browser(url: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.arg(url);
        command
    };

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("cmd");
        command.args(["/C", "start", "", url]);
        command
    };

    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = {
        let mut command = Command::new("xdg-open");
        command.arg(url);
        command
    };

    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("打开系统浏览器失败: {error}"))
}

enum KeyringMessage {
    NoEntry,
    Other(String),
}

fn keyring_error_to_string(error: KeyringError) -> KeyringMessage {
    match error {
        KeyringError::NoEntry => KeyringMessage::NoEntry,
        other => KeyringMessage::Other(format!("访问系统钥匙串失败: {other}")),
    }
}

#[cfg(test)]
mod tests {
    use super::{
        describe_device_flow_error, describe_refresh_error, is_allowed_browser_url,
        next_poll_interval, parse_stored_session, StoredGithubSession,
        ACCESS_TOKEN_REFRESH_SKEW_SECONDS,
    };

    #[test]
    fn next_poll_interval_prefers_github_suggestion() {
        assert_eq!(next_poll_interval(5, Some(11)), 11);
        assert_eq!(next_poll_interval(5, None), 10);
    }

    #[test]
    fn describe_device_flow_error_maps_known_codes() {
        assert_eq!(
            describe_device_flow_error("expired_token", None),
            "GitHub 验证码已过期，请重新登录",
        );
        assert_eq!(
            describe_device_flow_error("access_denied", None),
            "GitHub 授权已被取消",
        );
        assert_eq!(
            describe_device_flow_error("device_flow_disabled", None),
            "当前 GitHub App 未启用 Device Flow",
        );
        assert_eq!(
            describe_device_flow_error("unknown_error", Some("fallback")),
            "fallback",
        );
    }

    #[test]
    fn describe_refresh_error_maps_known_codes() {
        assert_eq!(
            describe_refresh_error("bad_refresh_token", None),
            "GitHub refresh token 已失效，请重新登录",
        );
        assert_eq!(
            describe_refresh_error("unknown_error", Some("fallback")),
            "fallback",
        );
    }

    #[test]
    fn github_browser_url_is_whitelisted() {
        assert!(is_allowed_browser_url("https://github.com/login/device"));
        assert!(!is_allowed_browser_url("http://github.com/login/device"));
        assert!(!is_allowed_browser_url("https://example.com/login/device"));
    }

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

        assert_eq!(parse_stored_session(&raw_value).expect("parsed session"), session);
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
}

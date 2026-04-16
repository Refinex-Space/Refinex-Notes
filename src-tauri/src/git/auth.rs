use crate::github_session::load_access_token;
use git2::{Cred, RemoteCallbacks};

pub fn remote_callbacks() -> Result<RemoteCallbacks<'static>, String> {
    let token = load_access_token()?;
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

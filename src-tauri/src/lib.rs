mod ai;
mod commands;
mod db;
mod git;
mod github_session;
mod search;
mod state;
mod watcher;

use crate::state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let github_client_id = std::env::var("GITHUB_APP_CLIENT_ID")
                .ok()
                .filter(|value| !value.trim().is_empty())
                .or_else(|| {
                    std::env::var("GITHUB_CLIENT_ID")
                        .ok()
                        .filter(|value| !value.trim().is_empty())
                })
                .or_else(|| {
                    option_env!("GITHUB_APP_CLIENT_ID")
                        .map(ToString::to_string)
                        .filter(|value| !value.trim().is_empty())
                })
                .or_else(|| {
                    option_env!("GITHUB_CLIENT_ID")
                        .map(ToString::to_string)
                        .filter(|value| !value.trim().is_empty())
                })
                .unwrap_or_default()
                .to_string();
            let database = db::init_database(&app.handle())?;

            app.manage(AppState::new(
                app.handle().clone(),
                github_client_id,
                database,
            ));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ai::ai_chat_stream,
            commands::ai::ai_cancel_stream,
            commands::ai::ai_list_providers,
            commands::ai::ai_list_models,
            commands::ai::ai_test_connection,
            commands::auth::github_auth_start,
            commands::auth::github_auth_poll,
            commands::auth::check_auth_status,
            commands::auth::github_logout,
            commands::auth::open_external_url,
            commands::files::open_workspace,
            commands::files::close_workspace,
            commands::files::list_recent_workspaces,
            commands::files::remove_recent_workspace,
            commands::files::read_file_tree,
            commands::files::read_file,
            commands::files::write_file,
            commands::files::create_file,
            commands::files::create_dir,
            commands::files::delete_file,
            commands::files::rename_file,
            commands::git::git_init_repo,
            commands::git::git_clone_repo,
            commands::git::git_get_branch,
            commands::git::git_get_status,
            commands::git::git_commit,
            commands::git::git_push,
            commands::git::git_pull,
            commands::git::git_get_log,
            commands::git::git_get_diff,
            commands::git::git_get_commit_files,
            commands::git::git_get_commit_file_diff,
            commands::git::git_stage_all,
            commands::git::git_stage_file,
            commands::git::git_unstage_file,
            commands::git::git_get_working_diff,
            commands::git::git_commit_staged,
            commands::git::git_start_sync,
            commands::git::git_stop_sync,
            commands::git::git_force_sync,
            commands::search::search_files,
            commands::search::search_fulltext,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

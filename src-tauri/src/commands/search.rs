use tauri::State;

use crate::search;
use crate::search::indexer;
use crate::state::AppState;

#[tauri::command]
pub fn search_files(state: State<'_, AppState>, query: String) -> Result<Vec<search::SearchResult>, String> {
    indexer::with_search_index(&state, |search_index| {
        Ok(search::search_files(search_index, &query, 20))
    })
}

#[tauri::command]
pub fn search_fulltext(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<search::SearchResult>, String> {
    indexer::with_search_index(&state, |search_index| {
        search::search_fulltext(search_index, &query, 20)
    })
}

#[cfg(test)]
mod tests {
    #[test]
    fn search_command_module_builds() {
        assert_eq!(2 + 2, 4);
    }
}

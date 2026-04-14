use nucleo_matcher::pattern::{AtomKind, CaseMatching, Normalization, Pattern};
use nucleo_matcher::{Config, Matcher};
use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FuzzyMatch {
    pub path: String,
    pub score: u32,
}

pub fn fuzzy_search(query: &str, candidates: &[String]) -> Vec<FuzzyMatch> {
    let normalized_query = query.trim();
    if normalized_query.is_empty() {
        return Vec::new();
    }

    let pattern = Pattern::new(
        normalized_query,
        CaseMatching::Ignore,
        Normalization::Smart,
        AtomKind::Fuzzy,
    );
    let mut matcher = Matcher::new(Config::DEFAULT.match_paths());

    let mut results = pattern
        .match_list(candidates.iter().map(String::as_str), &mut matcher)
        .into_iter()
        .map(|(path, score)| FuzzyMatch {
            path: path.to_string(),
            score,
        })
        .collect::<Vec<_>>();

    results.sort_by(|left, right| {
        right
            .score
            .cmp(&left.score)
            .then_with(|| left.path.cmp(&right.path))
    });
    results
}

#[cfg(test)]
mod tests {
    use super::fuzzy_search;

    #[test]
    fn fuzzy_search_ranks_best_path_match_first() {
        let candidates = vec![
            "Inbox/Quick Note.md".to_string(),
            "Projects/Refinex Search.md".to_string(),
            "Projects/Search Roadmap.md".to_string(),
        ];

        let results = fuzzy_search("ref srch", &candidates);
        assert_eq!(results[0].path, "Projects/Refinex Search.md");
    }

    #[test]
    fn fuzzy_search_returns_empty_on_blank_query() {
        let results = fuzzy_search("   ", &["Inbox/Note.md".to_string()]);
        assert!(results.is_empty());
    }
}

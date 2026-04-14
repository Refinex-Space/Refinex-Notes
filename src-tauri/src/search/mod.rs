pub mod fuzzy;
pub mod indexer;

use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use comrak::nodes::NodeValue;
use comrak::{Arena, Options, parse_document};
use serde::Serialize;
use tantivy::collector::TopDocs;
use tantivy::query::QueryParser;
use tantivy::schema::{
    DateOptions, Field, IndexRecordOption, Schema, TextFieldIndexing, TextOptions, Value,
};
use tantivy::{DateTime, Index, IndexReader, IndexWriter, ReloadPolicy, TantivyDocument, Term, doc};
use walkdir::WalkDir;

const INDEX_WRITER_MEMORY_BYTES: usize = 30_000_000;

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub path: String,
    pub title: String,
    pub snippet: String,
    pub score: f32,
}

#[derive(Clone, Copy)]
pub struct SearchSchemaFields {
    pub path: Field,
    pub title: Field,
    pub body: Field,
    pub tags: Field,
    pub modified: Field,
}

pub struct WorkspaceSearchIndex {
    pub workspace_path: PathBuf,
    index: Index,
    reader: IndexReader,
    writer: IndexWriter,
    fields: SearchSchemaFields,
    file_candidates: Vec<String>,
}

impl WorkspaceSearchIndex {
    pub fn file_candidates(&self) -> &[String] {
        &self.file_candidates
    }
}

pub fn build_index(workspace_path: &Path) -> Result<WorkspaceSearchIndex, String> {
    let schema = build_schema();
    let fields = extract_schema_fields(&schema)?;
    let index = Index::create_in_ram(schema);
    let reader = index
        .reader_builder()
        .reload_policy(ReloadPolicy::Manual)
        .try_into()
        .map_err(|error| format!("创建搜索 reader 失败: {error}"))?;
    let mut writer = index
        .writer(INDEX_WRITER_MEMORY_BYTES)
        .map_err(|error| format!("创建搜索 writer 失败: {error}"))?;

    let mut file_candidates = Vec::new();
    for note_path in markdown_files(workspace_path) {
        add_or_replace_document(workspace_path, &fields, &mut writer, &note_path)?;
        file_candidates.push(to_relative_path(workspace_path, &note_path)?);
    }

    writer
        .commit()
        .map_err(|error| format!("提交搜索索引失败: {error}"))?;
    reader
        .reload()
        .map_err(|error| format!("刷新搜索 reader 失败: {error}"))?;

    file_candidates.sort();
    Ok(WorkspaceSearchIndex {
        workspace_path: workspace_path.to_path_buf(),
        index,
        reader,
        writer,
        fields,
        file_candidates,
    })
}

pub fn update_index(search_index: &mut WorkspaceSearchIndex, file_path: &Path) -> Result<(), String> {
    let relative_path = to_relative_path(&search_index.workspace_path, file_path)?;
    search_index
        .writer
        .delete_term(Term::from_field_text(search_index.fields.path, &relative_path));

    if file_path.exists() && is_markdown_path(file_path) {
        add_or_replace_document(
            &search_index.workspace_path,
            &search_index.fields,
            &mut search_index.writer,
            file_path,
        )?;
        if !search_index.file_candidates.contains(&relative_path) {
            search_index.file_candidates.push(relative_path);
            search_index.file_candidates.sort();
        }
    } else {
        search_index
            .file_candidates
            .retain(|candidate| candidate != &relative_path);
    }

    search_index
        .writer
        .commit()
        .map_err(|error| format!("提交增量索引失败: {error}"))?;
    search_index
        .reader
        .reload()
        .map_err(|error| format!("刷新搜索 reader 失败: {error}"))?;

    Ok(())
}

pub fn search_fulltext(
    search_index: &WorkspaceSearchIndex,
    query: &str,
    limit: usize,
) -> Result<Vec<SearchResult>, String> {
    let normalized_query = query.trim();
    if normalized_query.is_empty() {
        return Ok(Vec::new());
    }

    let query_parser = QueryParser::for_index(
        &search_index.index,
        vec![
            search_index.fields.title,
            search_index.fields.body,
            search_index.fields.tags,
            search_index.fields.path,
        ],
    );
    let parsed_query = query_parser
        .parse_query(normalized_query)
        .map_err(|error| format!("解析全文搜索 query 失败: {error}"))?;

    let searcher = search_index.reader.searcher();
    let top_docs = searcher
        .search(&parsed_query, &TopDocs::with_limit(limit.max(1)))
        .map_err(|error| format!("执行全文搜索失败: {error}"))?;

    let mut results = Vec::new();
    for (score, address) in top_docs {
        let document: TantivyDocument = searcher
            .doc(address)
            .map_err(|error| format!("读取搜索结果文档失败: {error}"))?;
        let path = first_text_value(&document, search_index.fields.path).unwrap_or_default();
        let title = first_text_value(&document, search_index.fields.title)
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| fallback_title(&path));
        let body = first_text_value(&document, search_index.fields.body).unwrap_or_default();
        let snippet = build_snippet(&body, normalized_query);

        results.push(SearchResult {
            path,
            title,
            snippet,
            score,
        });
    }

    Ok(results)
}

pub fn search_files(
    search_index: &WorkspaceSearchIndex,
    query: &str,
    limit: usize,
) -> Vec<SearchResult> {
    fuzzy::fuzzy_search(query, search_index.file_candidates())
        .into_iter()
        .take(limit.max(1))
        .map(|candidate| SearchResult {
            title: fallback_title(&candidate.path),
            snippet: candidate.path.clone(),
            path: candidate.path,
            score: candidate.score as f32,
        })
        .collect()
}

pub fn markdown_to_plain_text(markdown: &str) -> String {
    let arena = Arena::new();
    let root = parse_document(&arena, markdown, &Options::default());
    let mut plain_text = String::new();

    for node in root.descendants() {
        match &node.data.borrow().value {
            NodeValue::Text(text) => append_segment(&mut plain_text, text),
            NodeValue::Code(code) => append_segment(&mut plain_text, &code.literal),
            NodeValue::CodeBlock(code) => append_segment(&mut plain_text, &code.literal),
            NodeValue::LineBreak | NodeValue::SoftBreak => plain_text.push('\n'),
            _ => {}
        }
    }

    collapse_whitespace(&plain_text)
}

pub fn extract_title(file_path: &Path, markdown: &str) -> String {
    for line in markdown.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("# ") {
            let title = rest.trim();
            if !title.is_empty() {
                return title.to_string();
            }
        }
    }

    file_path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .map(ToString::to_string)
        .unwrap_or_else(|| "Untitled".to_string())
}

pub fn extract_tags(markdown: &str) -> String {
    let mut tags = Vec::new();
    let mut in_frontmatter = false;

    for line in markdown.lines() {
        let trimmed = line.trim();
        if trimmed == "---" {
            in_frontmatter = !in_frontmatter;
            continue;
        }

        if in_frontmatter && trimmed.starts_with("tags:") {
            tags.push(trimmed.trim_start_matches("tags:").trim().to_string());
        }

        for token in trimmed.split_whitespace() {
            if token.starts_with('#') && token.len() > 1 {
                tags.push(token.trim_matches(|ch: char| !ch.is_alphanumeric() && ch != '#').to_string());
            }
        }
    }

    tags.join(" ")
}

fn build_schema() -> Schema {
    let text_with_positions = TextOptions::default()
        .set_stored()
        .set_indexing_options(
            TextFieldIndexing::default()
                .set_tokenizer("default")
                .set_index_option(IndexRecordOption::WithFreqsAndPositions),
        );
    let path_options = TextOptions::default()
        .set_stored()
        .set_indexing_options(
            TextFieldIndexing::default()
                .set_tokenizer("raw")
                .set_index_option(IndexRecordOption::WithFreqsAndPositions),
        );
    let date_options = DateOptions::default().set_indexed().set_stored().set_fast();

    let mut builder = Schema::builder();
    builder.add_text_field("path", path_options);
    builder.add_text_field("title", text_with_positions.clone());
    builder.add_text_field("body", text_with_positions.clone());
    builder.add_text_field("tags", text_with_positions);
    builder.add_date_field("modified", date_options);
    builder.build()
}

fn extract_schema_fields(schema: &Schema) -> Result<SearchSchemaFields, String> {
    Ok(SearchSchemaFields {
        path: schema
            .get_field("path")
            .map_err(|error| format!("读取 schema.path 失败: {error}"))?,
        title: schema
            .get_field("title")
            .map_err(|error| format!("读取 schema.title 失败: {error}"))?,
        body: schema
            .get_field("body")
            .map_err(|error| format!("读取 schema.body 失败: {error}"))?,
        tags: schema
            .get_field("tags")
            .map_err(|error| format!("读取 schema.tags 失败: {error}"))?,
        modified: schema
            .get_field("modified")
            .map_err(|error| format!("读取 schema.modified 失败: {error}"))?,
    })
}

fn markdown_files(workspace_path: &Path) -> Vec<PathBuf> {
    WalkDir::new(workspace_path)
        .into_iter()
        .filter_map(Result::ok)
        .map(|entry| entry.path().to_path_buf())
        .filter(|path| {
            path.is_file()
                && is_markdown_path(path)
                && !path
                    .components()
                    .any(|component| matches!(component.as_os_str().to_str(), Some(".git" | "node_modules")))
        })
        .collect()
}

fn add_or_replace_document(
    workspace_path: &Path,
    fields: &SearchSchemaFields,
    writer: &mut IndexWriter,
    file_path: &Path,
) -> Result<(), String> {
    let markdown = fs::read_to_string(file_path)
        .map_err(|error| format!("读取 Markdown 文件失败: {error}"))?;
    let relative_path = to_relative_path(workspace_path, file_path)?;
    let title = extract_title(file_path, &markdown);
    let body = markdown_to_plain_text(&markdown);
    let tags = extract_tags(&markdown);
    let modified = file_modified_datetime(file_path)?;

    writer.delete_term(Term::from_field_text(fields.path, &relative_path));
    writer
        .add_document(doc!(
            fields.path => relative_path,
            fields.title => title,
            fields.body => body,
            fields.tags => tags,
            fields.modified => modified,
        ))
        .map_err(|error| format!("写入搜索文档失败: {error}"))?;

    Ok(())
}

fn file_modified_datetime(file_path: &Path) -> Result<DateTime, String> {
    let metadata = fs::metadata(file_path).map_err(|error| format!("读取文件元数据失败: {error}"))?;
    let modified = metadata
        .modified()
        .map_err(|error| format!("读取文件修改时间失败: {error}"))?;
    let seconds = modified
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("转换文件修改时间失败: {error}"))?
        .as_secs() as i64;

    Ok(DateTime::from_timestamp_secs(seconds))
}

fn to_relative_path(workspace_path: &Path, file_path: &Path) -> Result<String, String> {
    file_path
        .strip_prefix(workspace_path)
        .map(|path| path.to_string_lossy().replace('\\', "/"))
        .map_err(|_| "文件路径超出当前工作区范围".to_string())
}

fn first_text_value(document: &TantivyDocument, field: Field) -> Option<String> {
    document
        .get_first(field)
        .and_then(|value| value.as_str())
        .map(ToString::to_string)
}

fn build_snippet(body: &str, query: &str) -> String {
    let plain_body = body.trim();
    if plain_body.is_empty() {
        return String::new();
    }

    let lower_body = plain_body.to_lowercase();
    let lower_query = query.to_lowercase();
    if let Some(position) = lower_body.find(&lower_query) {
        let start = position.saturating_sub(48);
        let end = (position + query.len() + 72).min(plain_body.len());
        return plain_body[start..end].trim().to_string();
    }

    plain_body.chars().take(120).collect()
}

fn append_segment(target: &mut String, value: &str) {
    if value.trim().is_empty() {
        return;
    }

    if !target.is_empty() {
        target.push(' ');
    }
    target.push_str(value.trim());
}

fn collapse_whitespace(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn fallback_title(path: &str) -> String {
    Path::new(path)
        .file_stem()
        .and_then(|stem| stem.to_str())
        .map(ToString::to_string)
        .unwrap_or_else(|| path.to_string())
}

fn is_markdown_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.eq_ignore_ascii_case("md"))
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::{build_index, extract_tags, markdown_to_plain_text, search_files, search_fulltext, update_index};
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn markdown_to_plain_text_strips_common_syntax() {
        let markdown = "# Title\n\n- item **bold**\n\n```rs\nfn main() {}\n```\n";
        let plain = markdown_to_plain_text(markdown);
        assert!(plain.contains("Title"));
        assert!(plain.contains("item"));
        assert!(plain.contains("bold"));
        assert!(plain.contains("fn main() {}"));
        assert!(!plain.contains("```"));
    }

    #[test]
    fn extract_tags_reads_frontmatter_and_hashtags() {
        let markdown = "---\ntags: rust, notes\n---\n\n# Title\n\nhello #search";
        let tags = extract_tags(markdown);
        assert!(tags.contains("rust"));
        assert!(tags.contains("notes"));
        assert!(tags.contains("#search"));
    }

    #[test]
    fn build_index_and_search_cover_fulltext_and_fuzzy() {
        let workspace = TempDir::new("search-build");
        write_note(
            workspace.path(),
            "Inbox/Quick Note.md",
            "# Quick Note\n\nTantivy indexing makes search fast.\n",
        );
        write_note(
            workspace.path(),
            "Projects/Refinex Search.md",
            "# Search Design\n\nNucleo fuzzy matching helps locate files.\n",
        );

        let mut search_index = build_index(workspace.path()).unwrap();
        let fulltext = search_fulltext(&search_index, "tantivy", 10).unwrap();
        assert_eq!(fulltext[0].path, "Inbox/Quick Note.md");
        assert!(fulltext[0].snippet.to_lowercase().contains("tantivy"));

        let fuzzy = search_files(&search_index, "ref srch", 10);
        assert_eq!(fuzzy[0].path, "Projects/Refinex Search.md");

        write_note(
            workspace.path(),
            "Inbox/Quick Note.md",
            "# Quick Note\n\nIncremental update works after edit.\n",
        );
        update_index(&mut search_index, &workspace.path().join("Inbox/Quick Note.md")).unwrap();
        let updated = search_fulltext(&search_index, "incremental", 10).unwrap();
        assert_eq!(updated[0].path, "Inbox/Quick Note.md");
    }

    fn write_note(root: &Path, relative_path: &str, content: &str) {
        let target = root.join(relative_path);
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(target, content).unwrap();
    }

    struct TempDir {
        path: PathBuf,
    }

    impl TempDir {
        fn new(label: &str) -> Self {
            let suffix = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let path = std::env::temp_dir().join(format!("refinex-notes-{label}-{suffix}"));
            fs::create_dir_all(&path).unwrap();
            Self { path }
        }

        fn path(&self) -> &Path {
            &self.path
        }
    }

    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }
}

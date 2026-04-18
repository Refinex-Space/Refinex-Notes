import type { Node as ProseMirrorNode } from "prosemirror-model";

import type { CommandPaletteItem, OutlineHeading } from "../types";
import type { NoteDocument } from "../types/notes";
import type { SearchResult } from "../types/search";

export function countWords(content: string): number {
  // Strip common markdown syntax that should not contribute to the word count.
  const stripped = content
    .replace(/^#{1,6}\s+/gm, "") // heading markers
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`[^`\n]+`/g, " ") // inline code
    .replace(/!\[.*?\]\(.*?\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → keep label text
    .replace(/[*_~>#|\\]/g, " "); // decoration characters

  // CJK Unified Ideographs (BMP only: covers all common Chinese/Japanese/Korean).
  // Supplementary planes intentionally excluded to avoid u-flag range-parsing issues.
  const CJK_RE =
    /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u2e80-\u2eff\u2f00-\u2fdf]/g;

  let count = 0;

  // Count each CJK character as one unit.
  const cjk = stripped.match(CJK_RE);
  if (cjk) count += cjk.length;

  // Count non-CJK words as whitespace-delimited Latin/numeral sequences.
  const latin = stripped.replace(CJK_RE, " ").match(/[a-zA-Z0-9]+/g);
  if (latin) count += latin.length;

  return count;
}

export function createNextNotePath(existingPaths: readonly string[]) {
  const baseDirectory = "Inbox";
  const baseName = "Quick Note";
  let index = 1;

  while (true) {
    const suffix = index === 1 ? "" : ` ${index}`;
    const candidate = `${baseDirectory}/${baseName}${suffix}.md`;
    if (!existingPaths.includes(candidate)) {
      return candidate;
    }
    index += 1;
  }
}

export function buildCommandPaletteItems(
  documents: Record<string, NoteDocument>,
): CommandPaletteItem[] {
  return Object.values(documents)
    .map((document) => ({
      id: `file:${document.path}`,
      title: document.name,
      description: document.path,
      keywords: [document.name, document.path, document.language],
      group: "files" as const,
      path: document.path,
    }))
    .sort((left, right) =>
      left.description.localeCompare(right.description, "en"),
    );
}

export function searchResultsToCommandPaletteItems(
  results: readonly SearchResult[],
): CommandPaletteItem[] {
  return results.map((result) => ({
    id: `search:${result.path}`,
    title: result.title,
    description: result.path,
    keywords: [result.title, result.path, result.snippet],
    group: "files" as const,
    path: result.path,
  }));
}

export function findHeadingPosition(
  doc: ProseMirrorNode,
  heading: Pick<OutlineHeading, "text" | "level">,
) {
  let position: number | null = null;

  doc.descendants((node, pos) => {
    if (node.type.name !== "heading") {
      return true;
    }

    if (
      node.attrs.level === heading.level &&
      node.textContent === heading.text
    ) {
      position = pos;
      return false;
    }

    return true;
  });

  return position;
}

export function findTextPosition(doc: ProseMirrorNode, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return null;
  }

  let position: number | null = null;

  doc.descendants((node, pos) => {
    if (!node.isText) {
      return true;
    }

    const text = node.text?.toLowerCase() ?? "";
    const index = text.indexOf(normalizedQuery);
    if (index === -1) {
      return true;
    }

    position = pos + index + 1;
    return false;
  });

  return position;
}

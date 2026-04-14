import type { Node as ProseMirrorNode } from "prosemirror-model";

import type { CommandPaletteItem, OutlineHeading } from "../types";
import type { NoteDocument } from "../types/notes";

export function countWords(content: string) {
  const matches = content.trim().match(/\S+/g);
  return matches?.length ?? 0;
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
    .sort((left, right) => left.description.localeCompare(right.description, "en"));
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

    if (node.attrs.level === heading.level && node.textContent === heading.text) {
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

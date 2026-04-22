import type { FileNode } from "../../types/notes";

export interface DocumentMentionTrigger {
  query: string;
  start: number;
  end: number;
}

export interface DocumentMentionOption {
  path: string;
  title: string;
  subtitle: string;
  isCurrentDocument?: boolean;
}

export function getDocumentFileName(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

function getParentPath(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments.slice(0, -1).join("/") || "工作区";
}

function normalizeDocumentTitle(path: string, explicitTitle?: string) {
  return (explicitTitle ?? getDocumentFileName(path)).replace(/\.md$/i, "");
}

export function toDocumentMentionOption(path: string, explicitTitle?: string): DocumentMentionOption {
  return {
    path,
    title: normalizeDocumentTitle(path, explicitTitle),
    subtitle: getParentPath(path),
  };
}

export function buildDocumentMentionText(path: string) {
  return `@${getDocumentFileName(path)}`;
}

export function getDocumentMentionTrigger(
  value: string,
  caretPosition: number,
): DocumentMentionTrigger | null {
  const safeCaret = Math.max(0, Math.min(caretPosition, value.length));
  const prefix = value.slice(0, safeCaret);
  const match = prefix.match(/(^|[\s(（[{])@([^\s@]*)$/);
  if (!match) {
    return null;
  }

  const query = match[2] ?? "";
  return {
    query,
    start: safeCaret - query.length - 1,
    end: safeCaret,
  };
}

export function removeDocumentMentionTrigger(
  value: string,
  trigger: DocumentMentionTrigger,
) {
  return replaceDocumentMentionTrigger(value, trigger, "");
}

export function replaceDocumentMentionTrigger(
  value: string,
  trigger: DocumentMentionTrigger,
  replacement: string,
) {
  const before = value.slice(0, trigger.start);
  const after = value.slice(trigger.end);
  const withReplacement = `${before}${replacement}${after}`;
  const nextValue =
    replacement.length === 0 && before.endsWith(" ") && after.startsWith(" ")
      ? `${before}${after.slice(1)}`
      : withReplacement;

  return {
    value: nextValue,
    caretPosition: before.length + replacement.length,
  };
}

export function buildDocumentMentionSections(args: {
  currentDocumentPath?: string | null;
  currentDocumentTitle?: string | null;
  candidatePaths: readonly string[];
  attachedDocumentPaths: readonly string[];
  expanded: boolean;
  visibleLimit?: number;
}) {
  const visibleLimit = args.visibleLimit ?? 5;
  const attached = new Set(args.attachedDocumentPaths);
  const linkedPageOptions = args.candidatePaths
    .filter(
      (path) =>
        path !== args.currentDocumentPath &&
        !attached.has(path),
    )
    .map((path) => toDocumentMentionOption(path));

  const visibleLinkedPages = args.expanded
    ? linkedPageOptions
    : linkedPageOptions.slice(0, visibleLimit);

  return {
    currentPage:
      args.currentDocumentPath && !attached.has(args.currentDocumentPath)
        ? {
            ...toDocumentMentionOption(
              args.currentDocumentPath,
              args.currentDocumentTitle ?? undefined,
            ),
            isCurrentDocument: true,
          }
        : null,
    visibleLinkedPages,
    hiddenCount: Math.max(0, linkedPageOptions.length - visibleLinkedPages.length),
  };
}

export function flattenDocumentPaths(nodes: readonly FileNode[]): string[] {
  return nodes.flatMap((node) => {
    if (!node.isDir) {
      return [node.path];
    }

    return node.children ? flattenDocumentPaths(node.children) : [];
  });
}

export function searchLoadedDocumentPaths(paths: readonly string[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [...paths];
  }

  return [...paths]
    .map((path) => {
      const fileName = getDocumentFileName(path).toLowerCase();
      const normalizedPath = path.toLowerCase();
      let score = -1;

      if (fileName === normalizedQuery) {
        score = 400;
      } else if (fileName.startsWith(normalizedQuery)) {
        score = 300;
      } else if (fileName.includes(normalizedQuery)) {
        score = 200;
      } else if (normalizedPath.includes(normalizedQuery)) {
        score = 100;
      }

      return { path, score };
    })
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .map((entry) => entry.path);
}

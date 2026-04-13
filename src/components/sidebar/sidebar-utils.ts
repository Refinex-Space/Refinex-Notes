import type { OutlineHeading } from "../../types";
import type { FileNode } from "../../types/notes";

function getParentPath(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments.slice(0, -1).join("/");
}

function withJoinedPath(parentPath: string, leafName: string) {
  return parentPath.length > 0 ? `${parentPath}/${leafName}` : leafName;
}

export function isMarkdownPath(path: string) {
  return /\.md$/i.test(path);
}

export function getNodeDirectoryPath(node: Pick<FileNode, "path" | "isDir">) {
  return node.isDir ? node.path : getParentPath(node.path);
}

export function getDefaultCreateFilePath(node: Pick<FileNode, "path" | "isDir">) {
  return withJoinedPath(getNodeDirectoryPath(node), "Untitled.md");
}

export function getDefaultCreateFolderPath(
  node: Pick<FileNode, "path" | "isDir">,
) {
  return withJoinedPath(getNodeDirectoryPath(node), "New Folder");
}

export function collectAccordionValues(nodes: readonly FileNode[]): string[] {
  return nodes.flatMap((node) =>
    node.isDir
      ? [node.path, ...collectAccordionValues(node.children ?? [])]
      : [],
  );
}

export function extractOutlineHeadings(markdown: string): OutlineHeading[] {
  return markdown
    .split(/\r?\n/)
    .map((line, index) => {
      const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
      if (!match) {
        return null;
      }

      const level = match[1].length;
      const text = match[2].trim();
      const slug = text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .trim()
        .replace(/\s+/g, "-");

      return {
        id: `${index + 1}:${slug || "heading"}`,
        text,
        level,
        line: index + 1,
      } satisfies OutlineHeading;
    })
    .filter((heading): heading is OutlineHeading => heading !== null);
}

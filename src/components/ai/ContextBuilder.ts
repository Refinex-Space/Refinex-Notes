import { extractOutlineHeadings } from "../sidebar/sidebar-utils";
import type { AIContext } from "../../types/ai";
import type { CursorPosition } from "../../types/editor";
import type { FileNode } from "../../types/notes";

const CONTEXT_RADIUS = 2000;
const MAX_DIRECTORY_LINES = 120;
const MAX_OPEN_FILES = 8;

export function cursorPositionToOffset(
  content: string,
  cursorPosition: CursorPosition,
) {
  const lines = content.split("\n");
  const lineIndex = Math.max(0, Math.min(cursorPosition.line - 1, lines.length - 1));
  const currentLine = lines[lineIndex] ?? "";
  const columnIndex = Math.max(0, Math.min(cursorPosition.col - 1, currentLine.length));
  const prefixLength = lines
    .slice(0, lineIndex)
    .reduce((total, line) => total + line.length + 1, 0);

  return prefixLength + columnIndex;
}

export function sliceWindowAroundOffset(
  content: string,
  cursorOffset: number,
  radius = CONTEXT_RADIUS,
) {
  const safeOffset = Math.max(0, Math.min(cursorOffset, content.length));
  const start = Math.max(0, safeOffset - radius);
  const end = Math.min(content.length, safeOffset + radius);
  const prefix = start > 0 ? "...\n" : "";
  const suffix = end < content.length ? "\n..." : "";

  return {
    start,
    end,
    excerpt: `${prefix}${content.slice(start, end)}${suffix}`,
  };
}

function flattenDirectoryTree(
  nodes: readonly FileNode[],
  depth = 0,
): string[] {
  return nodes.flatMap((node) => {
    const indent = "  ".repeat(depth);
    const marker = node.isDir ? `${node.name}/` : node.name;
    const current = `${indent}- ${marker}`;
    const children = node.children ? flattenDirectoryTree(node.children, depth + 1) : [];
    return [current, ...children];
  });
}

export function buildDirectoryTreeSummary(nodes: readonly FileNode[]) {
  const lines = flattenDirectoryTree(nodes).slice(0, MAX_DIRECTORY_LINES);
  return lines.join("\n");
}

export function buildAIContext(args: {
  content: string;
  filePath: string;
  cursorPosition: CursorPosition;
  selectedText?: string;
  directoryTree: string;
  openFiles: string[];
  recentFiles?: string[];
}): AIContext {
  return {
    currentDocument: {
      content: args.content,
      filePath: args.filePath,
      cursorPosition: cursorPositionToOffset(args.content, args.cursorPosition),
      selectedText: args.selectedText,
    },
    workspace: {
      directoryTree: args.directoryTree,
      openFiles: args.openFiles.slice(0, MAX_OPEN_FILES),
      recentFiles: args.recentFiles?.slice(0, MAX_OPEN_FILES),
    },
  };
}

function buildHeadingsSummary(markdown: string) {
  const headings = extractOutlineHeadings(markdown);
  if (headings.length === 0) {
    return "（当前文档没有标题层级）";
  }

  return headings
    .slice(0, 20)
    .map((heading) => `${"  ".repeat(Math.max(0, heading.level - 1))}- ${heading.text}`)
    .join("\n");
}

export function buildSystemPrompt(context: AIContext) {
  const { currentDocument, workspace } = context;
  const excerpt = sliceWindowAroundOffset(
    currentDocument.content,
    currentDocument.cursorPosition,
  );
  const selectedText =
    currentDocument.selectedText?.trim().length
      ? currentDocument.selectedText.trim()
      : "（当前没有选中文本）";
  const recentFiles =
    workspace.recentFiles && workspace.recentFiles.length > 0
      ? workspace.recentFiles.join("\n")
      : "（当前没有最近文件记录）";

  return [
    "你是 Refinex Notes 内置的 AI 写作助手。",
    "优先结合当前文档和工作区信息回答；如果上下文不足，请明确指出，不要编造未提供的内容。",
    "",
    "## 当前文档",
    `- 路径: ${currentDocument.filePath}`,
    `- 光标字符偏移: ${currentDocument.cursorPosition}`,
    "",
    "### 选中文本",
    selectedText,
    "",
    "### 标题层级摘要",
    buildHeadingsSummary(currentDocument.content),
    "",
    `### 光标附近上下文（前后各 ${CONTEXT_RADIUS} 字符）`,
    excerpt.excerpt,
    "",
    "## 工作区",
    "### 已打开文件",
    workspace.openFiles.length > 0
      ? workspace.openFiles.join("\n")
      : "（当前没有打开文件）",
    "",
    "### 最近文件",
    recentFiles,
    "",
    "### 目录树摘要",
    workspace.directoryTree.trim().length > 0
      ? workspace.directoryTree
      : "（当前目录树为空）",
  ].join("\n");
}

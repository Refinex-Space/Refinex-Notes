import type {
  SkillDefinition,
  SkillFrontmatter,
  SkillOutputMode,
  SkillSelectionMode,
} from "../types/skill";
import { aiService } from "./aiService";
import { createAIStreamHandler } from "../editor/commands/ai-insert";
import { buildAIContext, buildDirectoryTreeSummary, buildSystemPrompt } from "../components/ai/ContextBuilder";
import { getCurrentDocument, useNoteStore } from "../stores/noteStore";
import { useEditorStore } from "../stores/editorStore";
import { useAIStore } from "../stores/aiStore";
import type { EditorView } from "prosemirror-view";

const SKILL_MODULES = import.meta.glob("../../skills/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;
const VALID_OUTPUT_MODES = new Set<SkillOutputMode>([
  "replace-selection",
  "insert-at-cursor",
  "new-document",
  "chat-response",
]);
const VALID_SELECTION_MODES = new Set<SkillSelectionMode>([
  "required",
  "optional",
  "none",
]);

function stripQuotes(value: string) {
  return value.replace(/^['"]|['"]$/g, "");
}

function parseFrontmatter(source: string) {
  const match = source.match(FRONTMATTER_PATTERN);
  if (!match) {
    throw new Error("Skill 文件缺少合法 frontmatter");
  }

  const [, frontmatterSource, body] = match;
  const frontmatter = frontmatterSource
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((result, line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) {
        return result;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = stripQuotes(line.slice(separatorIndex + 1).trim());
      result[key] = value;
      return result;
    }, {});

  return { frontmatter, body: body.trim() };
}

function assertFrontmatter(
  frontmatter: Record<string, string>,
  fileName: string,
): SkillFrontmatter {
  const name = frontmatter.name?.trim();
  const description = frontmatter.description?.trim();
  const category = frontmatter.category?.trim();
  const outputMode = frontmatter.outputMode?.trim() as SkillOutputMode | undefined;
  const selectionMode = frontmatter.selectionMode?.trim() as
    | SkillSelectionMode
    | undefined;

  if (!name || !description || !category || !outputMode || !selectionMode) {
    throw new Error(`Skill \`${fileName}\` 缺少必填 frontmatter 字段`);
  }

  if (!VALID_OUTPUT_MODES.has(outputMode)) {
    throw new Error(`Skill \`${fileName}\` 使用了无效 outputMode: ${outputMode}`);
  }

  if (!VALID_SELECTION_MODES.has(selectionMode)) {
    throw new Error(
      `Skill \`${fileName}\` 使用了无效 selectionMode: ${selectionMode}`,
    );
  }

  return {
    name,
    description,
    category,
    outputMode,
    selectionMode,
  };
}

function pathToSkillId(path: string) {
  return path.split("/").pop()?.replace(/\.md$/i, "") ?? path;
}

function parseSkill(path: string, raw: string): SkillDefinition {
  const fileName = path.split("/").pop() ?? path;
  const id = pathToSkillId(path);
  const { frontmatter, body } = parseFrontmatter(raw);
  const normalized = assertFrontmatter(frontmatter, fileName);

  return {
    id,
    fileName,
    slashCommand: `ai-${id}`,
    body,
    raw,
    ...normalized,
  };
}

const BUILTIN_SKILLS = Object.entries(SKILL_MODULES)
  .map(([path, raw]) => parseSkill(path, raw))
  .sort((left, right) => left.fileName.localeCompare(right.fileName, "en"));

export function listBuiltinSkills() {
  return [...BUILTIN_SKILLS];
}

export function getBuiltinSkillById(skillId: string) {
  return BUILTIN_SKILLS.find((skill) => skill.id === skillId) ?? null;
}

export function getBuiltinSkillBySlashCommand(command: string) {
  return BUILTIN_SKILLS.find((skill) => skill.slashCommand === command) ?? null;
}

export function filterSkillsForSelection(
  skills: readonly SkillDefinition[],
  hasSelection: boolean,
) {
  return skills.filter((skill) => {
    if (skill.selectionMode === "optional") {
      return true;
    }

    return hasSelection
      ? skill.selectionMode !== "none"
      : skill.selectionMode !== "required";
  });
}

function getSelectedText(view: EditorView) {
  const { selection, doc } = view.state;
  if (selection.empty) {
    return undefined;
  }

  return doc.textBetween(selection.from, selection.to, "\n\n").trim() || undefined;
}

function buildSkillPrompt(skill: SkillDefinition, selectedText?: string) {
  return [
    `请执行内置 Skill：${skill.name}`,
    skill.body,
    selectedText
      ? `### 当前选中文本\n${selectedText}`
      : "### 当前选中文本\n（当前没有选中文本）",
    "只输出最终结果，不要解释过程，不要添加多余前言。",
  ].join("\n\n");
}

function buildSkillSystemPrompt(selectedText?: string) {
  const currentDocument = getCurrentDocument();
  const noteState = useNoteStore.getState();
  const editorState = useEditorStore.getState();

  return buildSystemPrompt(
    buildAIContext({
      content: currentDocument?.content ?? "",
      filePath: currentDocument?.path ?? "（当前没有打开文档）",
      cursorPosition: editorState.cursorPosition,
      selectedText,
      directoryTree: buildDirectoryTreeSummary(noteState.files),
      openFiles: noteState.openFiles,
      recentFiles: noteState.recentFiles,
    }),
  );
}

async function ensureActiveModelSelection() {
  const aiState = useAIStore.getState();
  if (!aiState.activeProvider || !aiState.activeModel || aiState.providers.length === 0) {
    await aiState.loadProviders();
  }

  const nextState = useAIStore.getState();
  if (!nextState.activeProvider || !nextState.activeModel) {
    throw new Error("当前没有可用的 AI Provider 或模型");
  }

  return {
    providerId: nextState.activeProvider,
    modelId: nextState.activeModel,
  };
}

export async function executeBuiltinSkill(args: {
  view: EditorView;
  skill: SkillDefinition;
}) {
  const { view, skill } = args;
  const selectedText = getSelectedText(view);

  if (skill.selectionMode === "required" && !selectedText) {
    throw new Error(`Skill \`${skill.name}\` 需要先选中文本`);
  }

  const promptContent = buildSkillPrompt(skill, selectedText);
  if (skill.outputMode === "chat-response") {
    await useAIStore.getState().streamPrompt({
      userMessage: `执行 Skill: ${skill.name}`,
      promptContent,
      selectedText,
    });
    return;
  }

  const { providerId, modelId } = await ensureActiveModelSelection();
  const handler = createAIStreamHandler(view, skill.outputMode, {
    requestId: `skill:${skill.id}`,
    skillId: skill.id,
  });

  try {
    await aiService.stream({
      messages: [
        {
          role: "system",
          content: buildSkillSystemPrompt(selectedText),
        },
        {
          role: "user",
          content: promptContent,
        },
      ],
      providerId,
      model: modelId,
      onToken: handler.onToken,
    });
    handler.onComplete();
    await handler.flush();
  } catch (error) {
    handler.onError();
    await handler.flush();
    throw error;
  }
}

export const skillService = {
  listBuiltinSkills,
  getBuiltinSkillById,
  getBuiltinSkillBySlashCommand,
  filterSkillsForSelection,
  executeBuiltinSkill,
};

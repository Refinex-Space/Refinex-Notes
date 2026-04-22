export type SkillOutputMode =
  | "replace-selection"
  | "insert-at-cursor"
  | "new-document"
  | "chat-response";

export type SkillSelectionMode = "required" | "optional" | "none";

export interface SkillFrontmatter {
  name: string;
  description: string;
  category: string;
  outputMode: SkillOutputMode;
  selectionMode: SkillSelectionMode;
}

export interface SkillDefinition extends SkillFrontmatter {
  id: string;
  fileName: string;
  slashCommand: string;
  body: string;
  raw: string;
}

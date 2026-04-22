import { describe, expect, it } from "vitest";

import {
  filterSkillsForSelection,
  getBuiltinSkillBySlashCommand,
  listBuiltinSkills,
} from "../skillService";

describe("skillService", () => {
  it("loads all builtin skills from the repository skill directory", () => {
    const skills = listBuiltinSkills();

    expect(skills).toHaveLength(8);
    expect(skills.map((skill) => skill.id)).toEqual([
      "continue-writing",
      "expand",
      "extract-key-points",
      "fix-grammar",
      "generate-outline",
      "rewrite",
      "summarize",
      "translate",
    ]);
    expect(getBuiltinSkillBySlashCommand("ai-expand")?.outputMode).toBe(
      "replace-selection",
    );
  });

  it("filters skills according to selection requirements", () => {
    const skills = listBuiltinSkills();

    expect(
      filterSkillsForSelection(skills, true).map((skill) => skill.id),
    ).toEqual(["expand", "fix-grammar", "rewrite", "translate"]);
    expect(
      filterSkillsForSelection(skills, false).map((skill) => skill.id),
    ).toEqual([
      "continue-writing",
      "extract-key-points",
      "generate-outline",
      "summarize",
    ]);
  });
});

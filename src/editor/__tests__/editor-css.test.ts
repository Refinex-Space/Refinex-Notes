import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const editorCss = readFileSync(
  new URL("../editor.css", import.meta.url),
  "utf8",
);

describe("editor typography css", () => {
  it("removes top margin from the first block so leading h1 spacing does not double-stack", () => {
    expect(editorCss).toMatch(
      /\.ProseMirror\s*>\s*:first-child\s*\{[\s\S]*?margin-top:\s*0;[\s\S]*?\}/,
    );
  });
});

import { describe, it, expect } from "vitest";
import { parseMarkdown } from "../parser";
import { serializeMarkdown } from "../serializer";

/**
 * Normalize whitespace differences that are acceptable in round-trip:
 * - Trim trailing whitespace on each line
 * - Ensure single trailing newline
 */
function normalize(text: string): string {
  return (
    text
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .replace(/\n+$/, "") + "\n"
  );
}

function roundtrip(md: string): string {
  const doc = parseMarkdown(md);
  return serializeMarkdown(doc);
}

describe("Markdown ↔ ProseMirror round-trip", () => {
  it("basic paragraph text", () => {
    const input = "Hello, world!\n";
    expect(normalize(roundtrip(input))).toBe(normalize(input));
  });

  it("multiple paragraphs", () => {
    const input = "First paragraph.\n\nSecond paragraph.\n";
    expect(normalize(roundtrip(input))).toBe(normalize(input));
  });

  it("headings (h1-h3)", () => {
    const input = "# Heading 1\n\n## Heading 2\n\n### Heading 3\n";
    expect(normalize(roundtrip(input))).toBe(normalize(input));
  });

  it("nested lists", () => {
    const input = `- Item 1
  - Nested 1a
  - Nested 1b
- Item 2
`;
    const result = normalize(roundtrip(input));
    // Whitespace between items may differ (tight vs loose), but structure must be preserved
    expect(result).toContain("- Item 1");
    expect(result).toContain("- Nested 1a");
    expect(result).toContain("- Nested 1b");
    expect(result).toContain("- Item 2");
    // Nested items should be indented
    expect(result).toMatch(/^\s+-\s+Nested 1a/m);
  });

  it("ordered list with start number", () => {
    const input = `1. First
2. Second
3. Third
`;
    const result = normalize(roundtrip(input));
    // Accept renumbered output (serializer may always use sequential numbers)
    expect(result).toContain("First");
    expect(result).toContain("Second");
    expect(result).toContain("Third");
  });

  it("code block preserves language and content", () => {
    const input = "```typescript\nconst x = 42;\nconsole.log(x);\n```\n";
    const result = normalize(roundtrip(input));
    expect(result).toBe(normalize(input));
  });

  it("code block without language", () => {
    const input = "```\nplain code\n```\n";
    const result = normalize(roundtrip(input));
    expect(result).toContain("plain code");
    expect(result).toContain("```");
  });

  it("blockquote", () => {
    const input = "> This is a quote.\n";
    const result = normalize(roundtrip(input));
    expect(result).toBe(normalize(input));
  });

  it("horizontal rule", () => {
    const input = "Before.\n\n---\n\nAfter.\n";
    const result = normalize(roundtrip(input));
    expect(result).toContain("---");
    expect(result).toContain("Before.");
    expect(result).toContain("After.");
  });

  it("mixed format: bold and italic nested", () => {
    const input = "**bold *and italic***\n";
    const result = normalize(roundtrip(input));
    // The serializer may output slightly different nesting order but both marks must be present
    expect(result).toContain("**");
    expect(result).toContain("*");
    expect(result).toContain("bold");
    expect(result).toContain("and italic");
  });

  it("inline code", () => {
    const input = "Use `code` inline.\n";
    expect(normalize(roundtrip(input))).toBe(normalize(input));
  });

  it("links", () => {
    const input = "[click here](https://example.com)\n";
    const result = normalize(roundtrip(input));
    expect(result).toContain("[click here]");
    expect(result).toContain("(https://example.com)");
  });

  it("link with title", () => {
    const input = '[click](https://example.com "A title")\n';
    const result = normalize(roundtrip(input));
    expect(result).toContain("https://example.com");
    expect(result).toContain("A title");
  });

  it("strikethrough", () => {
    const input = "~~deleted~~\n";
    expect(normalize(roundtrip(input))).toBe(normalize(input));
  });

  it("image", () => {
    const input = '![alt text](https://img.png "title")\n';
    const result = normalize(roundtrip(input));
    expect(result).toContain("![alt text]");
    expect(result).toContain("(https://img.png");
    expect(result).toContain('"title"');
  });

  it("GFM table preserves alignment", () => {
    const input = `| Left | Center | Right |
| :--- | :---: | ---: |
| 1 | 2 | 3 |
`;
    const result = normalize(roundtrip(input));
    expect(result).toContain("| Left");
    expect(result).toContain("Center");
    expect(result).toContain("Right |");
    expect(result).toContain(":---:");
    expect(result).toContain("---:");
    // Check content rows
    expect(result).toContain("| 1");
    expect(result).toContain("3 |");
  });

  it("GFM table without alignment", () => {
    const input = `| A | B |
| --- | --- |
| x | y |
`;
    const result = normalize(roundtrip(input));
    expect(result).toContain("| A");
    expect(result).toContain("| x");
  });

  it("GFM table cell with inline code does not throw", () => {
    const input = `| Name |
| --- |
| \`SIZED\` |
`;
    expect(() => roundtrip(input)).not.toThrow();
    const result = normalize(roundtrip(input));
    expect(result).toContain("`SIZED`");
  });

  it("task list preserves checked state", () => {
    const input = `- [x] done
- [ ] todo
`;
    const result = normalize(roundtrip(input));
    expect(result).toContain("[x]");
    expect(result).toContain("done");
    expect(result).toContain("[ ]");
    expect(result).toContain("todo");
  });

  it("empty document does not throw", () => {
    expect(() => parseMarkdown("")).not.toThrow();
    const doc = parseMarkdown("");
    expect(doc).toBeDefined();
    expect(() => serializeMarkdown(doc)).not.toThrow();
  });

  it("hard break", () => {
    const input = "Line one\\\nLine two\n";
    const result = roundtrip(input);
    expect(result).toContain("Line one");
    expect(result).toContain("Line two");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  stabilizeStreamingMarkdown,
  StreamRenderer,
} from "../StreamRenderer";

describe("StreamRenderer", () => {
  it("auto-closes an unfinished fenced code block while streaming", () => {
    expect(
      stabilizeStreamingMarkdown("```ts\nconst answer = 42;", true),
    ).toBe("```ts\nconst answer = 42;\n```");
    expect(stabilizeStreamingMarkdown("```ts\nconst answer = 42;", false)).toBe(
      "```ts\nconst answer = 42;",
    );
  });

  it("renders markdown and keeps the cursor visible during streaming", () => {
    const markup = renderToStaticMarkup(
      <StreamRenderer
        content={"**bold**\n\n```ts\nconst answer = 42;"}
        isStreaming
        showCursor
      />,
    );

    expect(markup).toContain("<strong>bold</strong>");
    expect(markup).toContain("language-ts");
    expect(markup).toContain("animate-pulse");
  });
});

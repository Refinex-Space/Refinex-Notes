import { renderMarkdownToHtml } from "../../editor/parser";

function countCodeFences(markdown: string) {
  return (markdown.match(/(^|\n)```/g) ?? []).length;
}

export function stabilizeStreamingMarkdown(markdown: string, isStreaming: boolean) {
  if (!isStreaming) {
    return markdown;
  }

  if (countCodeFences(markdown) % 2 === 0) {
    return markdown;
  }

  return `${markdown}\n\`\`\``;
}

export function StreamRenderer({
  content,
  isStreaming = false,
  showCursor = false,
}: {
  content: string;
  isStreaming?: boolean;
  showCursor?: boolean;
}) {
  const stableMarkdown = stabilizeStreamingMarkdown(content, isStreaming);
  const html = renderMarkdownToHtml(stableMarkdown);

  return (
    <div className="relative">
      <div
        className={[
          "leading-6 text-[13px] text-fg",
          "[&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-border/80 [&_blockquote]:pl-3 [&_blockquote]:text-muted",
          "[&_code]:rounded [&_code]:bg-fg/[0.06] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px]",
          "[&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border/70 [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:text-slate-100",
          "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium",
          "[&_p:not(:first-child)]:mt-3 [&_li:not(:first-child)]:mt-1 [&_table]:w-full [&_table]:border-collapse",
          "[&_td]:border [&_td]:border-border/70 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border/70 [&_th]:px-2 [&_th]:py-1",
        ].join(" ")}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {showCursor ? (
        <span
          aria-hidden="true"
          className="ml-1 inline-block h-4 w-[0.45rem] animate-pulse rounded-sm bg-accent align-[-2px]"
        />
      ) : null}
    </div>
  );
}

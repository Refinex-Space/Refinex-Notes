import { FolderOpen, GitBranch } from "lucide-react";

export interface GitEmptyStateProps {
  title: string;
  description: string;
}

export function GitEmptyState({ title, description }: GitEmptyStateProps) {
  return (
    <div className="flex h-full min-h-0 flex-col justify-center p-5">
      <section className="mx-auto w-full max-w-sm text-center">
        <div className="mt-6 space-y-2">
          <h3 className="text-[1.05rem] font-semibold tracking-tight text-fg">
            {title}
          </h3>
          <p className="text-sm leading-6 text-muted">{description}</p>
        </div>

        <div className="mt-6 inline-flex items-center gap-2 bg-[rgb(var(--color-bg)/0.72)] px-4 py-2 text-xs text-muted">
          <FolderOpen className="h-3.5 w-3.5 text-accent" />
          打开工作区后即可查看仓库状态
        </div>
      </section>
    </div>
  );
}

export default GitEmptyState;

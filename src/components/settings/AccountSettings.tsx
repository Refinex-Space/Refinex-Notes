import { LogOut, UserRound } from "lucide-react";

import { useAuthStore } from "../../stores/authStore";

export function AccountSettings() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-fg">账户</h2>
        <p className="text-sm leading-6 text-muted">
          当前仅展示 GitHub 账户信息与登出入口。
        </p>
      </header>

      {user ? (
        <div className="space-y-4 rounded-3xl border border-border/70 bg-bg/80 p-5">
          <div className="flex items-start gap-4">
            <img
              src={user.avatar_url}
              alt={user.name ?? user.login}
              className="h-16 w-16 rounded-2xl border border-border/70 object-cover"
            />
            <div className="min-w-0 space-y-1">
              <h3 className="truncate text-lg font-semibold text-fg">
                {user.name ?? user.login}
              </h3>
              <p className="truncate text-sm text-muted">@{user.login}</p>
              <p className="truncate text-sm text-muted">
                {user.email ?? "GitHub 未返回公开邮箱"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void logout();
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-500 transition hover:bg-rose-400/15"
          >
            <LogOut className="h-4 w-4" />
            登出 GitHub
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-3xl border border-dashed border-border/70 bg-bg/70 p-5 text-sm text-muted">
          <UserRound className="h-5 w-5 text-muted" />
          当前尚未连接 GitHub 账户。
        </div>
      )}
    </section>
  );
}

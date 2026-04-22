import { LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuthStore } from "../../stores/authStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { LoginScreen } from "./LoginScreen";

export function AccountStatus() {
  const user = useAuthStore((state) => state.user);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (user) {
      setLoginDialogOpen(false);
    }
  }, [user]);

  if (!user) {
    return (
      <TooltipProvider>
        <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <button
                  type="button"
                  aria-label="连接 GitHub"
                  className={[
                    "inline-flex h-6 items-center gap-1.5 rounded-full border border-border/60 bg-white/[0.03] px-2.5 text-[11px] text-muted transition",
                    "hover:border-accent/35 hover:bg-accent/10 hover:text-fg",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                  ].join(" ")}
                >
                  <UserRound className="h-3 w-3" />
                  <span>连接 GitHub</span>
                </button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">连接 GitHub</TooltipContent>
          </Tooltip>

          <DialogContent className="w-[min(32rem,calc(100vw-2rem))] overflow-hidden p-6">
            <div className="sr-only">
              <DialogTitle>连接 GitHub</DialogTitle>
              <DialogDescription>
                在应用内继续 GitHub Device Flow 授权。
              </DialogDescription>
            </div>
            <LoginScreen embedded />
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="GitHub 账号"
                className={[
                  "inline-flex h-7 w-7 items-center justify-center bg-white/[0.04] text-muted transition",
                  "hover:border-accent/35 hover:bg-accent/10 hover:text-fg",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                ].join(" ")}
              >
                <UserRound className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">GitHub 账号</TooltipContent>
        </Tooltip>

        <PopoverContent align="start" className="w-64 space-y-3">
          <div className="flex items-start gap-3">
            <img
              src={user.avatar_url}
              alt={user.name ?? user.login}
              className="h-10 w-10 rounded-full border border-border/70 object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">
                {user.name ?? user.login}
              </p>
              <p className="truncate text-xs text-muted">@{user.login}</p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex w-full items-center justify-between rounded-2xl border border-border/70 bg-white/[0.03] px-3 py-2 text-sm text-fg transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-500"
            onClick={() => {
              void logout();
            }}
          >
            <span>退出 GitHub</span>
            <LogOut className="h-4 w-4" />
          </button>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}

export default AccountStatus;

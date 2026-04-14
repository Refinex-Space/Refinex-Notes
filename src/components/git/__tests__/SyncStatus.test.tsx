import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SetupPanel } from "../SetupPanel";
import {
  formatLastSyncTime,
  syncIndicatorMeta,
} from "../SyncStatus";

describe("SyncStatus", () => {
  it("maps conflicted state to warning presentation", () => {
    expect(syncIndicatorMeta("conflicted").label).toBe("存在冲突");
    expect(syncIndicatorMeta("synced").label).toBe("已同步");
    expect(syncIndicatorMeta("dirty").label).toBe("同步中");
  });

  it("formats missing sync time with a fallback label", () => {
    expect(formatLastSyncTime(null)).toBe("尚无同步记录");
  });
});

describe("SetupPanel", () => {
  it("renders init and clone guidance", () => {
    const markup = renderToStaticMarkup(
      <SetupPanel
        workspacePath="/tmp/refinex"
        userLogin="refinex"
        isBusy={false}
        errorMessage={null}
        onInitRepo={vi.fn()}
        onCloneRepo={vi.fn()}
      />,
    );

    expect(markup).toContain("方案 A");
    expect(markup).toContain("方案 B");
    expect(markup).toContain("GitHub 已连接：refinex");
    expect(markup).toContain("https://github.com/owner/repo.git");
  });
});

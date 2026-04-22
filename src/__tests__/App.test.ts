import { describe, expect, it } from "vitest";

import { getStartupSurface, getWorkspaceSurfaceTitle } from "../App";

describe("App startup surface", () => {
  it("blocks only while auth restoration is unresolved", () => {
    expect(getStartupSurface(false, false)).toBe("splash");
    expect(getStartupSurface(true, false)).toBe("splash");
    expect(getStartupSurface(true, true)).toBe("workspace");
  });

  it("switches titlebar copy when settings surface is active", () => {
    expect(getWorkspaceSurfaceTitle("workspace", "Roadmap.md")).toBe(
      "Roadmap.md",
    );
    expect(getWorkspaceSurfaceTitle("settings", "Roadmap.md")).toBe(
      "应用设置",
    );
    expect(getWorkspaceSurfaceTitle("workspace")).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";

import { getStartupSurface } from "../App";

describe("App startup surface", () => {
  it("blocks only while auth restoration is unresolved", () => {
    expect(getStartupSurface(false)).toBe("splash");
    expect(getStartupSurface(true)).toBe("workspace");
  });
});

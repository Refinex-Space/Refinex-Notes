import { describe, expect, it } from "vitest";

import {
  TAB_RAIL_CLASS_NAME,
  TAB_TRIGGER_CLASS_NAME,
  TAB_WRAPPER_CLASS_NAME,
  getTabActionAvailability,
} from "../TabBar";

describe("TabBar", () => {
  it("exposes compact rail classes for the tab surface", () => {
    expect(TAB_RAIL_CLASS_NAME).toContain("rounded-[1.35rem]");
    expect(TAB_RAIL_CLASS_NAME).toContain("px-1 py-1");
    expect(TAB_WRAPPER_CLASS_NAME).toContain("min-w-[132px]");
    expect(TAB_TRIGGER_CLASS_NAME).toContain("h-8");
    expect(TAB_TRIGGER_CLASS_NAME).toContain("pr-8");
  });

  it("reports context action availability from tab position", () => {
    expect(
      getTabActionAvailability(
        ["Inbox/Welcome.md", "Projects/Roadmap.md", "Daily/Today.md"],
        "Projects/Roadmap.md",
      ),
    ).toEqual({
      canCloseAll: true,
      canCloseOthers: true,
      canCloseLeft: true,
      canCloseRight: true,
    });

    expect(
      getTabActionAvailability(["Inbox/Welcome.md"], "Inbox/Welcome.md"),
    ).toEqual({
      canCloseAll: true,
      canCloseOthers: false,
      canCloseLeft: false,
      canCloseRight: false,
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  TAB_RAIL_CLASS_NAME,
  TAB_TRIGGER_CLASS_NAME,
  TAB_WRAPPER_CLASS_NAME,
  getDropIndicatorFromPointer,
  getTabActionAvailability,
} from "../TabBar";

describe("TabBar", () => {
  it("exposes compact rail classes for the tab surface", () => {
    expect(TAB_RAIL_CLASS_NAME).toContain("h-9");
    expect(TAB_RAIL_CLASS_NAME).toContain("w-full");
    expect(TAB_WRAPPER_CLASS_NAME).toContain("min-w-[100px]");
    expect(TAB_TRIGGER_CLASS_NAME).toContain("h-full");
    expect(TAB_TRIGGER_CLASS_NAME).toContain("pr-7");
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

  it("derives pointer drop indicators without native draggable state", () => {
    const refs = {
      "Inbox/Welcome.md": {
        getBoundingClientRect: () =>
          ({
            left: 0,
            right: 100,
            top: 0,
            bottom: 32,
            width: 100,
            height: 32,
          }) as DOMRect,
      },
      "Projects/Roadmap.md": {
        getBoundingClientRect: () =>
          ({
            left: 100,
            right: 220,
            top: 0,
            bottom: 32,
            width: 120,
            height: 32,
          }) as DOMRect,
      },
    } as unknown as Record<string, HTMLDivElement | null>;

    expect(
      getDropIndicatorFromPointer(
        refs,
        ["Inbox/Welcome.md", "Projects/Roadmap.md"],
        "Inbox/Welcome.md",
        120,
        16,
      ),
    ).toEqual({
      path: "Projects/Roadmap.md",
      position: "before",
    });

    expect(
      getDropIndicatorFromPointer(
        refs,
        ["Inbox/Welcome.md", "Projects/Roadmap.md"],
        "Inbox/Welcome.md",
        200,
        16,
      ),
    ).toEqual({
      path: "Projects/Roadmap.md",
      position: "after",
    });
  });
});

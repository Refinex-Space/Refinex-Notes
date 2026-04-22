import { describe, expect, it } from "vitest";

import { commandItemClassName } from "../command";

describe("command item classes", () => {
  it("keeps hover and selected states visually stronger", () => {
    expect(commandItemClassName).toContain("hover:bg-accent/10");
    expect(commandItemClassName).toContain("hover:border-accent/20");
    expect(commandItemClassName).toContain("data-[selected=true]:bg-accent/16");
    expect(commandItemClassName).toContain(
      "data-[selected=true]:border-accent/35",
    );
  });
});

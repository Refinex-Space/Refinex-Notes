import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { resetAuthStore } from "../../../stores/authStore";
import { AccountStatus } from "../AccountStatus";

describe("AccountStatus", () => {
  afterEach(() => {
    resetAuthStore();
  });

  it("shows a visible GitHub entry point when unauthenticated", () => {
    const markup = renderToStaticMarkup(<AccountStatus />);

    expect(markup).toContain("连接 GitHub");
    expect(markup).toContain('aria-label="连接 GitHub"');
  });
});

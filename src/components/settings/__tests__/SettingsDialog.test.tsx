/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsDialog } from "../SettingsDialog";
import { resetSettingsStore, useSettingsStore } from "../../../stores/settingsStore";

function flushFrame() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

describe("SettingsDialog", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    resetSettingsStore();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it("shows a success toast after settings save resolves", async () => {
    const saveSettings = vi.fn().mockResolvedValue(undefined);

    useSettingsStore.setState({
      isLoaded: true,
      isLoading: false,
      isSaving: false,
      errorMessage: null,
      saveSettings,
      loadSettings: vi.fn(),
      clearError: vi.fn(),
    });

    await act(async () => {
      root.render(<SettingsDialog onClose={vi.fn()} />);
      await flushFrame();
    });

    const viewport = container.querySelector("ol");

    const saveButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("保存设置"),
    );

    expect(viewport?.className).toContain("!left-1/2");
    expect(viewport?.className).toContain("!w-[min(40rem,calc(100vw-2rem))]");
    expect(viewport?.className).toContain("!-translate-x-1/2");
    expect(saveButton).toBeTruthy();

    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushFrame();
    });

    expect(saveSettings).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("设置已保存");
  });

  it("does not show a success toast when saving fails", async () => {
    const saveSettings = vi.fn().mockRejectedValue(new Error("save failed"));

    useSettingsStore.setState({
      isLoaded: true,
      isLoading: false,
      isSaving: false,
      errorMessage: "保存失败",
      saveSettings,
      loadSettings: vi.fn(),
      clearError: vi.fn(),
    });

    await act(async () => {
      root.render(<SettingsDialog onClose={vi.fn()} />);
      await flushFrame();
    });

    const saveButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("保存设置"),
    );

    expect(saveButton).toBeTruthy();

    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushFrame();
    });

    expect(saveSettings).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("操作失败");
    expect(container.textContent).toContain("保存失败");
    expect(container.textContent).not.toContain("设置已保存");
  });

  it("shows settings errors in a toast instead of the header action row", async () => {
    useSettingsStore.setState({
      isLoaded: true,
      isLoading: false,
      isSaving: false,
      errorMessage: null,
      saveSettings: vi.fn(),
      loadSettings: vi.fn(),
      clearError: vi.fn(),
    });

    await act(async () => {
      root.render(<SettingsDialog onClose={vi.fn()} />);
      await flushFrame();
    });

    await act(async () => {
      useSettingsStore.setState({
        errorMessage: "OpenAI 响应失败（401 Unauthorized）",
      });
      await flushFrame();
    });

    expect(container.textContent).toContain("操作失败");
    expect(container.textContent).toContain("OpenAI 响应失败（401 Unauthorized）");
    expect(container.innerHTML).toContain("[overflow-wrap:anywhere]");
    expect(
      container.querySelector(".max-w-xs.truncate.text-sm.text-rose-500"),
    ).toBeNull();
  });
});

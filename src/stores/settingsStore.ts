import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import type { SettingsStore, SettingsStoreActions } from "../types/settings";

const updateSetting: SettingsStoreActions["updateSetting"] = () => {};

export const useSettingsStore = create<SettingsStore>()(
  immer(() => ({
    theme: "dark",
    fontSize: 16,
    fontFamily: "Inter",
    aiProviders: [],
    autoSync: false,
    syncInterval: 30,
    updateSetting,
    loadSettings: async () => {},
    saveSettings: async () => {},
  })),
);

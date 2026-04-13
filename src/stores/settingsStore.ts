import { create } from "zustand";

interface SettingsStoreState {
  theme: "dark" | "light" | "system";
  setTheme: (theme: SettingsStoreState["theme"]) => void;
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  theme: "dark",
  setTheme: (theme) => set({ theme }),
}));

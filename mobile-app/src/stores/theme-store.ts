import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const THEME_KEY = "salesvault_theme_mode";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: "system",

  setThemeMode: async (mode: ThemeMode) => {
    await SecureStore.setItemAsync(THEME_KEY, mode);
    set({ themeMode: mode });
  },

  initialize: async () => {
    const savedMode = await SecureStore.getItemAsync(THEME_KEY);
    if (savedMode) {
      set({ themeMode: savedMode as ThemeMode });
    }
  },
}));

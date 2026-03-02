import { useColorScheme as _useColorScheme } from "react-native";
import { useThemeStore } from "../src/stores/theme-store";

export function useColorScheme() {
  const systemScheme = _useColorScheme();
  const themeMode = useThemeStore((state) => state.themeMode);

  if (themeMode === "system") {
    return systemScheme;
  }
  return themeMode;
}

import React from "react";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { Colors } from "../../src/constants/theme";

export default function AuthLayout() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "fade",
      }}
    />
  );
}

import React from "react";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { Colors, FontWeight, FontSize } from "../../../src/constants/theme";

export default function ProfileLayout() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: FontWeight.semibold,
          fontSize: FontSize.lg,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}

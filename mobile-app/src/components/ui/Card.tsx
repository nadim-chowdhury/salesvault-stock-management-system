import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, BorderRadius, Spacing, Shadow } from "../../constants/theme";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
  variant?: "elevated" | "outlined" | "flat";
}

export default function Card({
  children,
  style,
  noPadding,
  variant = "elevated",
}: CardProps) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const isDark = scheme === "dark";

  const cardStyle = [
    styles.card,
    { backgroundColor: colors.surface },
    variant === "elevated" && {
      ...Shadow.sm,
      // Adjust shadow for dark mode to be more subtle or use elevation only
      shadowOpacity: isDark ? 0.2 : 0.05,
      borderWidth: isDark ? 1 : 0,
      borderColor: colors.border,
    },
    variant === "outlined" && {
      borderWidth: 1,
      borderColor: colors.border,
    },
    variant === "flat" && {
      borderWidth: 0,
      backgroundColor: colors.surfaceSecondary,
    },
    !noPadding && styles.padding,
    style,
  ];

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  padding: {
    padding: Spacing.lg,
  },
});

import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import {
  Colors,
  BorderRadius,
  FontSize,
  FontWeight,
  Spacing,
} from "../../constants/theme";

interface BadgeProps {
  text: string;
  variant?: "success" | "danger" | "warning" | "info" | "default";
}

export default function Badge({ text, variant = "default" }: BadgeProps) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const getColors = () => {
    switch (variant) {
      case "success":
        return { bg: colors.successLight, text: colors.success };
      case "danger":
        return { bg: colors.dangerLight, text: colors.danger };
      case "warning":
        return { bg: colors.warningLight, text: colors.warning };
      case "info":
        return { bg: colors.infoLight, text: colors.info };
      default:
        return { bg: colors.surfaceSecondary, text: colors.textSecondary };
    }
  };

  const badgeColors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
      <Text style={[styles.text, { color: badgeColors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: "uppercase",
  },
});

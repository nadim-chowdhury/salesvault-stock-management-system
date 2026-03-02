import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  Shadow,
  BorderRadius,
} from "../../constants/theme";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  subtitle?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  color,
  subtitle,
}: StatCardProps) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const accentColor = color || colors.primary;

  return (
    <View
      style={[
        styles.card,
        Shadow.sm,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: accentColor + "15" }]}
      >
        <Ionicons name={icon} size={20} color={accentColor} />
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.title, { color: colors.textMuted }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 140,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  value: {
    fontSize: FontSize["2xl"],
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  title: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
});

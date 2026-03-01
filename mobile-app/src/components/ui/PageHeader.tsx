import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors, Spacing, FontSize, FontWeight } from "../../constants/theme";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export default function PageHeader({
  title,
  showBack = false,
  right,
}: PageHeaderProps) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();

  return (
    <View
      style={[
        styles.header,
        {
          borderBottomColor: colors.borderLight,
          backgroundColor: colors.surface,
        },
      ]}
    >
      {showBack && (
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
      )}

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      {right ?? <View style={styles.sidePlaceholder} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  title: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  sidePlaceholder: {
    width: 28,
  },
});

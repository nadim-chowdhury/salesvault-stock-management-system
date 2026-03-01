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
import { StatusBar } from "expo-status-bar";
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
    <>
      <StatusBar style="light" />
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.primary,
            borderBottomColor: colors.primary,
          },
        ]}
      >
        <View style={styles.sideContainer}>
          {showBack && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.title, { color: "#FFFFFF" }]} numberOfLines={1}>
          {title}
        </Text>

        <View style={[styles.sideContainer, { alignItems: "flex-end" }]}>
          {right}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    height: 64,
    borderBottomWidth: 1,
  },
  sideContainer: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: FontWeight.bold,
    textAlign: "center",
  },
});

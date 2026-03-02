import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../src/services/api";
import { Endpoints } from "../../../src/constants/api";
import { useThemeStore } from "../../../src/stores/theme-store";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadow,
} from "../../../src/constants/theme";
import Button from "../../../src/components/ui/Button";
import Input from "../../../src/components/ui/Input";
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from "../../../src/components/ui/PageHeader";

export default function EditUserScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { setThemeMode } = useThemeStore();

  const toggleTheme = () => {
    const nextMode = scheme === "light" ? "dark" : "light";
    setThemeMode(nextMode);
  };

  const {
    id,
    name: initialName,
    role: initialRole,
  } = useLocalSearchParams<{ id: string; name: string; role: string }>();

  const [name, setName] = useState(initialName || "");
  const [role, setRole] = useState(initialRole || "SALESPERSON");
  const [loading, setLoading] = useState(false);

  const hasChanges =
    name !== (initialName || "") || role !== (initialRole || "SALESPERSON");

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Name is required");
      return;
    }
    setLoading(true);
    try {
      await api.patch(`${Endpoints.USERS}/${id}`, {
        name: name.trim(),
        role,
      });
      Alert.alert("Success", "User updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to update user",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader
        title="Edit User"
        showBack
        right={
          <TouchableOpacity
            onPress={toggleTheme}
            style={styles.themeToggle}
            activeOpacity={0.7}
          >
            <Ionicons
              name={scheme === "light" ? "moon" : "sunny"}
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        }
      />

      <View style={[styles.mainContent, { backgroundColor: colors.surface }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
          {/* Header */}
          <View style={styles.headerSection}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons
                name="create-outline"
                size={28}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Edit User
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Update user details and role
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.formCard,
              Shadow.sm,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Input
              label="Full Name *"
              placeholder="e.g. John Doe"
              value={name}
              onChangeText={setName}
              leftIcon="person-outline"
            />
          </View>

          {/* Role Selection */}
          <View style={styles.sectionWrapper}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Role
              </Text>
            </View>
            <Button
              title="Salesperson"
              variant={role === "SALESPERSON" ? "primary" : "secondary"}
              size="md"
              onPress={() => setRole("SALESPERSON")}
              icon={
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={role === "SALESPERSON" ? "#FFF" : colors.textSecondary}
                />
              }
              style={{ marginBottom: Spacing.sm }}
            />
            <View style={styles.roleRow}>
              <Button
                title="Manager"
                variant={role === "MANAGER" ? "primary" : "secondary"}
                size="md"
                fullWidth={false}
                onPress={() => setRole("MANAGER")}
                icon={
                  <Ionicons
                    name="briefcase-outline"
                    size={16}
                    color={role === "MANAGER" ? "#FFF" : colors.textSecondary}
                  />
                }
                style={{ flex: 1 }}
              />
              <Button
                title="Admin"
                variant={role === "ADMIN" ? "primary" : "secondary"}
                size="md"
                fullWidth={false}
                onPress={() => setRole("ADMIN")}
                icon={
                  <Ionicons
                    name="shield-outline"
                    size={16}
                    color={role === "ADMIN" ? "#FFF" : colors.textSecondary}
                  />
                }
                style={{ flex: 1 }}
              />
            </View>
          </View>

          {/* Change indicator */}
          {hasChanges && (
            <View
              style={[
                styles.changeCard,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.changeRow}>
                <Text style={[styles.changeLabel, { color: colors.textMuted }]}>
                  Changes detected
                </Text>
                <View style={styles.changeDetails}>
                  {name !== (initialName || "") && (
                    <Text
                      style={[styles.changeText, { color: colors.primary }]}
                    >
                      Name: {name}
                    </Text>
                  )}
                  {role !== (initialRole || "SALESPERSON") && (
                    <Text
                      style={[styles.changeText, { color: colors.primary }]}
                    >
                      Role: {role}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={loading}
            disabled={!name.trim() || !hasChanges}
            size="lg"
          />

          {!hasChanges && (
            <Text style={[styles.noChanges, { color: colors.textMuted }]}>
              No changes to save
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContent: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing["5xl"] },
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize["2xl"],
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
  },
  formCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  sectionWrapper: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  roleRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  changeCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  changeRow: {
    gap: Spacing.sm,
  },
  changeLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  changeDetails: {
    gap: 4,
  },
  changeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  noChanges: {
    textAlign: "center",
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
  },
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

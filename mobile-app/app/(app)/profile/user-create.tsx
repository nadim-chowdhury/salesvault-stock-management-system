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
import { useRouter } from "expo-router";
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

export default function CreateUserScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { setThemeMode } = useThemeStore();

  const toggleTheme = () => {
    const nextMode = scheme === "light" ? "dark" : "light";
    setThemeMode(nextMode);
  };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("SALESPERSON");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Validation", "All fields are required");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Validation", "Password must be at least 8 characters");
      return;
    }
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
    if (!passwordRegex.test(password)) {
      Alert.alert(
        "Validation",
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)",
      );
      return;
    }
    setLoading(true);
    try {
      await api.post(Endpoints.USERS, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });
      Alert.alert("Success", "User created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to create user",
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
        title="New User"
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

      <View
        style={[styles.mainContent, { backgroundColor: colors.background }]}
      >
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
                  name="person-add-outline"
                  size={28}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                New User
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Add a new team member to SalesVault
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
              <Input
                label="Email *"
                placeholder="e.g. john@company.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail-outline"
              />
              <Input
                label="Password *"
                placeholder="Min 8 chars, A-z, 0-9, @$!%*?&"
                value={password}
                onChangeText={setPassword}
                isPassword
                leftIcon="lock-closed-outline"
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
                    color={
                      role === "SALESPERSON" ? "#FFF" : colors.textSecondary
                    }
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

            {/* Preview */}
            {name && (
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.previewTitle, { color: colors.textMuted }]}
                >
                  Preview
                </Text>
                <View style={styles.previewRow}>
                  <View
                    style={[
                      styles.previewAvatar,
                      { backgroundColor: colors.primary + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.previewAvatarText,
                        { color: colors.primary },
                      ]}
                    >
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.previewName, { color: colors.text }]}>
                      {name || "User Name"}
                    </Text>
                    <Text
                      style={[styles.previewEmail, { color: colors.textMuted }]}
                    >
                      {email || "email@example.com"}
                    </Text>
                    <Text
                      style={[styles.previewRole, { color: colors.primary }]}
                    >
                      {role}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <Button
              title="Create User"
              onPress={handleCreate}
              loading={loading}
              disabled={!name.trim() || !email.trim() || !password.trim()}
              size="lg"
            />
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
  previewCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: Spacing.xl,
  },
  previewTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  previewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  previewAvatarText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  previewName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  previewEmail: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  previewRole: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

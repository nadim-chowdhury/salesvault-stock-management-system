import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../src/services/api";
import { Endpoints } from "../../../src/constants/api";
import { useAuthStore } from "../../../src/stores/auth-store";
import { useThemeStore } from "../../../src/stores/theme-store";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadow,
} from "../../../src/constants/theme";
import Badge from "../../../src/components/ui/Badge";
import Button from "../../../src/components/ui/Button";
import PageHeader from "@/src/components/ui/PageHeader";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserDetailScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user: currentUser } = useAuthStore();
  const { setThemeMode } = useThemeStore();

  const toggleTheme = () => {
    const nextMode = scheme === "light" ? "dark" : "light";
    setThemeMode(nextMode);
  };

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const isAdmin = currentUser?.role === "ADMIN";
  const isManager = currentUser?.role === "MANAGER";
  const canEdit = isAdmin || (isManager && user?.role === "SALESPERSON");

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get(`${Endpoints.USERS}/${id}`);
      setUser(response.data?.data || response.data);
    } catch (err) {
      console.error("User fetch error:", err);
      Alert.alert("Error", "Failed to load user");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchUser();
    }, [fetchUser]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUser();
  };

  const handleToggleActive = () => {
    const action = user.is_active ? "deactivate" : "activate";
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      `Are you sure you want to ${action} this user?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: user.is_active ? "destructive" : "default",
          onPress: async () => {
            setActionLoading("toggle");
            try {
              await api.patch(`${Endpoints.USERS}/${id}`, {
                is_active: !user.is_active,
              });
              setUser({ ...user, is_active: !user.is_active });
              Alert.alert("Success", `User ${action}d successfully`);
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || `Failed to ${action} user`,
              );
            } finally {
              setActionLoading("");
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete User",
      "This action cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setActionLoading("delete");
            try {
              await api.delete(`${Endpoints.USERS}/${id}`);
              Alert.alert("Success", "User deleted successfully", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to delete user",
              );
            } finally {
              setActionLoading("");
            }
          },
        },
      ],
    );
  };

  const handleResetPassword = () => {
    Alert.alert(
      "Reset Password",
      "Send password reset email to user?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: () => Alert.alert("Info", "Feature coming soon"),
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.center, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView
        style={[styles.center, { backgroundColor: colors.background }]}
      >
        <Text style={{ color: colors.textMuted }}>User not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader
        title="User Details"
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
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* User Card */}
          <View
            style={[
              styles.card,
              Shadow.sm,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {(user.name || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.name, { color: colors.text }]}>
              {user.name}
            </Text>
            <Text style={[styles.email, { color: colors.textMuted }]}>
              {user.email}
            </Text>
            <View style={styles.badges}>
              <Badge text={user.role} variant="info" />
              {!user.is_active && <Badge text="Inactive" variant="danger" />}
            </View>
          </View>

          {/* Info Card */}
          <View
            style={[
              styles.infoCard,
              Shadow.sm,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <View style={styles.infoRow}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.textMuted}
              />
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                Joined
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {new Date(user.created_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons
                name="time-outline"
                size={18}
                color={colors.textMuted}
              />
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                Last Updated
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {new Date(user.updated_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Actions */}
          {canEdit && (
            <View style={styles.actionsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Actions
              </Text>

              <Button
                title="Edit User"
                onPress={() =>
                  router.push({
                    pathname: "/(app)/profile/user-edit",
                    params: {
                      id: user.id,
                      name: user.name,
                      role: user.role,
                    },
                  })
                }
                variant="primary"
                icon={<Ionicons name="create-outline" size={18} color="#FFF" />}
                style={{ marginBottom: Spacing.sm }}
              />

              <Button
                title={user.is_active ? "Deactivate User" : "Activate User"}
                onPress={handleToggleActive}
                variant={user.is_active ? "secondary" : "primary"}
                loading={actionLoading === "toggle"}
                icon={
                  <Ionicons
                    name={
                      user.is_active
                        ? "close-circle-outline"
                        : "checkmark-circle-outline"
                    }
                    size={18}
                    color={user.is_active ? undefined : "#FFF"}
                  />
                }
                style={{ marginBottom: Spacing.sm }}
              />

              {isAdmin && (
                <View
                  style={[
                    styles.resetCard,
                    Shadow.sm,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderLight,
                    },
                  ]}
                >
                  <Button
                    title="Reset Password"
                    onPress={handleResetPassword}
                    variant="secondary"
                    size="sm"
                    icon={
                      <Ionicons
                        name="key-outline"
                        size={16}
                        color={colors.text}
                      />
                    }
                    style={{ marginBottom: Spacing.sm }}
                  />
                  <Button
                    title="Delete User"
                    onPress={handleDelete}
                    variant="danger"
                    loading={actionLoading === "delete"}
                    icon={
                      <Ionicons name="trash-outline" size={18} color="#FFF" />
                    }
                  />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContent: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: Spacing.lg, paddingBottom: Spacing["5xl"] },
  card: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarText: { fontSize: FontSize["4xl"], fontWeight: FontWeight.bold },
  name: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  email: { fontSize: FontSize.sm, marginBottom: Spacing.md },
  badges: { flexDirection: "row", gap: Spacing.xs },
  infoCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  infoLabel: { fontSize: FontSize.sm, flex: 1 },
  infoValue: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  actionsSection: { marginTop: Spacing.sm },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.md,
  },
  resetCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

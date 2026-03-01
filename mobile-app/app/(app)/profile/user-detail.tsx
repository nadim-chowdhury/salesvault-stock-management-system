import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../src/services/api";
import { Endpoints } from "../../../src/constants/api";
import { useAuthStore } from "../../../src/stores/auth-store";
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
import Input from "../../../src/components/ui/Input";
import PageHeader from "../../../src/components/ui/PageHeader";

export default function UserDetailScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === "ADMIN";

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get(`${Endpoints.USERS}/${id}`);
      setUser(response.data?.data || response.data);
    } catch (err) {
      console.error("User fetch error:", err);
      Alert.alert("Error", "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchUser();
    }, [fetchUser]),
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "danger";
      case "MANAGER":
        return "warning";
      default:
        return "info";
    }
  };

  const handleToggleActive = () => {
    const action = user.is_active ? "deactivate" : "activate";
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      `Are you sure you want to ${action} ${user.name}?`,
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
              Alert.alert("Success", `User ${action}d`);
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

  const handleResetPassword = async () => {
    if (!newPassword.trim() || newPassword.length < 8) {
      Alert.alert("Validation", "Password must be at least 8 characters");
      return;
    }
    setActionLoading("reset");
    try {
      await api.post(`${Endpoints.USERS}/${id}/reset-password`, {
        new_password: newPassword,
      });
      Alert.alert("Success", "Password reset successfully");
      setShowResetPassword(false);
      setNewPassword("");
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to reset password",
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleForceLogout = () => {
    Alert.alert(
      "Force Logout",
      `This will invalidate all sessions for ${user.name}. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Force Logout",
          style: "destructive",
          onPress: async () => {
            setActionLoading("logout");
            try {
              await api.post(`${Endpoints.USERS}/${id}/force-logout`);
              Alert.alert("Success", "User has been logged out");
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to force logout",
              );
            } finally {
              setActionLoading("");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <PageHeader title="User Details" showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <PageHeader title="User Details" showBack />
        <View style={styles.center}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.danger}
          />
          <Text style={[styles.errorText, { color: colors.textMuted }]}>
            User not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <PageHeader title="User Details" showBack />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            Shadow.sm,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <View
            style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}
          >
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(user.name || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>
            {user.email}
          </Text>
          <View style={styles.badgeRow}>
            <Badge text={user.role} variant={getRoleBadge(user.role) as any} />
            <Badge
              text={user.is_active ? "Active" : "Inactive"}
              variant={user.is_active ? "success" : "danger"}
            />
          </View>
        </View>

        {/* Info Section */}
        <View
          style={[
            styles.infoCard,
            Shadow.sm,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <InfoRow
            icon="calendar-outline"
            label="Created"
            value={new Date(user.created_at).toLocaleDateString()}
            colors={colors}
          />
          <InfoRow
            icon="time-outline"
            label="Last Updated"
            value={new Date(user.updated_at).toLocaleDateString()}
            colors={colors}
          />
          {user.failed_attempts > 0 && (
            <InfoRow
              icon="warning-outline"
              label="Failed Login Attempts"
              value={String(user.failed_attempts)}
              colors={colors}
            />
          )}
        </View>

        {/* Admin Actions */}
        {isAdmin && (
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
              variant={user.is_active ? "danger" : "primary"}
              loading={actionLoading === "toggle"}
              icon={
                <Ionicons
                  name={
                    user.is_active
                      ? "close-circle-outline"
                      : "checkmark-circle-outline"
                  }
                  size={18}
                  color="#FFF"
                />
              }
              style={{ marginBottom: Spacing.sm }}
            />

            <Button
              title={showResetPassword ? "Cancel" : "Reset Password"}
              onPress={() => {
                setShowResetPassword(!showResetPassword);
                setNewPassword("");
              }}
              variant="secondary"
              icon={
                <Ionicons
                  name="key-outline"
                  size={18}
                  color={colors.primary}
                />
              }
              style={{ marginBottom: Spacing.sm }}
            />

            {showResetPassword && (
              <View
                style={[
                  styles.resetCard,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Input
                  label="New Password"
                  placeholder="Min 8 chars, uppercase, number, special"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  isPassword
                  leftIcon="lock-closed-outline"
                />
                <Button
                  title="Set New Password"
                  onPress={handleResetPassword}
                  loading={actionLoading === "reset"}
                  disabled={!newPassword.trim() || newPassword.length < 8}
                  size="md"
                />
              </View>
            )}

            <Button
              title="Force Logout"
              onPress={handleForceLogout}
              variant="danger"
              loading={actionLoading === "logout"}
              icon={<Ionicons name="log-out-outline" size={18} color="#FFF" />}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing["5xl"] },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: FontSize.md, marginTop: Spacing.md },
  profileCard: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarText: { fontSize: FontSize["3xl"], fontWeight: FontWeight.bold },
  name: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  email: { fontSize: FontSize.sm, marginBottom: Spacing.md },
  badgeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
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
});

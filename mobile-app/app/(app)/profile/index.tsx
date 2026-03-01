import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
import PageHeader from "../../../src/components/ui/PageHeader";

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const isAdmin = user?.role === "ADMIN";

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surface }]}
      edges={["top"]}
    >
      <PageHeader title="Profile" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* User Info */}
        <View style={styles.profileHeader}>
          <View
            style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}
          >
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(user?.name || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>
            {user?.name}
          </Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>
            {user?.email}
          </Text>
          <Badge text={user?.role || "USER"} variant="info" />
        </View>

        {/* Menu Items */}
        {isAdmin && (
          <MenuItem
            icon="people-outline"
            label="User Management"
            onPress={() => router.push("/(app)/profile/users")}
            colors={colors}
          />
        )}
        {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
          <>
            <MenuItem
              icon="business-outline"
              label="Warehouses"
              onPress={() => router.push("/(app)/warehouses/" as any)}
              colors={colors}
            />
            <MenuItem
              icon="people-circle-outline"
              label="Warehouse Users"
              onPress={() => router.push("/(app)/profile/warehouse-users")}
              colors={colors}
            />
            <MenuItem
              icon="layers-outline"
              label="Stock Management"
              onPress={() => router.push("/(app)/profile/stock")}
              colors={colors}
            />
            <MenuItem
              icon="checkmark-done-outline"
              label="Sale Approvals"
              onPress={() => router.push("/(app)/sales/sales-approvals")}
              colors={colors}
            />
          </>
        )}
        <MenuItem
          icon="trophy-outline"
          label="Sales Targets"
          onPress={() => router.push("/(app)/sales/sales-targets")}
          colors={colors}
        />
        {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
          <MenuItem
            icon="time-outline"
            label="Activity Log"
            onPress={() => router.push("/(app)/profile/activity")}
            colors={colors}
          />
        )}

        <View style={styles.logoutSection}>
          <Button
            title="Sign Out"
            onPress={handleLogout}
            variant="danger"
            icon={<Ionicons name="log-out-outline" size={18} color="#FFF" />}
          />
        </View>

        <Text style={[styles.version, { color: colors.textMuted }]}>
          SalesVault v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        Shadow.sm,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing["5xl"] },
  profileHeader: { alignItems: "center", marginBottom: Spacing["3xl"] },
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
  email: { fontSize: FontSize.sm, marginBottom: Spacing.sm },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  menuLabel: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  logoutSection: { marginTop: Spacing["3xl"] },
  version: {
    textAlign: "center",
    fontSize: FontSize.xs,
    marginTop: Spacing.xl,
  },
});

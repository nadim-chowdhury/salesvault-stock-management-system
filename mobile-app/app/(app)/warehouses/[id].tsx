import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
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
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from "@/src/components/ui/PageHeader";

export default function WarehouseDetailScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  const { setThemeMode } = useThemeStore();
  const isAdmin = currentUser?.role === "ADMIN";
  const canEdit = isAdmin || currentUser?.role === "MANAGER";

  const toggleTheme = () => {
    const nextMode = scheme === "light" ? "dark" : "light";
    setThemeMode(nextMode);
  };

  const [warehouse, setWarehouse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  const fetchWarehouse = useCallback(async () => {
    try {
      const response = await api.get(`${Endpoints.WAREHOUSES}/${id}`);
      setWarehouse(response.data?.data || response.data);
    } catch (err) {
      console.error("Warehouse fetch error:", err);
      Alert.alert("Error", "Failed to load warehouse");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchWarehouse();
    }, [fetchWarehouse]),
  );

  const handleToggleActive = () => {
    const action = warehouse.is_active ? "deactivate" : "activate";
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Warehouse`,
      `Are you sure you want to ${action} "${warehouse.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: warehouse.is_active ? "destructive" : "default",
          onPress: async () => {
            setActionLoading("toggle");
            try {
              await api.patch(`${Endpoints.WAREHOUSES}/${id}`, {
                is_active: !warehouse.is_active,
              });
              setWarehouse({
                ...warehouse,
                is_active: !warehouse.is_active,
              });
              Alert.alert("Success", `Warehouse ${action}d`);
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || `Failed to ${action} warehouse`,
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
      "Delete Warehouse",
      `This will permanently deactivate "${warehouse.name}". Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setActionLoading("delete");
            try {
              await api.delete(`${Endpoints.WAREHOUSES}/${id}`);
              Alert.alert("Success", "Warehouse deleted", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to delete warehouse",
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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!warehouse) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={[styles.errorText, { color: colors.textMuted }]}>
          Warehouse not found
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader
        title="Warehouse Details"
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
        >
          {/* Warehouse Card */}
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
                styles.iconCircle,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons name="business" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.name, { color: colors.text }]}>
              {warehouse.name}
            </Text>
            {warehouse.location && (
              <View style={styles.locationRow}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={[styles.location, { color: colors.textMuted }]}>
                  {warehouse.location}
                </Text>
              </View>
            )}
            <Badge
              text={warehouse.is_active ? "Active" : "Inactive"}
              variant={warehouse.is_active ? "success" : "danger"}
            />
          </View>

          {/* Info */}
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
            <InfoRow
              icon="calendar-outline"
              label="Created"
              value={new Date(warehouse.created_at).toLocaleDateString()}
              colors={colors}
            />
            <InfoRow
              icon="time-outline"
              label="Last Updated"
              value={new Date(warehouse.updated_at).toLocaleDateString()}
              colors={colors}
            />
          </View>

          {/* Actions */}
          {canEdit && (
            <View style={styles.actionsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Actions
              </Text>

              <Button
                title="Edit Warehouse"
                onPress={() =>
                  router.push({
                    pathname: "/(app)/warehouses/edit",
                    params: {
                      id: warehouse.id,
                      name: warehouse.name,
                      location: warehouse.location || "",
                    },
                  })
                }
                variant="primary"
                icon={<Ionicons name="create-outline" size={18} color="#FFF" />}
                style={{ marginBottom: Spacing.sm }}
              />

              <Button
                title={
                  warehouse.is_active
                    ? "Deactivate Warehouse"
                    : "Activate Warehouse"
                }
                onPress={handleToggleActive}
                variant={warehouse.is_active ? "secondary" : "primary"}
                loading={actionLoading === "toggle"}
                icon={
                  <Ionicons
                    name={
                      warehouse.is_active
                        ? "close-circle-outline"
                        : "checkmark-circle-outline"
                    }
                    size={18}
                    color={warehouse.is_active ? colors.danger : "#FFF"}
                  />
                }
                style={{ marginBottom: Spacing.sm }}
              />

              {isAdmin && (
                <Button
                  title="Delete Warehouse"
                  onPress={handleDelete}
                  variant="danger"
                  loading={actionLoading === "delete"}
                  icon={<Ionicons name="trash-outline" size={18} color="#FFF" />}
                />
              )}
            </View>
          )}
        </ScrollView>
      </View>
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
  mainContent: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing["5xl"] },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: FontSize.md, marginTop: Spacing.md },
  card: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: Spacing.md,
  },
  location: { fontSize: FontSize.sm },
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
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

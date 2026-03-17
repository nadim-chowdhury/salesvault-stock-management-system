import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
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
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  // Assign Salesperson Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [salespersons, setSalespersons] = useState<any[]>([]);
  const [spSearch, setSpSearch] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchWarehouse = useCallback(async () => {
    try {
      const response = await api.get(`${Endpoints.WAREHOUSES}/${id}`);
      setWarehouse(response.data?.data || response.data);
    } catch (err) {
      console.error("Warehouse fetch error:", err);
      Alert.alert("Error", "Failed to load warehouse");
    }
  }, [id]);

  const fetchAssignedUsers = useCallback(async () => {
    try {
      const response = await api.get(
        `${Endpoints.WAREHOUSE_USERS}/warehouse/${id}`,
      );
      const result = response.data?.data || response.data;
      setAssignedUsers(
        Array.isArray(result) ? result : result?.data || result?.items || [],
      );
    } catch (err) {
      console.error("Assigned users fetch error:", err);
    }
  }, [id]);

  const fetchAllSalespersons = useCallback(async () => {
    try {
      const res = await api.get(Endpoints.USERS, { params: { limit: 100 } });
      const result = res.data?.data || res.data;
      const allUsers =
        result?.data || result?.items || (Array.isArray(result) ? result : []);
      setSalespersons(
        allUsers.filter(
          (u: any) => u.role === "SALESPERSON" && u.is_active !== false,
        ),
      );
    } catch (err) {
      console.error("Salespersons fetch error:", err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchWarehouse(), fetchAssignedUsers()]);
    if (canEdit) await fetchAllSalespersons();
    setLoading(false);
  }, [fetchWarehouse, fetchAssignedUsers, fetchAllSalespersons, canEdit]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
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

  const handleAssignSalesperson = async (userId: string) => {
    setAssigning(true);
    try {
      await api.post(Endpoints.WAREHOUSE_USERS_ASSIGN, {
        warehouse_id: id,
        user_id: userId,
      });
      Alert.alert("Success", "Salesperson assigned to warehouse");
      setShowAssignModal(false);
      fetchAssignedUsers();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to assign salesperson",
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = (userId: string, name: string) => {
    Alert.alert(
      "Unassign Salesperson",
      `Are you sure you want to remove "${name}" from this warehouse?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unassign",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`${Endpoints.WAREHOUSE_USERS}/${id}/${userId}`);
              Alert.alert("Success", "Salesperson unassigned");
              fetchAssignedUsers();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to unassign",
              );
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

  const filteredSps = salespersons.filter(
    (s) =>
      s.name.toLowerCase().includes(spSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(spSearch.toLowerCase()),
  );

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

      <View
        style={[styles.mainContent, { backgroundColor: colors.background }]}
      >
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

          {/* Assigned Salespersons */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Assigned Salespersons
            </Text>
            {canEdit && (
              <TouchableOpacity onPress={() => setShowAssignModal(true)}>
                <Ionicons name="add-circle" size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          <View
            style={[
              styles.infoCard,
              Shadow.sm,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                maxHeight: 250,
              },
            ]}
          >
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
              {assignedUsers.length === 0 ? (
                <Text
                  style={{
                    color: colors.textMuted,
                    textAlign: "center",
                    paddingVertical: Spacing.md,
                  }}
                >
                  No salespersons assigned
                </Text>
              ) : (
                assignedUsers.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.assignedUserRow,
                      {
                        borderBottomWidth: 0,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: FontWeight.medium,
                        }}
                      >
                        {item.user?.name}
                      </Text>
                      <Text
                        style={{ color: colors.textMuted, fontSize: FontSize.xs }}
                      >
                        {item.user?.email}
                      </Text>
                    </View>
                    {canEdit && (
                      <TouchableOpacity
                        onPress={() => handleUnassign(item.user?.id, item.user?.name)}
                      >
                        <Ionicons
                          name="remove-circle-outline"
                          size={20}
                          color={colors.danger}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
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
                title="Add Product Stock"
                onPress={() =>
                  router.push({
                    pathname: "/(app)/stock/add",
                    params: { warehouseId: warehouse.id },
                  })
                }
                variant="primary"
                icon={
                  <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                }
                style={{ marginBottom: Spacing.sm }}
              />

              <Button
                title="Assign Salesperson"
                onPress={() => setShowAssignModal(true)}
                variant="primary"
                icon={
                  <Ionicons name="person-add-outline" size={18} color="#FFF" />
                }
                style={{ marginBottom: Spacing.sm }}
              />

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
                  icon={
                    <Ionicons name="trash-outline" size={18} color="#FFF" />
                  }
                />
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Assign Salesperson Modal */}
      <Modal visible={showAssignModal} animationType="slide" transparent>
        <View
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: colors.borderLight },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Assign Salesperson
              </Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <Ionicons
                name="search"
                size={18}
                color={colors.textMuted}
                style={{ marginRight: Spacing.sm }}
              />
              <TextInput
                placeholder="Search salesperson..."
                placeholderTextColor={colors.textMuted}
                style={{ flex: 1, color: colors.text, fontSize: FontSize.md }}
                value={spSearch}
                onChangeText={setSpSearch}
                autoFocus
              />
            </View>

            {assigning && (
              <ActivityIndicator
                style={{ marginVertical: Spacing.md }}
                color={colors.primary}
              />
            )}

            <FlatList
              data={filteredSps}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: Spacing.lg }}
              renderItem={({ item }) => {
                const isAlreadyAssigned = assignedUsers.some(
                  (au) => au.user_id === item.id,
                );
                return (
                  <TouchableOpacity
                    style={[
                      styles.spListItem,
                      { borderBottomColor: colors.borderLight },
                      isAlreadyAssigned && { opacity: 0.5 },
                    ]}
                    onPress={() =>
                      !isAlreadyAssigned && handleAssignSalesperson(item.id)
                    }
                    disabled={isAlreadyAssigned || assigning}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: FontWeight.medium,
                        }}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontSize: FontSize.sm,
                        }}
                      >
                        {item.email}
                      </Text>
                    </View>
                    {isAlreadyAssigned ? (
                      <Badge text="Assigned" variant="success" />
                    ) : (
                      <Ionicons
                        name="add-circle-outline"
                        size={24}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text
                  style={{
                    textAlign: "center",
                    color: colors.textMuted,
                    marginTop: Spacing["2xl"],
                  }}
                >
                  No salespersons found
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
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
    padding: Spacing.md,
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  assignedUserRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    height: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  modalSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    margin: Spacing.lg,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: "#f5f5f5",
  },
  spListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

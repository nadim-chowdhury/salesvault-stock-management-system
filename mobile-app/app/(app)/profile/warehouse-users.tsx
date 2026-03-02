import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../src/services/api";
import { Endpoints } from "../../../src/constants/api";
import { useAuthStore } from "../../../src/stores/auth-store";
import { useThemeStore } from "../../../src/stores/theme-store";
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadow,
} from "../../../src/constants/theme";

import PageHeader from "@/src/components/ui/PageHeader";

interface WarehouseUser {
  id: string;
  warehouse_id: string;
  user_id: string;
  assigned_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface Warehouse {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export default function WarehouseUsersScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const { setThemeMode } = useThemeStore();

  const toggleTheme = () => {
    const nextMode = scheme === "light" ? "dark" : "light";
    setThemeMode(nextMode);
  };

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(
    null,
  );
  const [assignedUsers, setAssignedUsers] = useState<WarehouseUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const isAdmin = currentUser?.role === "ADMIN";
  const isManager = currentUser?.role === "MANAGER";

  const fetchWarehouses = useCallback(async () => {
    if (!isAuthenticated) {
      setWarehouses([]);
      return;
    }
    try {
      const res = await api.get(Endpoints.WAREHOUSES, {
        params: { is_active: true, limit: 100 },
      });
      const result = res.data?.data || res.data;
      const items =
        result?.data || result?.items || (Array.isArray(result) ? result : []);
      setWarehouses(items);
    } catch {
      Alert.alert("Error", "Failed to load warehouses");
    }
  }, [isAuthenticated]);

  const fetchAssignedUsers = useCallback(async (warehouseId: string) => {
    try {
      const res = await api.get(
        `${Endpoints.WAREHOUSE_USERS}/warehouse/${warehouseId}`,
      );
      const result = res.data?.data || res.data;
      const items = Array.isArray(result)
        ? result
        : result?.data || result?.items || [];
      setAssignedUsers(items);
    } catch {
      Alert.alert("Error", "Failed to load assigned users");
    }
  }, []);

  const fetchAvailableUsers = useCallback(async () => {
    try {
      const res = await api.get(Endpoints.USERS, {
        params: { is_active: true, limit: 100 },
      });
      const result = res.data?.data || res.data;
      const allUsers: User[] =
        result?.data || result?.items || (Array.isArray(result) ? result : []);
      // Filter out admins — they can't be assigned to warehouses
      setAvailableUsers(allUsers.filter((u) => u.role !== "ADMIN"));
    } catch {
      Alert.alert("Error", "Failed to load users");
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchWarehouses();
      setLoading(false);
    };
    load();
  }, [fetchWarehouses]);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchAssignedUsers(selectedWarehouse.id);
    }
  }, [selectedWarehouse, fetchAssignedUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWarehouses();
    if (selectedWarehouse) {
      await fetchAssignedUsers(selectedWarehouse.id);
    }
    setRefreshing(false);
  };

  const assignUser = async (userId: string) => {
    if (!selectedWarehouse) return;
    setAssigning(true);
    try {
      await api.post(Endpoints.WAREHOUSE_USERS_ASSIGN, {
        warehouse_id: selectedWarehouse.id,
        user_id: userId,
      });
      await fetchAssignedUsers(selectedWarehouse.id);
      setShowAssignModal(false);
      Alert.alert("Success", "User assigned to warehouse");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to assign user";
      Alert.alert("Error", Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setAssigning(false);
    }
  };

  const removeUser = (userId: string, userName: string) => {
    if (!selectedWarehouse) return;
    Alert.alert(
      "Remove User",
      `Remove ${userName} from ${selectedWarehouse.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(
                `${Endpoints.WAREHOUSE_USERS}/${selectedWarehouse.id}/${userId}`,
              );
              await fetchAssignedUsers(selectedWarehouse.id);
              Alert.alert("Success", "User removed from warehouse");
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to remove user",
              );
            }
          },
        },
      ],
    );
  };

  const assignedUserIds = assignedUsers.map((a) => a.user_id);
  const unassignedUsers = availableUsers.filter(
    (u) => !assignedUserIds.includes(u.id),
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "MANAGER":
        return { bg: colors.infoLight, text: colors.info };
      case "SALESPERSON":
        return { bg: colors.successLight, text: colors.success };
      default:
        return { bg: colors.surfaceSecondary, text: colors.textSecondary };
    }
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader
        title="Warehouse Users"
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
        {/* Warehouse Selector */}
        <View style={{ height: 56 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.warehouseScroller}
            contentContainerStyle={styles.warehouseScrollContent}
          >
            {warehouses.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[
                  styles.warehouseChip,
                  {
                    backgroundColor:
                      selectedWarehouse?.id === w.id
                        ? colors.primary
                        : colors.surface,
                    borderColor:
                      selectedWarehouse?.id === w.id
                        ? colors.primary
                        : colors.border,
                  },
                ]}
                onPress={() => setSelectedWarehouse(w)}
              >
                <Ionicons
                  name="business-outline"
                  size={16}
                  color={
                    selectedWarehouse?.id === w.id
                      ? "#FFF"
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.warehouseChipText,
                    {
                      color:
                        selectedWarehouse?.id === w.id ? "#FFF" : colors.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {w.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

      {!selectedWarehouse ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="business-outline"
            size={48}
            color={colors.textMuted}
          />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            Select a Warehouse
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Choose a warehouse to view and manage assigned users
          </Text>
        </View>
      ) : (
        <>
          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Assigned Users ({assignedUsers.length})
            </Text>
          </View>

          {/* Assigned Users List */}
          <FlatList
            data={assignedUsers}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const roleBadge = getRoleBadgeColor(item.user?.role);
              return (
                <View
                  style={[
                    styles.userCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    Shadow.sm,
                  ]}
                >
                  <View
                    style={[
                      styles.userAvatar,
                      { backgroundColor: colors.primaryLight + "20" },
                    ]}
                  >
                    <Text
                      style={[styles.userAvatarText, { color: colors.primary }]}
                    >
                      {item.user?.name?.charAt(0)?.toUpperCase() || "?"}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.text }]}>
                      {item.user?.name}
                    </Text>
                    <Text
                      style={[
                        styles.userEmail,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {item.user?.email}
                    </Text>
                    <View
                      style={[
                        styles.roleBadge,
                        { backgroundColor: roleBadge.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          { color: roleBadge.text },
                        ]}
                      >
                        {item.user?.role}
                      </Text>
                    </View>
                  </View>
                  {(isAdmin || isManager) && (
                    <TouchableOpacity
                      onPress={() => removeUser(item.user_id, item.user?.name)}
                      style={[
                        styles.removeBtn,
                        { backgroundColor: colors.dangerLight },
                      ]}
                    >
                      <Ionicons name="close" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons
                  name="people-outline"
                  size={48}
                  color={colors.textMuted}
                />
                <Text
                  style={[styles.emptyTitle, { color: colors.textSecondary }]}
                >
                  No Users Assigned
                </Text>
                <Text
                  style={[styles.emptySubtitle, { color: colors.textMuted }]}
                >
                  Assign salespersons or managers to this warehouse
                </Text>
              </View>
            }
          />
        </>
      )}

      {/* Assign User Modal */}
      <Modal visible={showAssignModal} animationType="slide" transparent>
        <View
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Assign User to {selectedWarehouse?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {assigning ? (
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ marginVertical: Spacing["3xl"] }}
              />
            ) : (
              <FlatList
                data={unassignedUsers}
                keyExtractor={(item) => item.id}
                style={styles.modalList}
                renderItem={({ item }) => {
                  const roleBadge = getRoleBadgeColor(item.role);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.assignableUser,
                        { borderBottomColor: colors.border },
                      ]}
                      onPress={() => assignUser(item.id)}
                    >
                      <View
                        style={[
                          styles.userAvatar,
                          { backgroundColor: colors.primaryLight + "20" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.userAvatarText,
                            { color: colors.primary },
                          ]}
                        >
                          {item.name?.charAt(0)?.toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: colors.text }]}>
                          {item.name}
                        </Text>
                        <Text
                          style={[
                            styles.userEmail,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {item.email}
                        </Text>
                        <View
                          style={[
                            styles.roleBadge,
                            { backgroundColor: roleBadge.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleBadgeText,
                              { color: roleBadge.text },
                            ]}
                          >
                            {item.role}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name="add-circle"
                        size={24}
                        color={colors.success}
                      />
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text
                      style={[
                        styles.emptyTitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      All Users Already Assigned
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* FAB - Assign User */}
      {selectedWarehouse && (isAdmin || isManager) && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => {
            fetchAvailableUsers();
            setShowAssignModal(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={26} color="#FFF" />
        </TouchableOpacity>
      )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContent: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  warehouseScroller: {
    maxHeight: 56,
  },
  warehouseScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  warehouseChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs,
    marginRight: Spacing.sm,
  },
  warehouseChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonText: {
    color: "#FFF",
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatarText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  userEmail: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  roleBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    textAlign: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  modalList: {
    paddingHorizontal: Spacing.lg,
  },
  assignableUser: {
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

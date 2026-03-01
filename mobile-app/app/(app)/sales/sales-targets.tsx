import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useColorScheme,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../src/services/api";
import { Endpoints } from "../../../src/constants/api";
import { useAuthStore } from "../../../src/stores/auth-store";
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadow,
} from "../../../src/constants/theme";

interface SalesTarget {
  id: string;
  salesperson_id: string;
  warehouse_id: string;
  target_amount: number;
  achieved_amount: number;
  period_start: string;
  period_end: string;
  salesperson?: { id: string; name: string; email: string };
  warehouse?: { id: string; name: string };
}

interface Warehouse {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function SalesTargetsScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseUsers, setWarehouseUsers] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedSalesperson, setSelectedSalesperson] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const isAdmin = currentUser?.role === "ADMIN";
  const isManager = currentUser?.role === "MANAGER";
  const isSalesperson = currentUser?.role === "SALESPERSON";

  const fetchTargets = useCallback(async () => {
    try {
      const endpoint = isSalesperson
        ? Endpoints.SALES_TARGETS_MY
        : Endpoints.SALES_TARGETS;
      const res = await api.get(endpoint, {
        params: isSalesperson ? {} : { limit: 50 },
      });
      const result = res.data?.data || res.data;
      const items = Array.isArray(result)
        ? result
        : result?.data || result?.items || [];
      setTargets(items);
    } catch {
      Alert.alert("Error", "Failed to load sales targets");
    }
  }, [isSalesperson]);

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await api.get(Endpoints.WAREHOUSES, {
        params: { is_active: true, limit: 100 },
      });
      const result = res.data?.data || res.data;
      const items =
        result?.data || result?.items || (Array.isArray(result) ? result : []);
      setWarehouses(items);
    } catch {}
  }, []);

  const fetchWarehouseUsers = useCallback(async (warehouseId: string) => {
    try {
      const res = await api.get(
        `${Endpoints.WAREHOUSE_USERS}/warehouse/${warehouseId}`,
      );
      const result = res.data?.data || res.data;
      const assignments = Array.isArray(result)
        ? result
        : result?.data || result?.items || [];
      setWarehouseUsers(
        assignments.filter((a: any) => a.user?.role === "SALESPERSON"),
      );
    } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchTargets();
      if (isAdmin || isManager) await fetchWarehouses();
      setLoading(false);
    };
    load();
  }, [fetchTargets, fetchWarehouses, isAdmin, isManager]);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchWarehouseUsers(selectedWarehouse);
    }
  }, [selectedWarehouse, fetchWarehouseUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTargets();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (
      !selectedWarehouse ||
      !selectedSalesperson ||
      !targetAmount ||
      !periodStart ||
      !periodEnd
    ) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    setCreating(true);
    try {
      await api.post(Endpoints.SALES_TARGETS, {
        salesperson_id: selectedSalesperson,
        warehouse_id: selectedWarehouse,
        target_amount: parseFloat(targetAmount),
        period_start: periodStart,
        period_end: periodEnd,
      });
      Alert.alert("Success", "Sales target created");
      setShowCreateModal(false);
      resetForm();
      await fetchTargets();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to create target";
      Alert.alert("Error", Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setCreating(false);
    }
  };

  const deleteTarget = (id: string) => {
    Alert.alert(
      "Delete Target",
      "Are you sure you want to delete this target?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`${Endpoints.SALES_TARGETS}/${id}`);
              await fetchTargets();
            } catch {
              Alert.alert("Error", "Failed to delete target");
            }
          },
        },
      ],
    );
  };

  const resetForm = () => {
    setSelectedWarehouse("");
    setSelectedSalesperson("");
    setTargetAmount("");
    setPeriodStart("");
    setPeriodEnd("");
    setWarehouseUsers([]);
  };

  const getProgress = (target: SalesTarget) => {
    const achieved = Number(target.achieved_amount) || 0;
    const total = Number(target.target_amount) || 1;
    return Math.min(achieved / total, 1);
  };

  const formatCurrency = (val: number) =>
    `৳${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.center, { backgroundColor: colors.surface }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surface }]}
      edges={["top"]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.borderLight,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Sales Targets
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Targets List */}
      <FlatList
        data={targets}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const progress = getProgress(item);
          const progressColor =
            progress >= 1
              ? colors.success
              : progress >= 0.5
                ? colors.warning
                : colors.danger;
          return (
            <View
              style={[
                styles.targetCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                Shadow.sm,
              ]}
            >
              <View style={styles.targetHeader}>
                <View style={styles.targetInfo}>
                  {item.salesperson && (
                    <Text
                      style={[styles.salespersonName, { color: colors.text }]}
                    >
                      {item.salesperson.name}
                    </Text>
                  )}
                  {item.warehouse && (
                    <View style={styles.warehouseTag}>
                      <Ionicons
                        name="business-outline"
                        size={12}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.warehouseName,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {item.warehouse.name}
                      </Text>
                    </View>
                  )}
                </View>
                {(isAdmin || isManager) && (
                  <TouchableOpacity onPress={() => deleteTarget(item.id)}>
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={colors.danger}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.targetAmounts}>
                <Text style={[styles.achievedAmount, { color: progressColor }]}>
                  {formatCurrency(item.achieved_amount)}
                </Text>
                <Text
                  style={[styles.amountDivider, { color: colors.textMuted }]}
                >
                  {" "}
                  /{" "}
                </Text>
                <Text
                  style={[
                    styles.targetAmountText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {formatCurrency(item.target_amount)}
                </Text>
              </View>

              {/* Progress Bar */}
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: progressColor,
                      width: `${Math.round(progress * 100)}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.targetFooter}>
                <Text style={[styles.periodText, { color: colors.textMuted }]}>
                  {formatDate(item.period_start)} –{" "}
                  {formatDate(item.period_end)}
                </Text>
                <Text
                  style={[styles.progressPercent, { color: progressColor }]}
                >
                  {Math.round(progress * 100)}%
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="trophy-outline"
              size={48}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              No Sales Targets
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {isSalesperson
                ? "No targets have been assigned to you yet"
                : "Create targets to track salesperson performance"}
            </Text>
          </View>
        }
      />

      {/* Create Target Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Create Sales Target
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContent}>
              {/* Warehouse Selector */}
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Warehouse
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroller}
              >
                {warehouses.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={[
                      styles.selectChip,
                      {
                        backgroundColor:
                          selectedWarehouse === w.id
                            ? colors.primary
                            : colors.surfaceSecondary,
                        borderColor:
                          selectedWarehouse === w.id
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedWarehouse(w.id);
                      setSelectedSalesperson("");
                    }}
                  >
                    <Text
                      style={{
                        color:
                          selectedWarehouse === w.id ? "#FFF" : colors.text,
                        fontSize: FontSize.sm,
                      }}
                    >
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Salesperson Selector */}
              {selectedWarehouse && (
                <>
                  <Text
                    style={[styles.fieldLabel, { color: colors.textSecondary }]}
                  >
                    Salesperson
                  </Text>
                  {warehouseUsers.length === 0 ? (
                    <Text
                      style={[styles.noItemsText, { color: colors.textMuted }]}
                    >
                      No salespersons assigned to this warehouse
                    </Text>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.chipScroller}
                    >
                      {warehouseUsers.map((wu: any) => (
                        <TouchableOpacity
                          key={wu.user_id}
                          style={[
                            styles.selectChip,
                            {
                              backgroundColor:
                                selectedSalesperson === wu.user_id
                                  ? colors.primary
                                  : colors.surfaceSecondary,
                              borderColor:
                                selectedSalesperson === wu.user_id
                                  ? colors.primary
                                  : colors.border,
                            },
                          ]}
                          onPress={() => setSelectedSalesperson(wu.user_id)}
                        >
                          <Text
                            style={{
                              color:
                                selectedSalesperson === wu.user_id
                                  ? "#FFF"
                                  : colors.text,
                              fontSize: FontSize.sm,
                            }}
                          >
                            {wu.user?.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </>
              )}

              {/* Target Amount */}
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Target Amount (৳)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={targetAmount}
                onChangeText={setTargetAmount}
                placeholder="e.g. 50000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />

              {/* Period */}
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Period Start (YYYY-MM-DD)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={periodStart}
                onChangeText={setPeriodStart}
                placeholder="2026-03-01"
                placeholderTextColor={colors.textMuted}
              />

              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Period End (YYYY-MM-DD)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={periodEnd}
                onChangeText={setPeriodEnd}
                placeholder="2026-03-31"
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: creating ? 0.7 : 1,
                  },
                ]}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Target</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* FAB - Create Target */}
      {(isAdmin || isManager) && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
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
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["3xl"],
  },
  targetCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  targetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  targetInfo: { flex: 1 },
  salespersonName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  warehouseTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  warehouseName: { fontSize: FontSize.xs },
  targetAmounts: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.sm,
  },
  achievedAmount: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  amountDivider: { fontSize: FontSize.md },
  targetAmountText: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  progressFill: { height: "100%", borderRadius: 4 },
  targetFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  periodText: { fontSize: FontSize.xs },
  progressPercent: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    gap: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  emptySubtitle: {
    fontSize: FontSize.sm,
    textAlign: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  formContent: { padding: Spacing.lg },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  chipScroller: { maxHeight: 44 },
  selectChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  noItemsText: { fontSize: FontSize.sm, fontStyle: "italic" },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: FontSize.md,
  },
  submitButton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing["3xl"],
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});

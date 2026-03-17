import React, { useState, useEffect, useCallback, useRef } from "react";
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
  TextInput,
  ScrollView,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SafeAreaView } from "react-native-safe-area-context";
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
import PageHeader from "../../../src/components/ui/PageHeader";
import Button from "../../../src/components/ui/Button";

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
  location?: string;
}

export default function SalesTargetsScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const { setThemeMode } = useThemeStore();

  const toggleTheme = () => {
    const nextMode = scheme === "light" ? "dark" : "light";
    setThemeMode(nextMode);
  };

  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Search for the main list
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create form state
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseUsers, setWarehouseUsers] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [selectedSalesperson, setSelectedSalesperson] = useState<any>(null);
  const [targetAmount, setTargetAmount] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  // Modal Picker Search
  const [whSearch, setWhSearch] = useState("");
  const [spSearch, setSpSearch] = useState("");
  const [showWhPicker, setShowWhPicker] = useState(false);
  const [showSpPicker, setShowSpPicker] = useState(false);

  const isAdmin = currentUser?.role === "ADMIN";
  const isManager = currentUser?.role === "MANAGER";
  const isSalesperson = currentUser?.role === "SALESPERSON";

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  const fetchTargets = useCallback(async () => {
    if (!isAuthenticated) {
      setTargets([]);
      return;
    }
    try {
      const endpoint = isSalesperson
        ? Endpoints.SALES_TARGETS_MY
        : Endpoints.SALES_TARGETS;
      const res = await api.get(endpoint, {
        params: isSalesperson ? {} : { limit: 100 },
      });
      const result = res.data?.data || res.data;
      const items = Array.isArray(result)
        ? result
        : result?.data || result?.items || [];
      setTargets(items);
    } catch {
      Alert.alert("Error", "Failed to load sales targets");
    }
  }, [isAuthenticated, isSalesperson]);

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
        assignments.filter((a: any) => a.user?.role === "SALESPERSON" && a.user?.is_active !== false),
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
      fetchWarehouseUsers(selectedWarehouse.id);
    } else {
      setWarehouseUsers([]);
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
        salesperson_id: selectedSalesperson.id,
        warehouse_id: selectedWarehouse.id,
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
    setSelectedWarehouse(null);
    setSelectedSalesperson(null);
    setTargetAmount("");
    setPeriodStart("");
    setPeriodEnd("");
    setWhSearch("");
    setSpSearch("");
    setShowWhPicker(false);
    setShowSpPicker(false);
  };

  const getProgress = (target: SalesTarget) => {
    const achieved = Number(target.achieved_amount) || 0;
    const total = Number(target.target_amount) || 1;
    return Math.min(achieved / total, 1);
  };

  const formatCurrency = (val: number) =>
    `৳${Number(val || 0).toLocaleString("en-BD", { minimumFractionDigits: 0 })}`;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const filteredTargets = targets.filter(t => {
    const spName = (t.salesperson?.name || "").toLowerCase();
    const whName = (t.warehouse?.name || "").toLowerCase();
    const q = debouncedSearch.toLowerCase();
    return spName.includes(q) || whName.includes(q);
  });

  const filteredWhs = warehouses.filter(w => 
    w.name.toLowerCase().includes(whSearch.toLowerCase()) || 
    (w.location && w.location.toLowerCase().includes(whSearch.toLowerCase()))
  );

  const filteredSps = warehouseUsers.filter(wu => 
    wu.user?.name.toLowerCase().includes(spSearch.toLowerCase()) || 
    wu.user?.email.toLowerCase().includes(spSearch.toLowerCase())
  );

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
        title="Sales Targets"
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
        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search salesperson or warehouse..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Targets List */}
        <FlatList
          data={filteredTargets}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
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
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
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
                  <Text
                    style={[styles.achievedAmount, { color: progressColor }]}
                  >
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
                  <Text
                    style={[styles.periodText, { color: colors.textMuted }]}
                  >
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
              <Text
                style={[styles.emptyTitle, { color: colors.textSecondary }]}
              >
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
      </View>

      {/* Create Target Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
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

            <ScrollView style={styles.formContent} keyboardShouldPersistTaps="handled">
              {/* Warehouse Selector */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Warehouse *</Text>
              <TouchableOpacity
                style={[styles.pickerBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                onPress={() => { setShowWhPicker(!showWhPicker); setShowSpPicker(false); }}
              >
                <Text style={{ color: selectedWarehouse ? colors.text : colors.textMuted }}>
                  {selectedWarehouse ? selectedWarehouse.name : "Select Warehouse"}
                </Text>
                <Ionicons name={showWhPicker ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {showWhPicker && (
                <View style={[styles.pickerDropdown, { borderColor: colors.border }]}>
                  <TextInput
                    placeholder="Search warehouse..."
                    style={[styles.pickerSearch, { color: colors.text, borderBottomColor: colors.borderLight }]}
                    value={whSearch}
                    onChangeText={setWhSearch}
                    autoFocus
                  />
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {filteredWhs.map(w => (
                      <TouchableOpacity
                        key={w.id}
                        style={[styles.pickerItem, selectedWarehouse?.id === w.id && { backgroundColor: colors.primary + "10" }]}
                        onPress={() => { setSelectedWarehouse(w); setShowWhPicker(false); setSelectedSalesperson(null); }}
                      >
                        <Text style={{ color: colors.text }}>{w.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Salesperson Selector */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Salesperson *</Text>
              <TouchableOpacity
                style={[
                  styles.pickerBtn, 
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                  !selectedWarehouse && { opacity: 0.5 }
                ]}
                onPress={() => { 
                  if (!selectedWarehouse) {
                    Alert.alert("Warehouse Required", "Please select a warehouse first");
                    return;
                  }
                  setShowSpPicker(!showSpPicker); 
                  setShowWhPicker(false); 
                }}
              >
                <Text style={{ color: selectedSalesperson ? colors.text : colors.textMuted }}>
                  {selectedSalesperson ? selectedSalesperson.user?.name : "Select Salesperson"}
                </Text>
                <Ionicons name={showSpPicker ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {showSpPicker && (
                <View style={[styles.pickerDropdown, { borderColor: colors.border }]}>
                  <TextInput
                    placeholder="Search salesperson..."
                    style={[styles.pickerSearch, { color: colors.text, borderBottomColor: colors.borderLight }]}
                    value={spSearch}
                    onChangeText={setSpSearch}
                    autoFocus
                  />
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {filteredSps.map(wu => (
                      <TouchableOpacity
                        key={wu.user_id}
                        style={[styles.pickerItem, selectedSalesperson?.id === wu.id && { backgroundColor: colors.primary + "10" }]}
                        onPress={() => { setSelectedSalesperson(wu); setShowSpPicker(false); }}
                      >
                        <Text style={{ color: colors.text }}>{wu.user?.name}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{wu.user?.email}</Text>
                      </TouchableOpacity>
                    ))}
                    {filteredSps.length === 0 && (
                      <Text style={{ padding: Spacing.md, color: colors.textMuted, textAlign: "center" }}>No salespersons found</Text>
                    )}
                  </ScrollView>
                </View>
              )}

              {/* Target Amount */}
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Target Amount (৳) *
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
                placeholder="e.g. 100000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Start Date *</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                    value={periodStart}
                    onChangeText={setPeriodStart}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>End Date *</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                    value={periodEnd}
                    onChangeText={setPeriodEnd}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <Button
                title="Create Target"
                onPress={handleCreate}
                loading={creating}
                style={{ marginTop: Spacing.xl, marginBottom: Spacing["3xl"] }}
              />
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
  mainContent: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm + 2,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.md,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  formContent: { padding: Spacing.lg },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  pickerBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    padding: Spacing.md, 
    borderRadius: BorderRadius.md, 
    borderWidth: 1 
  },
  pickerDropdown: { 
    marginTop: Spacing.xs, 
    borderRadius: BorderRadius.md, 
    borderWidth: 1, 
    overflow: "hidden" 
  },
  pickerSearch: { 
    padding: Spacing.md, 
    borderBottomWidth: 1, 
    fontSize: FontSize.sm 
  },
  pickerItem: { 
    padding: Spacing.md, 
    borderBottomWidth: 0.5, 
    borderBottomColor: "#eee" 
  },
  row: { flexDirection: "row", alignItems: "center" },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
  },
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

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
import PageHeader from "../../../src/components/ui/PageHeader";

interface Sale {
  id: string;
  salesperson_id: string;
  warehouse_id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  customer_name: string;
  customer_phone: string;
  notes: string;
  created_at: string;
  salesperson?: { id: string; name: string; email: string };
  warehouse?: { id: string; name: string };
  items?: any[];
}

type FilterTab = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "ALL";

export default function SalesApprovalsScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("PENDING_APPROVAL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSales = useCallback(async () => {
    if (!isAuthenticated) {
      setSales([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const params: any = { limit: 50 };
      if (activeTab !== "ALL") {
        params.status = activeTab;
      }
      const res = await api.get(Endpoints.SALES, { params });
      const result = res.data?.data || res.data;
      const items =
        result?.data || result?.items || (Array.isArray(result) ? result : []);
      setSales(items);
    } catch {
      Alert.alert("Error", "Failed to load sales");
    }
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchSales();
      setLoading(false);
    };
    load();
  }, [fetchSales]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSales();
    setRefreshing(false);
  };

  const approveSale = async (saleId: string) => {
    setActionLoading(saleId);
    try {
      await api.post(`${Endpoints.SALES}/${saleId}/approve`);
      Alert.alert("Success", "Sale approved");
      await fetchSales();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to approve sale",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const rejectSale = (saleId: string) => {
    Alert.alert(
      "Reject Sale",
      "Are you sure you want to reject this sale? Stock will be restored.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setActionLoading(saleId);
            try {
              await api.post(`${Endpoints.SALES}/${saleId}/reject`, {
                notes: "Rejected by manager",
              });
              Alert.alert("Rejected", "Sale rejected and stock restored");
              await fetchSales();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to reject sale",
              );
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "APPROVED":
        return {
          bg: colors.successLight,
          text: colors.success,
          icon: "checkmark-circle" as const,
        };
      case "REJECTED":
        return {
          bg: colors.dangerLight,
          text: colors.danger,
          icon: "close-circle" as const,
        };
      case "PENDING_APPROVAL":
        return {
          bg: colors.warningLight,
          text: colors.warning,
          icon: "time" as const,
        };
      default:
        return {
          bg: colors.surfaceSecondary,
          text: colors.textSecondary,
          icon: "help-circle" as const,
        };
    }
  };

  const formatCurrency = (val: number) =>
    `৳${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "PENDING_APPROVAL", label: "Pending" },
    { key: "APPROVED", label: "Approved" },
    { key: "REJECTED", label: "Rejected" },
    { key: "ALL", label: "All" },
  ];

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
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader title="Sale Approvals" showBack />

      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {/* Filter Tabs */}
        <View
          style={[
            styles.tabContainer,
            {
              borderBottomColor: colors.borderLight,
              backgroundColor: colors.surface,
            },
          ]}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === tab.key ? colors.primary : colors.textMuted,
                    fontWeight:
                      activeTab === tab.key
                        ? FontWeight.semibold
                        : FontWeight.regular,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sales List */}
      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const statusStyle = getStatusStyle(item.status);
          const isProcessing = actionLoading === item.id;
          return (
            <TouchableOpacity
              style={[
                styles.saleCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                Shadow.sm,
              ]}
              onPress={() => router.push(`/sales/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.saleHeader}>
                <View style={styles.saleInfo}>
                  <Text style={[styles.customerName, { color: colors.text }]}>
                    {item.customer_name || "Walk-in Customer"}
                  </Text>
                  <Text
                    style={[
                      styles.salespersonText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    by {item.salesperson?.name || "Unknown"}
                  </Text>
                  {item.warehouse && (
                    <View style={styles.warehouseTag}>
                      <Ionicons
                        name="business-outline"
                        size={11}
                        color={colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.warehouseName,
                          { color: colors.textMuted },
                        ]}
                      >
                        {item.warehouse.name}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.saleAmountSection}>
                  <Text style={[styles.saleAmount, { color: colors.text }]}>
                    {formatCurrency(item.total_amount)}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusStyle.bg },
                    ]}
                  >
                    <Ionicons
                      name={statusStyle.icon}
                      size={12}
                      color={statusStyle.text}
                    />
                    <Text
                      style={[styles.statusText, { color: statusStyle.text }]}
                    >
                      {item.status.replace("_", " ")}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.saleFooter}>
                <Text style={[styles.dateText, { color: colors.textMuted }]}>
                  {formatDate(item.created_at)}
                </Text>

                {item.status === "PENDING_APPROVAL" && (
                  <View style={styles.actionButtons}>
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.actionBtn,
                            { backgroundColor: colors.successLight },
                          ]}
                          onPress={() => approveSale(item.id)}
                        >
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={colors.success}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.actionBtn,
                            { backgroundColor: colors.dangerLight },
                          ]}
                          onPress={() => rejectSale(item.id)}
                        >
                          <Ionicons
                            name="close"
                            size={18}
                            color={colors.danger}
                          />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="receipt-outline"
              size={48}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              No Sales Found
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {activeTab === "PENDING_APPROVAL"
                ? "No pending sales awaiting approval"
                : `No ${activeTab.toLowerCase().replace("_", " ")} sales`}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  tabText: { fontSize: FontSize.sm },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["3xl"],
  },
  saleCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  saleInfo: { flex: 1 },
  customerName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  salespersonText: { fontSize: FontSize.xs, marginTop: 2 },
  warehouseTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  warehouseName: { fontSize: FontSize.xs },
  saleAmountSection: { alignItems: "flex-end" },
  saleAmount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  saleFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: { fontSize: FontSize.xs },
  actionButtons: { flexDirection: "row", gap: Spacing.sm },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
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
});

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
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

type PaymentFilter = "ALL" | "PAID" | "UNPAID" | "CANCELLED";

export default function SalesListScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchSales = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      try {
        const endpoint = isAdmin ? Endpoints.SALES : Endpoints.MY_SALES;
        const params: any = { page: pageNum, limit: 20 };
        if (paymentFilter !== "ALL") {
          params.payment_status = paymentFilter;
        }
        const response = await api.get(endpoint, { params });
        const result = response.data?.data || response.data;
        const items =
          result?.data ||
          result?.items ||
          (Array.isArray(result) ? result : []);

        if (isRefresh || pageNum === 1) {
          setSales(items);
        } else {
          setSales((prev) => [...prev, ...items]);
        }
        setHasMore(items.length >= 20);
      } catch (err) {
        console.error("Sales fetch error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [isAdmin, paymentFilter],
  );

  // Re-fetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setPage(1);
      fetchSales(1, true);
    }, [fetchSales]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchSales(1, true);
  };

  const loadMore = () => {
    if (!hasMore || loading || loadingMore) return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    fetchSales(next);
  };

  const getStatusBadge = (
    status: string,
  ): "success" | "danger" | "warning" | "info" => {
    switch (status) {
      case "PAID":
        return "success";
      case "CANCELLED":
        return "danger";
      default:
        return "warning";
    }
  };

  const filterChips: {
    label: string;
    value: PaymentFilter;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { label: "All", value: "ALL", icon: "list-outline" },
    { label: "Paid", value: "PAID", icon: "checkmark-circle-outline" },
    { label: "Unpaid", value: "UNPAID", icon: "time-outline" },
    { label: "Cancelled", value: "CANCELLED", icon: "close-circle-outline" },
  ];

  const renderSale = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.card,
        Shadow.sm,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
      onPress={() => router.push(`/(app)/sales/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.saleIcon,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <Ionicons name="receipt" size={18} color={colors.primary} />
          </View>
          <View style={styles.saleInfo}>
            <Text style={[styles.amount, { color: colors.text }]}>
              ৳{Number(item.total_amount || 0).toLocaleString()}
            </Text>
            <Text style={[styles.date, { color: colors.textMuted }]}>
              {new Date(item.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              ·{" "}
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <Badge
            text={item.payment_status}
            variant={getStatusBadge(item.payment_status)}
          />
        </View>

        {/* Customer & Items info */}
        <View
          style={[styles.cardFooter, { borderTopColor: colors.borderLight }]}
        >
          {item.customer_name ? (
            <View style={styles.footerItem}>
              <Ionicons
                name="person-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text
                style={[styles.footerText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.customer_name}
              </Text>
            </View>
          ) : (
            <View style={styles.footerItem}>
              <Ionicons
                name="person-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                Walk-in customer
              </Text>
            </View>
          )}
          {item.items && (
            <View style={styles.footerItem}>
              <Ionicons
                name="cube-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                {item.items.length} item{item.items.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {filterChips.map((chip) => {
          const isActive = paymentFilter === chip.value;
          return (
            <TouchableOpacity
              key={chip.value}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive
                    ? colors.primary
                    : colors.surfaceSecondary,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setPaymentFilter(chip.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={chip.icon}
                size={14}
                color={isActive ? "#FFFFFF" : colors.textSecondary}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: isActive ? "#FFFFFF" : colors.textSecondary },
                ]}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={styles.chipSpacer} />
        <Text style={[styles.countText, { color: colors.textMuted }]}>
          {sales.length} sale{sales.length !== 1 ? "s" : ""}
        </Text>
      </ScrollView>

      {loading && sales.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={sales}
          renderItem={renderSale}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ paddingVertical: Spacing.lg }}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="receipt-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {paymentFilter !== "ALL"
                  ? `No ${paymentFilter.toLowerCase()} sales`
                  : "No sales yet"}
              </Text>
              {paymentFilter === "ALL" && (
                <Text
                  style={[styles.emptySubtext, { color: colors.textMuted }]}
                >
                  Tap + to record your first sale
                </Text>
              )}
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push("/(app)/sales/create")}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  chipSpacer: { width: Spacing.md },
  countText: {
    fontSize: FontSize.xs,
  },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  cardContent: { padding: Spacing.lg },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  saleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  saleInfo: { flex: 1 },
  amount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  date: { fontSize: FontSize.xs, marginTop: 1 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  footerText: { fontSize: FontSize.xs },
  empty: { alignItems: "center", paddingTop: Spacing["5xl"] },
  emptyText: { fontSize: FontSize.md, marginTop: Spacing.md },
  emptySubtext: { fontSize: FontSize.sm, marginTop: Spacing.xs },
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
});

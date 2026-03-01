import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
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
import DateRangePicker from "../../../src/components/ui/DateRangePicker";
import PageHeader from "../../../src/components/ui/PageHeader";

type PaymentFilter = "ALL" | "PAID" | "PENDING" | "CANCELLED";
type SortOption = "newest" | "oldest" | "amount_asc" | "amount_desc";

export default function SalesListScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showSort, setShowSort] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input — 400ms delay
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  const fetchSales = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      try {
        const endpoint = isAdmin ? Endpoints.SALES : Endpoints.MY_SALES;
        const params: any = { page: pageNum, limit: 20 };
        if (paymentFilter !== "ALL") {
          params.payment_status = paymentFilter;
        }
        if (debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }
        if (dateFrom) params.from = dateFrom;
        if (dateTo) params.to = dateTo;
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
    [isAdmin, paymentFilter, debouncedSearch, dateFrom, dateTo],
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
    { label: "Unpaid", value: "PENDING", icon: "time-outline" },
    { label: "Cancelled", value: "CANCELLED", icon: "close-circle-outline" },
  ];

  const sortOptions: {
    label: string;
    value: SortOption;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { label: "Newest", value: "newest", icon: "time-outline" },
    { label: "Oldest", value: "oldest", icon: "hourglass-outline" },
    { label: "Amount ↑", value: "amount_asc", icon: "trending-up-outline" },
    { label: "Amount ↓", value: "amount_desc", icon: "trending-down-outline" },
  ];

  const sortedSales = [...sales].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return (
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime()
        );
      case "amount_asc":
        return Number(a.total_amount || 0) - Number(b.total_amount || 0);
      case "amount_desc":
        return Number(b.total_amount || 0) - Number(a.total_amount || 0);
      case "newest":
      default:
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
    }
  });

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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surface }]}
      edges={["top"]}
    >
      <PageHeader title="Sales" />

      {/* Search */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          placeholder="Search by customer name..."
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

      {/* Filter + Sort Row */}
      <View style={styles.filterRow}>
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
        <TouchableOpacity
          style={[
            styles.sortBtn,
            {
              backgroundColor: showSort
                ? colors.primary
                : colors.surfaceSecondary,
              borderColor: showSort ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setShowSort(!showSort)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="swap-vertical-outline"
            size={14}
            color={showSort ? "#FFF" : colors.textSecondary}
          />
          <Text
            style={[
              styles.chipText,
              { color: showSort ? "#FFF" : colors.textSecondary },
            ]}
          >
            Sort
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sort Options */}
      {showSort && (
        <View style={styles.sortRow}>
          {sortOptions.map((opt) => {
            const isActive = sortBy === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.sortChip,
                  {
                    backgroundColor: isActive
                      ? colors.primary + "15"
                      : colors.surfaceSecondary,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setSortBy(opt.value);
                  setShowSort(false);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={opt.icon}
                  size={12}
                  color={isActive ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.sortChipText,
                    { color: isActive ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Date Range Filter */}
      <DateRangePicker
        fromDate={dateFrom}
        toDate={dateTo}
        onApply={(from, to) => {
          setDateFrom(from);
          setDateTo(to);
        }}
      />

      {loading && sales.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={sortedSales}
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
                {search
                  ? "No matching sales"
                  : paymentFilter !== "ALL"
                    ? `No ${paymentFilter.toLowerCase()} sales`
                    : "No sales yet"}
              </Text>
              {paymentFilter === "ALL" && !search && (
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
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
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    flexWrap: "wrap",
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
  chipSpacer: { flex: 1 },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  sortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    paddingTop: Spacing.md,
  },
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

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../src/services/api";
import { Endpoints } from "../../../src/constants/api";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadow,
} from "../../../src/constants/theme";
import Badge from "../../../src/components/ui/Badge";
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from "@/src/components/ui/PageHeader";
import { useAuthStore } from "../../../src/stores/auth-store";
import { useThemeStore } from "../../../src/stores/theme-store";

type TabType = "warehouse" | "assignments";
type StockSort =
  | "newest"
  | "product_asc"
  | "product_desc"
  | "qty_asc"
  | "qty_desc";
type StockFilter = "ALL" | "LOW" | "OK";

export default function StockScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { setThemeMode } = useThemeStore();

  const toggleTheme = () => {
    const nextMode = scheme === "light" ? "dark" : "light";
    setThemeMode(nextMode);
  };

  const [tab, setTab] = useState<TabType>("warehouse");
  const [stocks, setStocks] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sort & filter
  const [sortBy, setSortBy] = useState<StockSort>("newest");
  const [showSort, setShowSort] = useState(false);
  const [stockFilter, setStockFilter] = useState<StockFilter>("ALL");

  // Enable smooth layout transitions on Android
  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

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

  const fetchWarehouseStock = useCallback(async () => {
    if (!isAuthenticated) {
      setStocks([]);
      return;
    }
    try {
      const response = await api.get(Endpoints.STOCK, {
        params: { page: 1, limit: 100 },
      });
      const result = response.data?.data || response.data;
      setStocks(
        result?.data || result?.items || (Array.isArray(result) ? result : []),
      );
    } catch (err) {
      console.error("Stock fetch error:", err);
    }
  }, [isAuthenticated]);

  const fetchAssignments = useCallback(async () => {
    if (!isAuthenticated) {
      setAssignments([]);
      return;
    }
    try {
      const response = await api.get(Endpoints.STOCK_ASSIGNMENTS, {
        params: { page: 1, limit: 100 },
      });
      const result = response.data?.data || response.data;
      setAssignments(
        result?.data || result?.items || (Array.isArray(result) ? result : []),
      );
    } catch (err) {
      console.error("Assignments fetch error:", err);
    }
  }, [isAuthenticated]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchWarehouseStock(), fetchAssignments()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchWarehouseStock, fetchAssignments]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  // Reset search/sort/filter when switching tabs
  const handleTabSwitch = (newTab: TabType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTab(newTab);
    setSearch("");
    setDebouncedSearch("");
    setSortBy("newest");
    setStockFilter("ALL");
    setShowSort(false);
  };

  const tabs: {
    key: TabType;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { key: "warehouse", label: "Warehouse Stock", icon: "cube-outline" },
    { key: "assignments", label: "Assignments", icon: "people-outline" },
  ];

  const sortOptions: {
    label: string;
    value: StockSort;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { label: "Newest", value: "newest", icon: "time-outline" },
    { label: "Product A–Z", value: "product_asc", icon: "arrow-up-outline" },
    { label: "Product Z–A", value: "product_desc", icon: "arrow-down-outline" },
    { label: "Qty ↑", value: "qty_asc", icon: "trending-up-outline" },
    { label: "Qty ↓", value: "qty_desc", icon: "trending-down-outline" },
  ];

  const filterChips: {
    label: string;
    value: StockFilter;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { label: "All", value: "ALL", icon: "list-outline" },
    { label: "Low Stock", value: "LOW", icon: "warning-outline" },
    { label: "In Stock", value: "OK", icon: "checkmark-circle-outline" },
  ];

  // Filter and sort warehouse stock
  const filteredStocks = stocks
    .filter((item) => {
      const name = (item.product?.name || "").toLowerCase();
      const warehouse = (item.warehouse?.name || "").toLowerCase();
      const q = debouncedSearch.toLowerCase();
      if (q && !name.includes(q) && !warehouse.includes(q)) return false;
      if (stockFilter === "LOW" && (item.quantity ?? 0) >= 10) return false;
      if (stockFilter === "OK" && (item.quantity ?? 0) < 10) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "product_asc":
          return (a.product?.name || "").localeCompare(b.product?.name || "");
        case "product_desc":
          return (b.product?.name || "").localeCompare(a.product?.name || "");
        case "qty_asc":
          return (a.quantity ?? 0) - (b.quantity ?? 0);
        case "qty_desc":
          return (b.quantity ?? 0) - (a.quantity ?? 0);
        case "newest":
        default:
          return (
            new Date(b.created_at || b.added_at || 0).getTime() -
            new Date(a.created_at || a.added_at || 0).getTime()
          );
      }
    });

  // Filter and sort assignments
  const filteredAssignments = assignments
    .filter((item) => {
      const product = (item.product?.name || "").toLowerCase();
      const salesperson = (item.salesperson?.name || "").toLowerCase();
      const warehouse = (item.warehouse?.name || "").toLowerCase();
      const q = debouncedSearch.toLowerCase();
      if (
        q &&
        !product.includes(q) &&
        !salesperson.includes(q) &&
        !warehouse.includes(q)
      )
        return false;
      const remaining = item.quantity_remaining ?? item.quantity ?? 0;
      if (stockFilter === "LOW" && remaining >= 5) return false;
      if (stockFilter === "OK" && remaining < 5) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "product_asc":
          return (a.product?.name || "").localeCompare(b.product?.name || "");
        case "product_desc":
          return (b.product?.name || "").localeCompare(a.product?.name || "");
        case "qty_asc":
          return (
            (a.quantity_remaining ?? a.quantity ?? 0) -
            (b.quantity_remaining ?? b.quantity ?? 0)
          );
        case "qty_desc":
          return (
            (b.quantity_remaining ?? b.quantity ?? 0) -
            (a.quantity_remaining ?? a.quantity ?? 0)
          );
        case "newest":
        default:
          return (
            new Date(b.assigned_at || b.created_at || 0).getTime() -
            new Date(a.assigned_at || a.created_at || 0).getTime()
          );
      }
    });

  const renderStockItem = ({ item }: { item: any }) => {
    const isLow = (item.quantity ?? 0) < 10;
    return (
      <View
        style={[
          styles.card,
          Shadow.sm,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.row}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isLow
                  ? colors.danger + "15"
                  : colors.primary + "15",
              },
            ]}
          >
            <Ionicons
              name="cube"
              size={18}
              color={isLow ? colors.danger : colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>
              {item.product?.name || "Product"}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons
                name="business-outline"
                size={12}
                color={colors.textMuted}
              />
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {item.warehouse?.name || "Warehouse"}
              </Text>
            </View>
          </View>
          <View style={styles.qtyCol}>
            <Text
              style={[
                styles.qty,
                { color: isLow ? colors.danger : colors.text },
              ]}
            >
              {item.quantity}
            </Text>
            {isLow && <Badge text="Low" variant="danger" />}
          </View>
        </View>
      </View>
    );
  };

  const renderAssignment = ({ item }: { item: any }) => (
    <View
      style={[
        styles.card,
        Shadow.sm,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.primary + "15" },
          ]}
        >
          <Ionicons name="person" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>
            {item.salesperson?.name || "Salesperson"}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {item.product?.name || "Product"}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons
              name="business-outline"
              size={12}
              color={colors.textMuted}
            />
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {item.warehouse?.name || "—"}
            </Text>
          </View>
        </View>
        <View style={styles.qtyCol}>
          <Text style={[styles.qty, { color: colors.text }]}>
            {item.quantity}
          </Text>
          <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>
            assigned
          </Text>
          {item.quantity_remaining != null && (
            <Text
              style={[
                styles.qtyRemaining,
                {
                  color:
                    item.quantity_remaining < 5
                      ? colors.danger
                      : colors.success,
                },
              ]}
            >
              {item.quantity_remaining} left
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const data = tab === "warehouse" ? filteredStocks : filteredAssignments;
  const renderItem = tab === "warehouse" ? renderStockItem : renderAssignment;
  const emptyIcon = tab === "warehouse" ? "cube-outline" : "people-outline";
  const hasFilters = search.length > 0 || stockFilter !== "ALL";
  const emptyText = hasFilters
    ? "No matching items"
    : tab === "warehouse"
      ? "No stock in warehouses"
      : "No assignments yet";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader
        title="Stock"
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
        {/* Tabs */}
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          {tabs.map((t) => {
            const isActive = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tab,
                  isActive && {
                    borderBottomColor: colors.primary,
                    borderBottomWidth: 2,
                  },
                ]}
                onPress={() => handleTabSwitch(t.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={t.icon}
                  size={16}
                  color={isActive ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? colors.primary : colors.textMuted,
                      fontWeight: isActive
                        ? FontWeight.semibold
                        : FontWeight.regular,
                    },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
            placeholder={
              tab === "warehouse"
                ? "Search by product or warehouse..."
                : "Search by salesperson or product..."
            }
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter + Sort Row */}
        <View style={styles.filterRow}>
          {filterChips.map((chip) => {
            const isActive = stockFilter === chip.value;
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
                onPress={() => setStockFilter(chip.value)}
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
                      {
                        color: isActive ? colors.primary : colors.textSecondary,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={(item, i) => item.id || String(i)}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name={emptyIcon} size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {emptyText}
                </Text>
              </View>
            }
          />
        )}

        {/* FABs stacked bottom-right */}
        <View style={styles.fabCol}>
          <TouchableOpacity
            style={[styles.fabSmall, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(app)/profile/stock-add" as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(app)/profile/stock-assign" as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-forward" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContent: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  tabLabel: {
    fontSize: FontSize.sm,
  },
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
  list: { padding: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 100 },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  meta: { fontSize: FontSize.xs, marginTop: 2 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  qtyCol: { alignItems: "flex-end", gap: 2 },
  qty: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  qtyLabel: { fontSize: FontSize.xs },
  qtyRemaining: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  empty: { alignItems: "center", paddingTop: Spacing["5xl"] },
  emptyText: { fontSize: FontSize.md, marginTop: Spacing.md },
  fabCol: {
    position: "absolute",
    bottom: 24,
    right: 20,
    alignItems: "center",
    gap: Spacing.sm,
  },
  fabSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  fab: {
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
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

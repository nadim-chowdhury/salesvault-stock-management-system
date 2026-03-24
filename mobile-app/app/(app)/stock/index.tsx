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

  const [stocks, setStocks] = useState<any[]>([]);
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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await fetchWarehouseStock();
    setLoading(false);
    setRefreshing(false);
  }, [fetchWarehouseStock]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

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

  const renderStockItem = ({ item }: { item: any }) => {
    const isLow = (item.quantity ?? 0) < 10;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/(app)/stock/adjust" as any,
            params: {
              productId: item.product_id || item.product?.id,
              warehouseId: item.warehouse_id || item.warehouse?.id,
              currentQuantity: item.quantity,
              productName: item.product?.name,
            },
          })
        }
      >
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
      </TouchableOpacity>
    );
  };

  const hasFilters = search.length > 0 || stockFilter !== "ALL";
  const emptyText = hasFilters ? "No matching items" : "No stock in warehouses";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader
        title="Warehouse Stock"
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
            placeholder="Search by product or warehouse..."
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
            data={filteredStocks}
            renderItem={renderStockItem}
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
                <Ionicons
                  name="cube-outline"
                  size={48}
                  color={colors.textMuted}
                />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {emptyText}
                </Text>
              </View>
            }
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(app)/stock/add" as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>
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
  empty: { alignItems: "center", paddingTop: Spacing["5xl"] },
  emptyText: { fontSize: FontSize.md, marginTop: Spacing.md },
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
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

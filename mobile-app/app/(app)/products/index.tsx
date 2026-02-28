import React, { useState, useCallback } from "react";
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

type FilterStatus = "ALL" | "ACTIVE" | "INACTIVE";

export default function ProductsListScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { user } = useAuthStore();
  const canCreate = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchProducts = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      try {
        const params: any = { page: pageNum, limit: 20 };
        if (search.trim()) params.search = search.trim();
        if (filterStatus === "ACTIVE") params.is_active = "true";
        if (filterStatus === "INACTIVE") params.is_active = "false";

        const response = await api.get(Endpoints.PRODUCTS, { params });
        const result = response.data?.data || response.data;
        const items =
          result?.data ||
          result?.items ||
          (Array.isArray(result) ? result : []);

        if (isRefresh || pageNum === 1) {
          setProducts(items);
        } else {
          setProducts((prev) => [...prev, ...items]);
        }
        setHasMore(items.length >= 20);
      } catch (err) {
        console.error("Products fetch error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search, filterStatus],
  );

  // Re-fetch when screen comes into focus (returning from create/edit/detail)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setPage(1);
      fetchProducts(1, true);
    }, [fetchProducts]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchProducts(1, true);
  };

  const loadMore = () => {
    if (!hasMore || loading || loadingMore) return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    fetchProducts(next);
  };

  const filterChips: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

  const renderProduct = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.card,
        Shadow.sm,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
      onPress={() => router.push(`/(app)/products/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.productIcon,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <Ionicons name="cube" size={18} color={colors.primary} />
          </View>
          <View style={styles.productInfo}>
            <Text
              style={[styles.productName, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text style={[styles.sku, { color: colors.textMuted }]}>
              SKU: {item.sku}
            </Text>
          </View>
          <Badge
            text={item.is_active ? "Active" : "Inactive"}
            variant={item.is_active ? "success" : "danger"}
          />
        </View>
        <View style={styles.priceRow}>
          <View style={styles.priceCol}>
            <Text style={[styles.priceLabel, { color: colors.textMuted }]}>
              Price
            </Text>
            <Text style={[styles.price, { color: colors.primary }]}>
              ৳{Number(item.price || 0).toLocaleString()}
            </Text>
          </View>
          {item.cost_price != null && (
            <View style={styles.priceCol}>
              <Text style={[styles.priceLabel, { color: colors.textMuted }]}>
                Cost
              </Text>
              <Text style={[styles.costPrice, { color: colors.textSecondary }]}>
                ৳{Number(item.cost_price).toLocaleString()}
              </Text>
            </View>
          )}
          {item.cost_price != null && (
            <View style={[styles.priceCol, { alignItems: "flex-end" }]}>
              <Text style={[styles.priceLabel, { color: colors.textMuted }]}>
                Margin
              </Text>
              <Text style={[styles.margin, { color: colors.success }]}>
                ৳
                {(
                  Number(item.price || 0) - Number(item.cost_price || 0)
                ).toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          placeholder="Search products..."
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

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {filterChips.map((chip) => {
          const isActive = filterStatus === chip.value;
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
              onPress={() => setFilterStatus(chip.value)}
              activeOpacity={0.7}
            >
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
          {products.length} product{products.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {loading && products.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
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
                name="cube-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {search || filterStatus !== "ALL"
                  ? "No matching products"
                  : "No products yet"}
              </Text>
              {canCreate && !search && filterStatus === "ALL" && (
                <Text
                  style={[styles.emptySubtext, { color: colors.textMuted }]}
                >
                  Tap + to create your first product
                </Text>
              )}
            </View>
          }
        />
      )}

      {canCreate && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(app)/products/create")}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
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
  },
  chip: {
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
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  productIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: { flex: 1 },
  productName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  sku: { fontSize: FontSize.xs, marginTop: 1 },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.xl,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
  },
  priceCol: { gap: 2 },
  priceLabel: { fontSize: FontSize.xs },
  price: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  costPrice: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  margin: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
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

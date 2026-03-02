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
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter, useFocusEffect } from "expo-router";
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
import PageHeader from "@/src/components/ui/PageHeader";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterStatus = "ALL" | "ACTIVE" | "INACTIVE";
type SortOption = "newest" | "name_asc" | "name_desc" | "location";

export default function WarehousesScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { setThemeMode } = useThemeStore();
  const canCreate = user?.role === "ADMIN" || user?.role === "MANAGER";

  const toggleTheme = () => {
    const nextMode = scheme === "light" ? "dark" : "light";
    setThemeMode(nextMode);
  };

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showSort, setShowSort] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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

  const fetchWarehouses = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      if (!isAuthenticated) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        setWarehouses([]);
        return;
      }
      try {
        const params: any = { page: pageNum, limit: 20 };
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (filterStatus === "ACTIVE") params.is_active = "true";
        if (filterStatus === "INACTIVE") params.is_active = "false";

        const response = await api.get(Endpoints.WAREHOUSES, { params });
        const result = response.data?.data || response.data;
        const items =
          result?.data ||
          result?.items ||
          (Array.isArray(result) ? result : []);

        if (isRefresh || pageNum === 1) {
          setWarehouses(items);
        } else {
          setWarehouses((prev) => [...prev, ...items]);
        }
        setHasMore(items.length >= 20);
      } catch (err) {
        console.error("Warehouses fetch error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [isAuthenticated, debouncedSearch, filterStatus],
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setPage(1);
      fetchWarehouses(1, true);
    }, [fetchWarehouses]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchWarehouses(1, true);
  };

  const loadMore = () => {
    if (!hasMore || loading || loadingMore) return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    fetchWarehouses(next);
  };

  const filterChips: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

  const sortOptions: {
    label: string;
    value: SortOption;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { label: "Newest", value: "newest", icon: "time-outline" },
    { label: "Name A–Z", value: "name_asc", icon: "arrow-up-outline" },
    { label: "Name Z–A", value: "name_desc", icon: "arrow-down-outline" },
    { label: "Location", value: "location", icon: "location-outline" },
  ];

  const sortedWarehouses = [...warehouses].sort((a, b) => {
    switch (sortBy) {
      case "name_asc":
        return (a.name || "").localeCompare(b.name || "");
      case "name_desc":
        return (b.name || "").localeCompare(a.name || "");
      case "location":
        return (a.location || "").localeCompare(b.location || "");
      case "newest":
      default:
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
    }
  });

  const hasFilters = filterStatus !== "ALL" || search.length > 0;

  const renderWarehouse = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.card,
        Shadow.sm,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
      onPress={() =>
        router.push({
          pathname: "/(app)/warehouses/[id]",
          params: { id: item.id },
        })
      }
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.primary + "15" },
          ]}
        >
          <Ionicons name="business-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          {item.location && (
            <View style={styles.metaRow}>
              <Ionicons
                name="location-outline"
                size={12}
                color={colors.textMuted}
              />
              <Text style={[styles.location, { color: colors.textMuted }]}>
                {item.location}
              </Text>
            </View>
          )}
        </View>
        <Badge
          text={item.is_active ? "Active" : "Inactive"}
          variant={item.is_active ? "success" : "danger"}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader
        title="Warehouses"
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
            placeholder="Search warehouses..."
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

        {loading && warehouses.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={sortedWarehouses}
            renderItem={renderWarehouse}
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
                  name="business-outline"
                  size={48}
                  color={colors.textMuted}
                />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {hasFilters ? "No matching warehouses" : "No warehouses yet"}
                </Text>
                {canCreate && !hasFilters && (
                  <Text
                    style={[styles.emptySubtext, { color: colors.textMuted }]}
                  >
                    Tap + to create your first warehouse
                  </Text>
                )}
              </View>
            }
          />
        )}

        {canCreate && (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(app)/warehouses/create")}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color="#FFF" />
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
  location: { fontSize: FontSize.xs, marginTop: 0 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
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
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

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
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadow,
} from "../../../src/constants/theme";
import Badge from "../../../src/components/ui/Badge";
import PageHeader from "../../../src/components/ui/PageHeader";

type RoleFilter = "ALL" | "ADMIN" | "MANAGER" | "SALESPERSON";
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type SortOption = "newest" | "name_asc" | "name_desc" | "role";

export default function UsersListScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
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

  const fetchUsers = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      try {
        const params: any = { page: pageNum, limit: 20 };
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (roleFilter !== "ALL") params.role = roleFilter;
        if (statusFilter === "ACTIVE") params.is_active = "true";
        if (statusFilter === "INACTIVE") params.is_active = "false";

        const response = await api.get(Endpoints.USERS, { params });
        const result = response.data?.data || response.data;
        const items =
          result?.data ||
          result?.items ||
          (Array.isArray(result) ? result : []);

        if (isRefresh || pageNum === 1) {
          setUsers(items);
        } else {
          setUsers((prev) => [...prev, ...items]);
        }
        setHasMore(items.length >= 20);
      } catch (err) {
        console.error("Users fetch error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, roleFilter, statusFilter],
  );

  // Re-fetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setPage(1);
      fetchUsers(1, true);
    }, [fetchUsers]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchUsers(1, true);
  };

  const loadMore = () => {
    if (!hasMore || loading || loadingMore) return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    fetchUsers(next);
  };

  const roleChips: {
    label: string;
    value: RoleFilter;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { label: "All", value: "ALL", icon: "people-outline" },
    { label: "Admin", value: "ADMIN", icon: "shield-outline" },
    { label: "Manager", value: "MANAGER", icon: "briefcase-outline" },
    { label: "Sales", value: "SALESPERSON", icon: "cart-outline" },
  ];

  const statusChips: {
    label: string;
    value: StatusFilter;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { label: "All", value: "ALL", icon: "ellipse-outline" },
    { label: "Active", value: "ACTIVE", icon: "checkmark-circle-outline" },
    { label: "Inactive", value: "INACTIVE", icon: "close-circle-outline" },
  ];

  const sortOptions: {
    label: string;
    value: SortOption;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { label: "Newest", value: "newest", icon: "time-outline" },
    { label: "Name A–Z", value: "name_asc", icon: "arrow-up-outline" },
    { label: "Name Z–A", value: "name_desc", icon: "arrow-down-outline" },
    { label: "Role", value: "role", icon: "shield-outline" },
  ];

  const sortedUsers = [...users].sort((a, b) => {
    switch (sortBy) {
      case "name_asc":
        return (a.name || "").localeCompare(b.name || "");
      case "name_desc":
        return (b.name || "").localeCompare(a.name || "");
      case "role": {
        const order: Record<string, number> = {
          ADMIN: 0,
          MANAGER: 1,
          SALESPERSON: 2,
        };
        return (order[a.role] ?? 3) - (order[b.role] ?? 3);
      }
      case "newest":
      default:
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
    }
  });

  const getRoleBadge = (
    role: string,
  ): "danger" | "warning" | "info" | "success" => {
    switch (role) {
      case "ADMIN":
        return "danger";
      case "MANAGER":
        return "warning";
      default:
        return "info";
    }
  };

  const renderUser = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.card,
        Shadow.sm,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
      onPress={() =>
        router.push({
          pathname: "/(app)/profile/user-detail",
          params: { id: item.id },
        })
      }
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View
          style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}
        >
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {(item.name || "U").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>
            {item.email}
          </Text>
        </View>
        <View style={styles.badges}>
          <Badge text={item.role} variant={getRoleBadge(item.role)} />
          {!item.is_active && <Badge text="Inactive" variant="danger" />}
        </View>
      </View>
    </TouchableOpacity>
  );

  const hasFilters =
    roleFilter !== "ALL" || statusFilter !== "ALL" || search.length > 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader title="User Management" showBack />

      <View style={[styles.mainContent, { backgroundColor: colors.surface }]}>
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
            placeholder="Search users..."
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

        {/* Role Filter + Sort Row */}
        <View style={styles.filterRow}>
          {roleChips.map((chip) => {
            const isActive = roleFilter === chip.value;
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
                onPress={() => setRoleFilter(chip.value)}
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

        {/* Status Filter Row */}
        <View style={styles.statusRow}>
          {statusChips.map((chip) => {
            const isActive = statusFilter === chip.value;
            return (
              <TouchableOpacity
                key={chip.value}
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: isActive
                      ? colors.primary + "15"
                      : colors.surfaceSecondary,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setStatusFilter(chip.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={chip.icon}
                  size={12}
                  color={isActive ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.statusChipText,
                    { color: isActive ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading && users.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={sortedUsers}
            renderItem={renderUser}
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
                  name="people-outline"
                  size={48}
                  color={colors.textMuted}
                />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {hasFilters ? "No matching users" : "No users found"}
                </Text>
                {!hasFilters && (
                  <Text
                    style={[styles.emptySubtext, { color: colors.textMuted }]}
                  >
                    Tap + to create your first user
                  </Text>
                )}
              </View>
            }
          />
        )}

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(app)/profile/user-create")}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={22} color="#FFF" />
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
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
  statusRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  name: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  email: { fontSize: FontSize.xs, marginTop: 2 },
  badges: { gap: 4 },
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

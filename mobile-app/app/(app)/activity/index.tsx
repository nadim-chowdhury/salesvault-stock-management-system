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
import DateRangePicker from "../../../src/components/ui/DateRangePicker";
import PageHeader from "../../../src/components/ui/PageHeader";

type ActionFilter = "ALL" | "LOGIN" | "SALE" | "STOCK" | "PRODUCT" | "USER";

export default function ActivityLogScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { isAuthenticated } = useAuthStore();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("ALL");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  const fetchLogs = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      if (!isAuthenticated) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        setLogs([]);
        return;
      }
      try {
        const params: any = { page: pageNum, limit: 30 };
        if (dateFrom) params.from = dateFrom;
        if (dateTo) params.to = dateTo;
        if (actionFilter !== "ALL") {
          // The backend expects action_type enum values like SALE_CREATE, STOCK_ADD, etc.
          // We pass partial match — the backend should filter accordingly
          params.entity_type =
            actionFilter === "LOGIN"
              ? undefined
              : actionFilter.charAt(0) + actionFilter.slice(1).toLowerCase();
          if (actionFilter === "LOGIN") {
            params.action_type = "LOGIN";
          }
        }

        const response = await api.get(Endpoints.ACTIVITY_LOGS, { params });
        const result = response.data?.data || response.data;
        const items =
          result?.data ||
          result?.items ||
          (Array.isArray(result) ? result : []);

        if (isRefresh || pageNum === 1) {
          setLogs(items);
        } else {
          setLogs((prev) => [...prev, ...items]);
        }
        setHasMore(items.length >= 30);
      } catch (err) {
        console.error("Activity fetch error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [isAuthenticated, dateFrom, dateTo, actionFilter],
  );

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchLogs(1, true);
  }, [fetchLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchLogs(1, true);
  };

  const loadMore = () => {
    if (!hasMore || loading || loadingMore) return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    fetchLogs(next);
  };

  const actionChips: {
    label: string;
    value: ActionFilter;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { label: "All", value: "ALL", icon: "list-outline" },
    { label: "Login", value: "LOGIN", icon: "log-in-outline" },
    { label: "Sales", value: "SALE", icon: "receipt-outline" },
    { label: "Stock", value: "STOCK", icon: "cube-outline" },
    { label: "Product", value: "PRODUCT", icon: "pricetag-outline" },
    { label: "User", value: "USER", icon: "person-outline" },
  ];

  const getActionIcon = (action: string): keyof typeof Ionicons.glyphMap => {
    if (action?.includes("LOGIN")) return "log-in-outline";
    if (action?.includes("LOGOUT")) return "log-out-outline";
    if (action?.includes("SALE")) return "receipt-outline";
    if (action?.includes("STOCK")) return "cube-outline";
    if (action?.includes("PRODUCT")) return "pricetag-outline";
    if (action?.includes("USER")) return "person-outline";
    return "document-outline";
  };

  const getActionColor = (action: string): string => {
    if (action?.includes("LOGIN") || action?.includes("LOGOUT"))
      return colors.info || colors.primary;
    if (action?.includes("SALE")) return colors.success;
    if (action?.includes("CANCEL") || action?.includes("DELETE"))
      return colors.danger;
    return colors.primary;
  };

  // Client-side search filter
  const filteredLogs = logs.filter((item) => {
    if (!debouncedSearch.trim()) return true;
    const q = debouncedSearch.toLowerCase();
    const action = (item.action_type || "").toLowerCase();
    const entity = (item.entity_type || "").toLowerCase();
    const userName = (item.user?.name || "").toLowerCase();
    return action.includes(q) || entity.includes(q) || userName.includes(q);
  });

  const renderLog = ({ item }: { item: any }) => {
    const actionColor = getActionColor(item.action_type);
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
            style={[styles.iconCircle, { backgroundColor: actionColor + "15" }]}
          >
            <Ionicons
              name={getActionIcon(item.action_type)}
              size={16}
              color={actionColor}
            />
          </View>
          <View style={styles.logContent}>
            <Text style={[styles.action, { color: colors.text }]}>
              {item.action_type
                ?.replace(/_/g, " ")
                .toLowerCase()
                .replace(/^\w/, (c: string) => c.toUpperCase())}
            </Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {item.entity_type} ·{" "}
              {new Date(item.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}{" "}
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {item.user?.name && (
              <Text style={[styles.userName, { color: colors.textMuted }]}>
                by {item.user.name}
              </Text>
            )}
            {item.ip_address && (
              <Text style={[styles.ip, { color: colors.textMuted }]}>
                IP: {item.ip_address}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const hasFilters =
    actionFilter !== "ALL" || dateFrom || dateTo || search.length > 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surface }]}
      edges={["top"]}
    >
      <PageHeader title="Activity" />

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
          placeholder="Search activity..."
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

      {/* Action Type Filter */}
      <View style={styles.filterRow}>
        {actionChips.map((chip) => {
          const isActive = actionFilter === chip.value;
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
              onPress={() => setActionFilter(chip.value)}
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
      </View>

      {/* Date Range Filter */}
      <DateRangePicker
        fromDate={dateFrom}
        toDate={dateTo}
        onApply={(from, to) => {
          setDateFrom(from);
          setDateTo(to);
        }}
      />

      {loading && logs.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          renderItem={renderLog}
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
                name="time-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {hasFilters ? "No matching activity" : "No activity yet"}
              </Text>
            </View>
          }
        />
      )}
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
  row: { flexDirection: "row", alignItems: "flex-start" },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  logContent: { flex: 1 },
  action: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  meta: { fontSize: FontSize.xs, marginTop: 2 },
  userName: { fontSize: FontSize.xs, marginTop: 2 },
  ip: { fontSize: FontSize.xs, marginTop: 2 },
  empty: { alignItems: "center", paddingTop: Spacing["5xl"] },
  emptyText: { fontSize: FontSize.md, marginTop: Spacing.md },
});

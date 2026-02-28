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
} from "react-native";
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

type TabType = "warehouse" | "assignments";

export default function StockScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();

  const [tab, setTab] = useState<TabType>("warehouse");
  const [stocks, setStocks] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWarehouseStock = useCallback(async () => {
    try {
      const response = await api.get(Endpoints.STOCK, {
        params: { page: 1, limit: 50 },
      });
      const result = response.data?.data || response.data;
      setStocks(
        result?.data || result?.items || (Array.isArray(result) ? result : []),
      );
    } catch (err) {
      console.error("Stock fetch error:", err);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const response = await api.get(Endpoints.STOCK_ASSIGNMENTS, {
        params: { page: 1, limit: 50 },
      });
      const result = response.data?.data || response.data;
      setAssignments(
        result?.data || result?.items || (Array.isArray(result) ? result : []),
      );
    } catch (err) {
      console.error("Assignments fetch error:", err);
    }
  }, []);

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

  const tabs: {
    key: TabType;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { key: "warehouse", label: "Warehouse Stock", icon: "cube-outline" },
    { key: "assignments", label: "Assignments", icon: "people-outline" },
  ];

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

  const data = tab === "warehouse" ? stocks : assignments;
  const renderItem = tab === "warehouse" ? renderStockItem : renderAssignment;
  const emptyIcon = tab === "warehouse" ? "cube-outline" : "people-outline";
  const emptyText =
    tab === "warehouse" ? "No stock in warehouses" : "No assignments yet";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <View
        style={[
          styles.tabBar,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
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
              onPress={() => setTab(t.key)}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  countRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  count: {
    fontSize: FontSize.xs,
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
});

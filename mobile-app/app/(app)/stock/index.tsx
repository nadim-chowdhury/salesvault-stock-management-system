import React, { useEffect, useState, useCallback } from "react";
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
import { useRouter } from "expo-router";
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

export default function StockScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStock = useCallback(async () => {
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);
  const onRefresh = () => {
    setRefreshing(true);
    fetchStock();
  };

  const renderStock = ({ item }: { item: any }) => {
    const isLow = item.quantity < 10;
    return (
      <View
        style={[
          styles.card,
          Shadow.sm,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>
              {item.product?.name || "Product"}
            </Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {item.warehouse?.name || "Warehouse"}
            </Text>
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={stocks}
          renderItem={renderStock}
          keyExtractor={(item) => item.id}
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
                name="layers-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No stock data
              </Text>
            </View>
          }
        />
      )}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push("/(app)/stock/assign")}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-forward" size={22} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: Spacing.lg, paddingBottom: 100 },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  meta: { fontSize: FontSize.xs, marginTop: 2 },
  qtyCol: { alignItems: "flex-end", gap: 4 },
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
});

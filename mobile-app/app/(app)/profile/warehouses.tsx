import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
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

export default function WarehousesScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await api.get(Endpoints.WAREHOUSES, {
        params: { page: 1, limit: 50 },
      });
      const result = response.data?.data || response.data;
      setWarehouses(
        result?.data || result?.items || (Array.isArray(result) ? result : []),
      );
    } catch (err) {
      console.error("Warehouses fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);
  const onRefresh = () => {
    setRefreshing(true);
    fetchWarehouses();
  };

  const renderWarehouse = ({ item }: { item: any }) => (
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
          <Ionicons name="business-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          {item.location && (
            <Text style={[styles.location, { color: colors.textMuted }]}>
              {item.location}
            </Text>
          )}
        </View>
        <Badge
          text={item.is_active ? "Active" : "Inactive"}
          variant={item.is_active ? "success" : "danger"}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={warehouses}
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
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="business-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No warehouses
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: Spacing.lg },
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
  location: { fontSize: FontSize.xs, marginTop: 2 },
  empty: { alignItems: "center", paddingTop: Spacing["5xl"] },
  emptyText: { fontSize: FontSize.md, marginTop: Spacing.md },
});

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

export default function SalesListScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSales = useCallback(async () => {
    try {
      const endpoint = isAdmin ? Endpoints.SALES : Endpoints.MY_SALES;
      const response = await api.get(endpoint, {
        params: { page: 1, limit: 50 },
      });
      const result = response.data?.data || response.data;
      setSales(
        result?.data || result?.items || (Array.isArray(result) ? result : []),
      );
    } catch (err) {
      console.error("Sales fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);
  const onRefresh = () => {
    setRefreshing(true);
    fetchSales();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return "success";
      case "CANCELLED":
        return "danger";
      default:
        return "warning";
    }
  };

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
          <Text style={[styles.amount, { color: colors.text }]}>
            ৳{Number(item.total_amount || 0).toLocaleString()}
          </Text>
          <Badge
            text={item.payment_status}
            variant={getStatusBadge(item.payment_status)}
          />
        </View>
        {item.customer_name && (
          <Text style={[styles.customer, { color: colors.textSecondary }]}>
            {item.customer_name}
          </Text>
        )}
        <Text style={[styles.date, { color: colors.textMuted }]}>
          {new Date(item.created_at).toLocaleDateString()} ·{" "}
          {new Date(item.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={sales}
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
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="receipt-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No sales yet
              </Text>
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
    marginBottom: Spacing.md,
  },
  cardContent: { padding: Spacing.lg },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  amount: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  customer: { fontSize: FontSize.sm, marginBottom: Spacing.xs },
  date: { fontSize: FontSize.xs },
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

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";

import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "../../src/stores/auth-store";
import { useThemeStore } from "../../src/stores/theme-store";
import api from "../../src/services/api";
import { Endpoints } from "../../src/constants/api";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadow,
} from "../../src/constants/theme";
import Card from "../../src/components/ui/Card";
import StatCard from "../../src/components/ui/StatCard";
import Badge from "../../src/components/ui/Badge";
import PageHeader from "../../src/components/ui/PageHeader";

export default function DashboardScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { user, isAuthenticated } = useAuthStore();
  const { themeMode, setThemeMode } = useThemeStore();
  const router = useRouter();
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  const toggleTheme = () => {
    const nextMode = scheme === "light" ? "dark" : "light";
    setThemeMode(nextMode);
  };

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const endpoint = isAdmin
        ? Endpoints.DASHBOARD_ADMIN
        : Endpoints.DASHBOARD_SALESPERSON;
      const response = await api.get(endpoint);
      setData(response.data?.data || response.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, isAuthenticated]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.primary }]}
        edges={["top"]}
      >
        <PageHeader title="Dashboard" />
        <View
          style={[styles.center, { backgroundColor: colors.surface, flex: 1 }]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader
        title="Dashboard"
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
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Greeting */}
          <View style={styles.greeting}>
            <Text style={[styles.greetingText, { color: colors.textMuted }]}>
              {getGreeting()},
            </Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.name || "User"}
            </Text>
            <Badge text={user?.role || "USER"} variant="info" />
          </View>

          {isAdmin ? (
            <AdminDashboard data={data} colors={colors} router={router} />
          ) : (
            <SalespersonDashboard data={data} colors={colors} router={router} />
          )}

          {/* Recent Activity */}
          {data?.recent_activity && data.recent_activity.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Recent Activity
              </Text>
              {data.recent_activity.slice(0, 10).map((log: any, i: number) => (
                <Card key={log.id || i} style={styles.activityItem}>
                  <View style={styles.activityRow}>
                    <View
                      style={[
                        styles.activityDot,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                    <View style={styles.activityContent}>
                      <Text
                        style={[styles.activityAction, { color: colors.text }]}
                      >
                        {formatActionType(log.action_type)}
                      </Text>
                      <Text
                        style={[
                          styles.activityMeta,
                          { color: colors.textMuted },
                        ]}
                      >
                        {log.entity_type} · {formatTimeAgo(log.created_at)}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function formatCurrency(amount: number) {
  return amount >= 1000 ? `৳${(amount / 1000).toFixed(1)}k` : `৳${amount}`;
}

function AdminDashboard({
  data,
  colors,
  router,
}: {
  data: any;
  colors: any;
  router: any;
}) {
  const salesToday = data?.sales_today;
  const monthlySales = data?.monthly_sales;
  const lowStockCount = data?.low_stock_alerts?.length ?? 0;

  return (
    <>
      <View style={styles.statsRow}>
        <StatCard
          title="Sales Today"
          value={salesToday?.count ?? 0}
          icon="trending-up"
          color={colors.success}
          subtitle={formatCurrency(salesToday?.total_amount ?? 0)}
        />
        <View style={{ width: 12 }} />
        <StatCard
          title="Monthly"
          value={monthlySales?.count ?? 0}
          icon="calendar"
          color={colors.primary}
          subtitle={formatCurrency(monthlySales?.total_amount ?? 0)}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          title="Low Stock"
          value={lowStockCount}
          icon="alert-circle"
          color={lowStockCount > 0 ? colors.danger : colors.success}
        />
        <View style={{ width: 12 }} />
        <StatCard
          title="Top Sellers"
          value={data?.top_salespersons?.length ?? 0}
          icon="people"
          color={colors.info}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Quick Actions
        </Text>
        {/* <DashMenuItem
          icon="business-outline"
          label="Warehouses"
          onPress={() => router.push("/(app)/warehouses/" as any)}
          colors={colors}
        /> */}
        <DashMenuItem
          icon="bar-chart-outline"
          label="Daily Sales Report"
          onPress={() => router.push("/(app)/sales/daily-sales")}
          colors={colors}
        />
        <DashMenuItem
          icon="layers-outline"
          label="Stock Management"
          onPress={() => router.push("/(app)/profile/stock")}
          colors={colors}
        />
        <DashMenuItem
          icon="people-circle-outline"
          label="Warehouse Users"
          onPress={() => router.push("/(app)/profile/warehouse-users")}
          colors={colors}
        />
        <DashMenuItem
          icon="checkmark-done-outline"
          label="Sale Approvals"
          onPress={() => router.push("/(app)/sales/sales-approvals")}
          colors={colors}
        />
        <DashMenuItem
          icon="storefront-outline"
          label="Stores"
          onPress={() => router.push("/(app)/stores/" as any)}
          colors={colors}
        />

        <DashMenuItem
          icon="trophy-outline"
          label="Sales Targets"
          onPress={() => router.push("/(app)/sales/sales-targets")}
          colors={colors}
        />
      </View>

      {data?.top_salespersons && data.top_salespersons.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Top Salespersons
          </Text>
          {data.top_salespersons.map((sp: any, i: number) => (
            <Card key={i} style={styles.topItem}>
              <View style={styles.topRow}>
                <View
                  style={[
                    styles.rank,
                    {
                      backgroundColor:
                        i < 3 ? colors.primary + "15" : colors.surfaceSecondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.rankText,
                      { color: i < 3 ? colors.primary : colors.textMuted },
                    ]}
                  >
                    #{i + 1}
                  </Text>
                </View>
                <View style={styles.topInfo}>
                  <Text style={[styles.topName, { color: colors.text }]}>
                    {sp.name}
                  </Text>
                  <Text style={[styles.topValue, { color: colors.textMuted }]}>
                    {sp.sales_count} sales ·{" "}
                    {formatCurrency(Number(sp.total_sales ?? 0))}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </>
  );
}

function SalespersonDashboard({
  data,
  colors,
  router,
}: {
  data: any;
  colors: any;
  router: any;
}) {
  const mySalesToday = data?.my_sales_today;
  const myStock = data?.my_stock;

  return (
    <>
      <View style={styles.statsRow}>
        <StatCard
          title="My Sales Today"
          value={mySalesToday?.count ?? 0}
          icon="cart"
          color={colors.success}
          subtitle={formatCurrency(mySalesToday?.total_amount ?? 0)}
        />
        <View style={{ width: 12 }} />
        <StatCard
          title="My Stock"
          value={myStock?.total_remaining ?? 0}
          icon="cube"
          color={colors.primary}
          subtitle={`${myStock?.total_assigned ?? 0} assigned`}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Quick Actions
        </Text>
        <DashMenuItem
          icon="bar-chart-outline"
          label="Daily Sales Report"
          onPress={() => router.push("/(app)/sales/daily-sales")}
          colors={colors}
        />
        <DashMenuItem
          icon="trophy-outline"
          label="Sales Targets"
          onPress={() => router.push("/(app)/sales/sales-targets")}
          colors={colors}
        />
      </View>
    </>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatActionType(action: string) {
  return (
    action
      ?.replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c: string) => c.toUpperCase()) || ""
  );
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function DashMenuItem({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        Shadow.sm,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContent: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: Spacing.lg, paddingBottom: Spacing["5xl"] },
  greeting: { marginBottom: Spacing["2xl"] },
  greetingText: { fontSize: FontSize.md },
  userName: {
    fontSize: FontSize["2xl"],
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  statsRow: { flexDirection: "row", marginBottom: Spacing.md },
  section: { marginTop: Spacing["2xl"] },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.md,
  },
  activityItem: { marginBottom: Spacing.sm },
  activityRow: { flexDirection: "row", alignItems: "center" },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.md,
  },
  activityContent: { flex: 1 },
  activityAction: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  activityMeta: { fontSize: FontSize.xs, marginTop: 2 },
  topItem: { marginBottom: Spacing.sm },
  topRow: { flexDirection: "row", alignItems: "center" },
  rank: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  rankText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  topInfo: { flex: 1 },
  topName: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  topValue: { fontSize: FontSize.xs, marginTop: 2 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  menuLabel: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

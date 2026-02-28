import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/stores/auth-store";
import api from "../../src/services/api";
import { Endpoints } from "../../src/constants/api";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from "../../src/constants/theme";
import Card from "../../src/components/ui/Card";
import StatCard from "../../src/components/ui/StatCard";
import Badge from "../../src/components/ui/Badge";

export default function DashboardScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { user, isAuthenticated } = useAuthStore();
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
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
        <AdminDashboard data={data} colors={colors} />
      ) : (
        <SalespersonDashboard data={data} colors={colors} />
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
                  <Text style={[styles.activityAction, { color: colors.text }]}>
                    {formatActionType(log.action_type)}
                  </Text>
                  <Text
                    style={[styles.activityMeta, { color: colors.textMuted }]}
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
  );
}

function AdminDashboard({ data, colors }: { data: any; colors: any }) {
  return (
    <>
      <View style={styles.statsRow}>
        <StatCard
          title="Sales Today"
          value={data?.sales_today ?? 0}
          icon="trending-up"
          color={colors.success}
        />
        <View style={{ width: 12 }} />
        <StatCard
          title="Monthly"
          value={data?.monthly_sales ?? 0}
          icon="calendar"
          color={colors.primary}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          title="Low Stock"
          value={data?.low_stock_count ?? 0}
          icon="alert-circle"
          color={data?.low_stock_count > 0 ? colors.danger : colors.success}
        />
        <View style={{ width: 12 }} />
        <StatCard
          title="Products"
          value={data?.total_products ?? 0}
          icon="cube"
          color={colors.info}
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
                    {sp.total_sales} sales
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

function SalespersonDashboard({ data, colors }: { data: any; colors: any }) {
  return (
    <>
      <View style={styles.statsRow}>
        <StatCard
          title="My Sales Today"
          value={data?.my_sales_today ?? 0}
          icon="cart"
          color={colors.success}
        />
        <View style={{ width: 12 }} />
        <StatCard
          title="My Stock"
          value={data?.my_stock_count ?? 0}
          icon="cube"
          color={colors.primary}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
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
});

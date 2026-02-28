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

export default function ActivityLogScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await api.get(Endpoints.ACTIVITY_RECENT, {
        params: { limit: 50 },
      });
      const data = response.data?.data || response.data;
      setLogs(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      console.error("Activity fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);
  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const getActionIcon = (action: string): keyof typeof Ionicons.glyphMap => {
    if (action?.includes("LOGIN")) return "log-in-outline";
    if (action?.includes("LOGOUT")) return "log-out-outline";
    if (action?.includes("SALE")) return "receipt-outline";
    if (action?.includes("STOCK")) return "cube-outline";
    if (action?.includes("PRODUCT")) return "pricetag-outline";
    if (action?.includes("USER")) return "person-outline";
    return "document-outline";
  };

  const renderLog = ({ item }: { item: any }) => (
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
          <Ionicons
            name={getActionIcon(item.action_type)}
            size={16}
            color={colors.primary}
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
            {item.entity_type} · {new Date(item.created_at).toLocaleString()}
          </Text>
          {item.ip_address && (
            <Text style={[styles.ip, { color: colors.textMuted }]}>
              IP: {item.ip_address}
            </Text>
          )}
        </View>
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
          data={logs}
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
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="time-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No activity yet
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
  list: { padding: Spacing.lg, paddingBottom: Spacing["5xl"] },
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
  ip: { fontSize: FontSize.xs, marginTop: 2 },
  empty: { alignItems: "center", paddingTop: Spacing["5xl"] },
  emptyText: { fontSize: FontSize.md, marginTop: Spacing.md },
});

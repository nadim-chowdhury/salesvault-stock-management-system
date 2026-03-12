import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
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
import Button from "../../../src/components/ui/Button";
import PageHeader from "@/src/components/ui/PageHeader";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SaleDetailScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { id } = useLocalSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const { setThemeMode } = useThemeStore();
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  const toggleTheme = () => {
    const nextMode = scheme === "light" ? "dark" : "light";
    setThemeMode(nextMode);
  };

  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchSale = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setRefreshing(false);
      setSale(null);
      return;
    }
    try {
      const res = await api.get(`${Endpoints.SALES}/${id}`);
      setSale(res.data?.data || res.data);
    } catch (err) {
      console.error("Sale fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, id]);

  useFocusEffect(
    useCallback(() => {
      fetchSale();
    }, [fetchSale]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSale();
  };

  const handleCancelSale = () => {
    Alert.alert(
      "Cancel Sale",
      "Are you sure you want to cancel this sale? Stock will be restored to the salesperson's assignments.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel Sale",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await api.post(`${Endpoints.SALES}/${id}/cancel`);
              setSale({ ...sale, payment_status: "CANCELLED" });
              Alert.alert(
                "Success",
                "Sale has been cancelled. Stock restored.",
              );
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to cancel sale",
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteSale = () => {
    Alert.alert(
      "Delete Sale",
      "Are you sure you want to permanently delete this sale? This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete(`${Endpoints.SALES}/${id}`);
              Alert.alert("Success", "Sale has been deleted.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to delete sale",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (loading)
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  if (!sale)
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={[styles.errorText, { color: colors.textMuted }]}>
          Sale not found
        </Text>
      </View>
    );

  const statusVariant =
    sale.payment_status === "PAID"
      ? "success"
      : sale.payment_status === "CANCELLED"
        ? "danger"
        : "warning";

  const itemCount = sale.items?.length || 0;
  const canCancel = isAdmin && sale.payment_status !== "CANCELLED";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader
        title="Sale Details"
        showBack
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
        >
          {/* Hero */}
          <View
            style={[
              styles.heroCard,
              Shadow.sm,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons name="receipt" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.amount, { color: colors.text }]}>
              ৳{Number(sale.total_amount || 0).toLocaleString()}
            </Text>
            <Badge text={sale.payment_status} variant={statusVariant} />
            <Text style={[styles.dateText, { color: colors.textMuted }]}>
              {new Date(sale.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              at{" "}
              {new Date(sale.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>

          {/* Customer Info */}
          <View
            style={[
              styles.infoCard,
              Shadow.sm,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Customer
              </Text>
            </View>

            <InfoRow
              icon="person-outline"
              label="Name"
              value={sale.customer_name || "Walk-in customer"}
              colors={colors}
            />
            {sale.customer_phone && (
              <InfoRow
                icon="call-outline"
                label="Phone"
                value={sale.customer_phone}
                colors={colors}
              />
            )}
            {sale.notes && (
              <InfoRow
                icon="document-text-outline"
                label="Notes"
                value={sale.notes}
                colors={colors}
              />
            )}
          </View>

          {/* Salesperson Info */}
          {sale.salesperson && (
            <View
              style={[
                styles.infoCard,
                Shadow.sm,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <Ionicons name="briefcase" size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Salesperson
                </Text>
              </View>
              <InfoRow
                icon="person-circle-outline"
                label="Name"
                value={sale.salesperson.name || "—"}
                colors={colors}
              />
              {sale.salesperson.email && (
                <InfoRow
                  icon="mail-outline"
                  label="Email"
                  value={sale.salesperson.email}
                  colors={colors}
                />
              )}
            </View>
          )}

          {/* Line Items */}
          {sale.items && sale.items.length > 0 && (
            <View
              style={[
                styles.infoCard,
                Shadow.sm,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <Ionicons name="cube" size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Items ({itemCount})
                </Text>
              </View>

              {sale.items.map((item: any, i: number) => (
                <View
                  key={i}
                  style={[
                    styles.itemRow,
                    i < sale.items.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderLight,
                    },
                  ]}
                >
                  <View style={styles.itemInfo}>
                    <Text
                      style={[styles.itemName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.product?.name || "Product"}
                    </Text>
                    <Text
                      style={[styles.itemMeta, { color: colors.textMuted }]}
                    >
                      Qty: {item.quantity} × ৳
                      {Number(
                        item.price || item.unit_price || 0,
                      ).toLocaleString()}
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: colors.primary }]}>
                    ৳
                    {(
                      item.quantity * Number(item.price || item.unit_price || 0)
                    ).toLocaleString()}
                  </Text>
                </View>
              ))}

              {/* Total */}
              <View
                style={[styles.totalRow, { borderTopColor: colors.border }]}
              >
                <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
                  Total
                </Text>
                <Text style={[styles.totalValue, { color: colors.text }]}>
                  ৳{Number(sale.total_amount || 0).toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          {/* Actions */}
          {(canCancel || isAdmin) && (
            <View style={styles.actionsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="settings-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Actions
                </Text>
              </View>

              {canCancel && (
                <View style={{ marginBottom: isAdmin ? Spacing.lg : 0 }}>
                  <Button
                    title="Cancel Sale"
                    onPress={handleCancelSale}
                    variant="secondary"
                    loading={cancelling}
                  />
                  <Text style={[styles.cancelHint, { color: colors.textMuted }]}>
                    Cancelling will restore stock to the salesperson&apos;s
                    assignments
                  </Text>
                </View>
              )}

              {isAdmin && (
                <Button
                  title="Delete Sale"
                  onPress={handleDeleteSale}
                  variant="danger"
                  loading={deleting}
                  icon={
                    <Ionicons name="trash-outline" size={18} color="#FFF" />
                  }
                />
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text
        style={[styles.infoValue, { color: colors.text }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContent: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: FontSize.md, marginTop: Spacing.md },
  content: { padding: Spacing.lg, paddingBottom: Spacing["5xl"] },
  heroCard: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  amount: {
    fontSize: FontSize["3xl"],
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  dateText: {
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
  },
  infoCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  infoLabel: { fontSize: FontSize.sm, flex: 1 },
  infoValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    flex: 1,
    textAlign: "right",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  itemMeta: { fontSize: FontSize.xs, marginTop: 2 },
  itemTotal: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.medium },
  totalValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  actionsSection: { marginTop: Spacing.sm },
  cancelHint: {
    fontSize: FontSize.xs,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
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
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from "@/src/components/ui/PageHeader";

export default function ProductDetailScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const { setThemeMode } = useThemeStore();
  const isAdmin = user?.role === "ADMIN";
  const canEdit = isAdmin || user?.role === "MANAGER";

  const toggleTheme = () => {
    const nextMode = scheme === "light" ? "dark" : "light";
    setThemeMode(nextMode);
  };

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const fetchProduct = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setRefreshing(false);
      setProduct(null);
      return;
    }
    try {
      const response = await api.get(`${Endpoints.PRODUCTS}/${id}`);
      setProduct(response.data?.data || response.data);
    } catch (err) {
      console.error("Product fetch error:", err);
      Alert.alert("Error", "Failed to load product");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, id]);

  useFocusEffect(
    useCallback(() => {
      fetchProduct();
    }, [fetchProduct]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProduct();
  };

  const handleToggleActive = () => {
    const action = product.is_active ? "deactivate" : "activate";
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Product`,
      `Are you sure you want to ${action} "${product.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: product.is_active ? "destructive" : "default",
          onPress: async () => {
            setActionLoading("toggle");
            try {
              await api.patch(`${Endpoints.PRODUCTS}/${id}`, {
                is_active: !product.is_active,
              });
              setProduct({ ...product, is_active: !product.is_active });
              Alert.alert("Success", `Product ${action}d`);
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || `Failed to ${action} product`,
              );
            } finally {
              setActionLoading("");
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Product",
      `This will permanently deactivate "${product.name}". Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setActionLoading("delete");
            try {
              await api.delete(`${Endpoints.PRODUCTS}/${id}/permanent`);
              Alert.alert("Success", "Product deleted", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to delete product",
              );
            } finally {
              setActionLoading("");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={[styles.errorText, { color: colors.textMuted }]}>
          Product not found
        </Text>
      </View>
    );
  }

  const sellingPrice = Number(product.price || 0);
  const costPrice = Number(product.cost_price || 0);
  const margin = sellingPrice - costPrice;
  const marginPercent =
    costPrice > 0 ? ((margin / costPrice) * 100).toFixed(1) : "—";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader
        title="Product Details"
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

      <View style={[styles.mainContent, { backgroundColor: colors.surface }]}>
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
        {/* Product Hero Card */}
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
            <Ionicons name="cube" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.name, { color: colors.text }]}>
            {product.name}
          </Text>
          <Text style={[styles.sku, { color: colors.textMuted }]}>
            SKU: {product.sku}
          </Text>
          <Badge
            text={product.is_active ? "Active" : "Inactive"}
            variant={product.is_active ? "success" : "danger"}
          />
          {product.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {product.description}
            </Text>
          )}
        </View>

        {/* Pricing Card */}
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
            <Ionicons name="pricetag" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Pricing
            </Text>
          </View>

          <View style={styles.pricingGrid}>
            <View style={styles.pricingItem}>
              <Text style={[styles.pricingLabel, { color: colors.textMuted }]}>
                Selling Price
              </Text>
              <Text style={[styles.pricingValue, { color: colors.primary }]}>
                ৳{sellingPrice.toLocaleString()}
              </Text>
            </View>
            <View style={styles.pricingItem}>
              <Text style={[styles.pricingLabel, { color: colors.textMuted }]}>
                Cost Price
              </Text>
              <Text
                style={[styles.pricingValue, { color: colors.textSecondary }]}
              >
                ৳{costPrice.toLocaleString()}
              </Text>
            </View>
            <View style={styles.pricingItem}>
              <Text style={[styles.pricingLabel, { color: colors.textMuted }]}>
                Margin
              </Text>
              <Text
                style={[
                  styles.pricingValue,
                  { color: margin >= 0 ? colors.success : colors.danger },
                ]}
              >
                ৳{margin.toLocaleString()}
              </Text>
            </View>
            <View style={styles.pricingItem}>
              <Text style={[styles.pricingLabel, { color: colors.textMuted }]}>
                Margin %
              </Text>
              <Text
                style={[
                  styles.pricingValue,
                  { color: margin >= 0 ? colors.success : colors.danger },
                ]}
              >
                {marginPercent}%
              </Text>
            </View>
          </View>
        </View>

        {/* Details Card */}
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
            <Ionicons
              name="information-circle"
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Details
            </Text>
          </View>

          <InfoRow
            icon="calendar-outline"
            label="Created"
            value={new Date(product.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            colors={colors}
          />
          <InfoRow
            icon="time-outline"
            label="Last Updated"
            value={new Date(product.updated_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            colors={colors}
          />
          {product.created_by_user && (
            <InfoRow
              icon="person-outline"
              label="Created By"
              value={product.created_by_user.name || "—"}
              colors={colors}
            />
          )}
        </View>

        {/* Actions */}
        {canEdit && (
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

            <Button
              title="Edit Product"
              onPress={() =>
                router.push({
                  pathname: "/(app)/products/edit",
                  params: {
                    id: product.id,
                    name: product.name,
                    price: String(product.price),
                    cost_price: String(product.cost_price || ""),
                    description: product.description || "",
                  },
                })
              }
              variant="primary"
              icon={<Ionicons name="create-outline" size={18} color="#FFF" />}
              style={{ marginBottom: Spacing.sm }}
            />

            <Button
              title={
                product.is_active ? "Deactivate Product" : "Activate Product"
              }
              onPress={handleToggleActive}
              variant={product.is_active ? "secondary" : "primary"}
              loading={actionLoading === "toggle"}
              icon={
                <Ionicons
                  name={
                    product.is_active
                      ? "close-circle-outline"
                      : "checkmark-circle-outline"
                  }
                  size={18}
                  color={product.is_active ? colors.danger : "#FFF"}
                />
              }
              style={{ marginBottom: Spacing.sm }}
            />

            {isAdmin && (
              <Button
                title="Delete Product"
                onPress={handleDelete}
                variant="danger"
                loading={actionLoading === "delete"}
                icon={<Ionicons name="trash-outline" size={18} color="#FFF" />}
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
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContent: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing["5xl"] },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: FontSize.md, marginTop: Spacing.md },
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
  name: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  sku: { fontSize: FontSize.sm, marginBottom: Spacing.md },
  description: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.md,
    textAlign: "center",
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
  pricingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  pricingItem: {
    width: "45%",
    gap: 4,
  },
  pricingLabel: {
    fontSize: FontSize.xs,
  },
  pricingValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  infoLabel: { fontSize: FontSize.sm, flex: 1 },
  infoValue: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  actionsSection: { marginTop: Spacing.sm },
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

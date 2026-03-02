import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../src/services/api";
import { Endpoints } from "../../../src/constants/api";
import { useThemeStore } from "../../../src/stores/theme-store";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadow,
} from "../../../src/constants/theme";
import Button from "../../../src/components/ui/Button";
import Input from "../../../src/components/ui/Input";
import PageHeader from "@/src/components/ui/PageHeader";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AddStockScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { setThemeMode } = useThemeStore();

  const toggleTheme = () => {
    const nextMode = scheme === "light" ? "dark" : "light";
    setThemeMode(nextMode);
  };

  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showProducts, setShowProducts] = useState(false);
  const [showWarehouses, setShowWarehouses] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, whRes] = await Promise.all([
          api.get(Endpoints.PRODUCTS, {
            params: { limit: 100, is_active: "true" },
          }),
          api.get(Endpoints.WAREHOUSES, { params: { limit: 100 } }),
        ]);
        const prodResult = prodRes.data?.data || prodRes.data;
        setProducts(
          prodResult?.data ||
            prodResult?.items ||
            (Array.isArray(prodResult) ? prodResult : []),
        );
        const whResult = whRes.data?.data || whRes.data;
        setWarehouses(
          (
            whResult?.data ||
            whResult?.items ||
            (Array.isArray(whResult) ? whResult : [])
          ).filter((w: any) => w.is_active !== false),
        );
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (!selectedProduct || !selectedWarehouse || !quantity.trim()) {
      Alert.alert(
        "Validation",
        "Please select product, warehouse, and enter quantity",
      );
      return;
    }
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert("Validation", "Quantity must be a positive number");
      return;
    }
    setLoading(true);
    try {
      await api.post(Endpoints.STOCK_ADD, {
        product_id: selectedProduct.id,
        warehouse_id: selectedWarehouse.id,
        quantity: qty,
      });
      Alert.alert(
        "Success",
        `Added ${qty} units of ${selectedProduct.name} to ${selectedWarehouse.name}`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to add stock",
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader
        title="Add Stock"
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons
                name="add-circle-outline"
                size={28}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Add Stock
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Add inventory to a warehouse
            </Text>
          </View>

          {/* Product Picker */}
          <View style={styles.sectionWrapper}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Product *
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.picker,
                Shadow.sm,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedProduct
                    ? colors.primary
                    : colors.borderLight,
                },
              ]}
              onPress={() => {
                setShowProducts(!showProducts);
                setShowWarehouses(false);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pickerText,
                  { color: selectedProduct ? colors.text : colors.textMuted },
                ]}
              >
                {selectedProduct ? selectedProduct.name : "Select a product"}
              </Text>
              <Ionicons
                name={showProducts ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            {showProducts && (
              <View
                style={[
                  styles.dropdownList,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                {products.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.dropdownItem,
                      selectedProduct?.id === p.id && {
                        backgroundColor: colors.primary + "10",
                      },
                    ]}
                    onPress={() => {
                      setSelectedProduct(p);
                      setShowProducts(false);
                    }}
                  >
                    <Text style={[styles.dropdownText, { color: colors.text }]}>
                      {p.name}
                    </Text>
                    <View style={styles.dropdownMetaRow}>
                      <Text
                        style={[
                          styles.dropdownMeta,
                          { color: colors.textMuted },
                        ]}
                      >
                        SKU: {p.sku || "—"}
                      </Text>
                      <Text
                        style={[
                          styles.dropdownStock,
                          {
                            color:
                              p.total_stock > 0
                                ? colors.success
                                : colors.danger,
                          },
                        ]}
                      >
                        Stock: {p.total_stock || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {products.length === 0 && (
                  <Text
                    style={[styles.dropdownEmpty, { color: colors.textMuted }]}
                  >
                    No products found
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Warehouse Picker */}
          <View style={styles.sectionWrapper}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Warehouse *
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.picker,
                Shadow.sm,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedWarehouse
                    ? colors.primary
                    : colors.borderLight,
                },
              ]}
              onPress={() => {
                setShowWarehouses(!showWarehouses);
                setShowProducts(false);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pickerText,
                  { color: selectedWarehouse ? colors.text : colors.textMuted },
                ]}
              >
                {selectedWarehouse
                  ? `${selectedWarehouse.name}${selectedWarehouse.location ? ` • ${selectedWarehouse.location}` : ""}`
                  : "Select a warehouse"}
              </Text>
              <Ionicons
                name={showWarehouses ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            {showWarehouses && (
              <View
                style={[
                  styles.dropdownList,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                {warehouses.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={[
                      styles.dropdownItem,
                      selectedWarehouse?.id === w.id && {
                        backgroundColor: colors.primary + "10",
                      },
                    ]}
                    onPress={() => {
                      setSelectedWarehouse(w);
                      setShowWarehouses(false);
                    }}
                  >
                    <Text style={[styles.dropdownText, { color: colors.text }]}>
                      {w.name}
                    </Text>
                    {w.location && (
                      <Text
                        style={[
                          styles.dropdownMeta,
                          { color: colors.textMuted },
                        ]}
                      >
                        {w.location}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
                {warehouses.length === 0 && (
                  <Text
                    style={[styles.dropdownEmpty, { color: colors.textMuted }]}
                  >
                    No warehouses found
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Quantity */}
          <View
            style={[
              styles.formCard,
              Shadow.sm,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Input
              label="Quantity *"
              placeholder="e.g. 100"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              leftIcon="layers-outline"
            />
          </View>

          {/* Preview */}
          {selectedProduct && selectedWarehouse && quantity.trim() && (
            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.previewTitle, { color: colors.textMuted }]}>
                Summary
              </Text>
              <Text style={[styles.previewLine, { color: colors.text }]}>
                Add{" "}
                <Text
                  style={{ fontWeight: FontWeight.bold, color: colors.primary }}
                >
                  {quantity}
                </Text>{" "}
                units of{" "}
                <Text style={{ fontWeight: FontWeight.bold }}>
                  {selectedProduct.name}
                </Text>
              </Text>
              <Text style={[styles.previewLine, { color: colors.text }]}>
                to{" "}
                <Text style={{ fontWeight: FontWeight.bold }}>
                  {selectedWarehouse.name}
                </Text>
              </Text>
            </View>
          )}

          <Button
            title="Add Stock"
            onPress={handleAdd}
            loading={loading}
            disabled={
              !selectedProduct || !selectedWarehouse || !quantity.trim()
            }
            size="lg"
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContent: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: Spacing.lg, paddingBottom: Spacing["5xl"] },
  headerSection: { alignItems: "center", marginBottom: Spacing["2xl"] },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize["2xl"],
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: { fontSize: FontSize.sm },
  sectionWrapper: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  pickerText: { fontSize: FontSize.md, flex: 1 },
  dropdownList: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    maxHeight: 200,
    overflow: "hidden",
  },
  dropdownItem: {
    padding: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  dropdownText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  dropdownMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  dropdownMeta: { fontSize: FontSize.xs },
  dropdownStock: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  dropdownEmpty: {
    padding: Spacing.lg,
    textAlign: "center",
    fontSize: FontSize.sm,
  },
  formCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  previewCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: Spacing.xl,
  },
  previewTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  previewLine: { fontSize: FontSize.sm, lineHeight: 22 },
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

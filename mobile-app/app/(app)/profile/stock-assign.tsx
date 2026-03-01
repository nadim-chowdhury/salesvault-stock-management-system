import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
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
import Button from "../../../src/components/ui/Button";
import Input from "../../../src/components/ui/Input";
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from "@/src/components/ui/PageHeader";

export default function AssignStockScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [salespersons, setSalespersons] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [selectedSalesperson, setSelectedSalesperson] = useState<any>(null);
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showProducts, setShowProducts] = useState(false);
  const [showWarehouses, setShowWarehouses] = useState(false);
  const [showSalespersons, setShowSalespersons] = useState(false);

  const closeAllDropdowns = () => {
    setShowProducts(false);
    setShowWarehouses(false);
    setShowSalespersons(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, whRes, usersRes] = await Promise.all([
          api.get(Endpoints.PRODUCTS, {
            params: { limit: 100, is_active: "true" },
          }),
          api.get(Endpoints.WAREHOUSES, { params: { limit: 100 } }),
          api.get(Endpoints.USERS, { params: { limit: 100 } }),
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
        const usersResult = usersRes.data?.data || usersRes.data;
        const allUsers =
          usersResult?.data ||
          usersResult?.items ||
          (Array.isArray(usersResult) ? usersResult : []);
        setSalespersons(
          allUsers.filter(
            (u: any) => u.role === "SALESPERSON" && u.is_active !== false,
          ),
        );
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, []);

  const handleAssign = async () => {
    if (
      !selectedProduct ||
      !selectedSalesperson ||
      !selectedWarehouse ||
      !quantity.trim()
    ) {
      Alert.alert("Validation", "All fields are required");
      return;
    }
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert("Validation", "Quantity must be a positive number");
      return;
    }
    setLoading(true);
    try {
      await api.post(Endpoints.STOCK_ASSIGN, {
        product_id: selectedProduct.id,
        salesperson_id: selectedSalesperson.id,
        warehouse_id: selectedWarehouse.id,
        quantity: qty,
      });
      Alert.alert(
        "Success",
        `Assigned ${qty} units of ${selectedProduct.name} to ${selectedSalesperson.name}`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to assign stock",
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

  const renderPicker = (
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    selected: any,
    displayText: string,
    placeholder: string,
    isOpen: boolean,
    onToggle: () => void,
    items: any[],
    onSelect: (item: any) => void,
    renderItemText: (item: any) => { primary: string; secondary?: string },
    emptyText: string,
  ) => (
    <View style={styles.sectionWrapper}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {label} *
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.picker,
          Shadow.sm,
          {
            backgroundColor: colors.surface,
            borderColor: selected ? colors.primary : colors.borderLight,
          },
        ]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.pickerText,
            { color: selected ? colors.text : colors.textMuted },
          ]}
        >
          {selected ? displayText : placeholder}
        </Text>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textMuted}
        />
      </TouchableOpacity>
      {isOpen && (
        <View
          style={[
            styles.dropdownList,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
            {items.map((item) => {
              const { primary, secondary } = renderItemText(item);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.dropdownItem,
                    selected?.id === item.id && {
                      backgroundColor: colors.primary + "10",
                    },
                  ]}
                  onPress={() => onSelect(item)}
                >
                  <Text style={[styles.dropdownText, { color: colors.text }]}>
                    {primary}
                  </Text>
                  {secondary && (
                    <Text
                      style={[styles.dropdownMeta, { color: colors.textMuted }]}
                    >
                      {secondary}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
            {items.length === 0 && (
              <Text style={[styles.dropdownEmpty, { color: colors.textMuted }]}>
                {emptyText}
              </Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surface }]}
      edges={["top"]}
    >
      <PageHeader title="Assign Stock" showBack />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.surface }]}
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
              name="arrow-forward-circle-outline"
              size={28}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Assign Stock
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Assign warehouse stock to a salesperson
          </Text>
        </View>

        {renderPicker(
          "Product",
          "cube",
          selectedProduct,
          selectedProduct?.name || "",
          "Select a product",
          showProducts,
          () => {
            closeAllDropdowns();
            setShowProducts(!showProducts);
          },
          products,
          (p) => {
            setSelectedProduct(p);
            setShowProducts(false);
          },
          (p) => ({ primary: p.name, secondary: `SKU: ${p.sku || "—"}` }),
          "No products found",
        )}

        {renderPicker(
          "Warehouse",
          "business",
          selectedWarehouse,
          selectedWarehouse
            ? `${selectedWarehouse.name}${selectedWarehouse.location ? ` • ${selectedWarehouse.location}` : ""}`
            : "",
          "Select a warehouse",
          showWarehouses,
          () => {
            closeAllDropdowns();
            setShowWarehouses(!showWarehouses);
          },
          warehouses,
          (w) => {
            setSelectedWarehouse(w);
            setShowWarehouses(false);
          },
          (w) => ({ primary: w.name, secondary: w.location || undefined }),
          "No warehouses found",
        )}

        {renderPicker(
          "Salesperson",
          "person",
          selectedSalesperson,
          selectedSalesperson
            ? `${selectedSalesperson.name} • ${selectedSalesperson.email}`
            : "",
          "Select a salesperson",
          showSalespersons,
          () => {
            closeAllDropdowns();
            setShowSalespersons(!showSalespersons);
          },
          salespersons,
          (s) => {
            setSelectedSalesperson(s);
            setShowSalespersons(false);
          },
          (s) => ({ primary: s.name, secondary: s.email }),
          "No salespersons found",
        )}

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
            placeholder="e.g. 50"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            leftIcon="layers-outline"
          />
        </View>

        {/* Preview */}
        {selectedProduct &&
          selectedSalesperson &&
          selectedWarehouse &&
          quantity.trim() && (
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
                Assign{" "}
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
                from{" "}
                <Text style={{ fontWeight: FontWeight.bold }}>
                  {selectedWarehouse.name}
                </Text>{" "}
                to{" "}
                <Text style={{ fontWeight: FontWeight.bold }}>
                  {selectedSalesperson.name}
                </Text>
              </Text>
            </View>
          )}

        <Button
          title="Assign Stock"
          onPress={handleAssign}
          loading={loading}
          disabled={
            !selectedProduct ||
            !selectedSalesperson ||
            !selectedWarehouse ||
            !quantity.trim()
          }
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    overflow: "hidden",
  },
  dropdownItem: {
    padding: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  dropdownText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  dropdownMeta: { fontSize: FontSize.xs, marginTop: 2 },
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
});

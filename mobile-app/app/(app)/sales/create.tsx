import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Alert,
  TextInput,
  FlatList,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
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
import Button from "../../../src/components/ui/Button";
import Input from "../../../src/components/ui/Input";
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from "@/src/components/ui/PageHeader";
import Badge from "../../../src/components/ui/Badge";

interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  available: number;
}

export default function CreateSaleScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { user } = useAuthStore();
  const { setThemeMode } = useThemeStore();
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  const toggleTheme = () => {
    const nextMode = scheme === "light" ? "dark" : "light";
    setThemeMode(nextMode);
  };

  const [myStock, setMyStock] = useState<any[]>([]);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Store Selection
  const [availableStores, setAvailableStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [storeSearch, setStoreSearch] = useState("");
  const [showStorePicker, setShowStorePicker] = useState(false);

  // Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [prodSearch, setProdSearch] = useState("");

  // Quantity Modal
  const [qtyModalVisible, setQtyModalVisible] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [manualQtyValue, setManualQtyValue] = useState("");

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get(Endpoints.PRODUCTS, {
        params: { limit: 100, is_active: "true" },
      });
      const result = res.data?.data || res.data;
      const products =
        result?.data || result?.items || (Array.isArray(result) ? result : []);
      const normalized = products.map((p: any) => ({
        product_id: p.id,
        product: { id: p.id, name: p.name, price: p.price },
        quantity: 0,
        quantity_remaining: 0,
      }));
      setMyStock(normalized);
    } catch (err) {
      console.error("Products fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAdminStock = useCallback(async () => {
    try {
      const res = await api.get(Endpoints.STOCK, {
        params: { page: 1, limit: 100 },
      });
      const result = res.data?.data || res.data;
      const stockItems =
        result?.data || result?.items || (Array.isArray(result) ? result : []);
      setMyStock(stockItems);
    } catch (err) {
      console.error("Admin stock fetch error:", err);
      await fetchProducts();
    } finally {
      setLoading(false);
    }
  }, [fetchProducts]);

  useEffect(() => {
    api
      .get(Endpoints.STORES, { params: { is_active: "true", limit: 100 } })
      .then((res) => {
        const result = res.data?.data || res.data;
        const stores =
          result?.data ||
          result?.items ||
          (Array.isArray(result) ? result : []);
        setAvailableStores(stores);
      })
      .catch((err) => console.error("Stores fetch error:", err));
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    if (isAdminOrManager) {
      fetchAdminStock();
    } else {
      api
        .get(Endpoints.MY_STOCK)
        .then((res) => {
          const data = res.data?.data || res.data;
          setMyStock(Array.isArray(data) ? data : data?.items || []);
          setLoading(false);
        })
        .catch((err) => {
          if (err?.response?.status === 403) {
            fetchProducts();
          } else {
            setLoading(false);
          }
        });
    }
  }, [user, isAdminOrManager, fetchProducts, fetchAdminStock]);

  const selectStore = (store: any | null) => {
    if (!store) {
      setSelectedStoreId(null);
      setCustomerName("");
      setCustomerPhone("");
      setShowStorePicker(false);
      return;
    }
    setSelectedStoreId(store.id);
    setCustomerName(store.name || "");
    setCustomerPhone(store.phone || "");
    setShowStorePicker(false);
  };

  const addItem = (stock: any) => {
    const pid = stock.product_id || stock.product?.id;
    if (items.find((i) => i.product_id === pid)) {
      Alert.alert("Already added", "This product is already in the sale");
      return;
    }
    setItems([
      ...items,
      {
        product_id: pid,
        product_name: stock.product?.name || stock.product_name || "Product",
        quantity: 1,
        price: Number(stock.product?.price || stock.price || 0),
        available: stock.quantity_remaining ?? stock.quantity ?? 999,
      },
    ]);
    setShowProductModal(false);
    setProdSearch("");
  };

  const updateQuantity = (index: number, qty: string) => {
    const updated = [...items];
    const parsed = parseInt(qty) || 1;
    updated[index].quantity = Math.max(
      1,
      Math.min(parsed, updated[index].available),
    );
    setItems(updated);
  };

  const openQtyModal = (index: number) => {
    setEditingItemIndex(index);
    setManualQtyValue(String(items[index].quantity));
    setQtyModalVisible(true);
  };

  const handleManualQtySave = () => {
    if (editingItemIndex === null) return;
    const parsed = parseInt(manualQtyValue);
    if (isNaN(parsed) || parsed < 1) {
      Alert.alert(
        "Invalid Quantity",
        "Please enter a valid number greater than 0",
      );
      return;
    }
    const available = items[editingItemIndex].available;
    if (parsed > available) {
      Alert.alert("Insufficient Stock", `Only ${available} units available.`);
      return;
    }
    updateQuantity(editingItemIndex, manualQtyValue);
    setQtyModalVisible(false);
    setEditingItemIndex(null);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );

  const handleSubmit = async () => {
    if (items.length === 0) {
      Alert.alert("Error", "Add at least one item");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(Endpoints.SALES, {
        items: items.map(({ product_id, quantity }) => ({
          product_id,
          quantity,
        })),
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        store_id: selectedStoreId || undefined,
        idempotency_key: `sale-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
      Alert.alert("Success", "Sale created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to create sale",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStores = availableStores.filter(
    (s) =>
      s.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
      (s.address &&
        s.address.toLowerCase().includes(storeSearch.toLowerCase())),
  );

  const filteredStock = myStock.filter((s) =>
    (s.product?.name || "").toLowerCase().includes(prodSearch.toLowerCase()),
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader
        title="Create Sale"
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
          {/* Store Selection */}
          <View style={styles.sectionWrapper}>
            <View style={styles.sectionHeader}>
              <Ionicons name="storefront" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Store (optional)
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.pickerBtn,
                Shadow.sm,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedStoreId
                    ? colors.primary
                    : colors.borderLight,
                  padding: Spacing.lg,
                },
              ]}
              onPress={() => setShowStorePicker(!showStorePicker)}
            >
              <Text
                style={{
                  color: selectedStoreId ? colors.text : colors.textMuted,
                }}
              >
                {selectedStoreId
                  ? availableStores.find((s) => s.id === selectedStoreId)?.name
                  : "Select Store"}
              </Text>
              <Ionicons
                name={showStorePicker ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            {showStorePicker && (
              <View
                style={[
                  styles.pickerDropdown,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <TextInput
                  placeholder="Search store..."
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.pickerSearch,
                    {
                      color: colors.text,
                      borderBottomColor: colors.borderLight,
                    },
                  ]}
                  value={storeSearch}
                  onChangeText={setStoreSearch}
                  autoFocus
                />
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => {
                      selectStore(null);
                      setShowStorePicker(false);
                    }}
                  >
                    <Text style={{ color: colors.textMuted }}>
                      No Store (General Sale)
                    </Text>
                  </TouchableOpacity>
                  {filteredStores.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.pickerItem}
                      onPress={() => selectStore(s)}
                    >
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: FontWeight.medium,
                        }}
                      >
                        {s.name}
                      </Text>
                      {s.address && (
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                          {s.address}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Customer Info */}
          <View style={styles.sectionWrapper}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Customer Info
              </Text>
            </View>
            <View
              style={[
                styles.formCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
                Shadow.sm,
              ]}
            >
              <Input
                label="Customer Name"
                placeholder="Name"
                value={customerName}
                onChangeText={setCustomerName}
              />
              <Input
                label="Customer Phone"
                placeholder="Phone"
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Sale Items */}
          <View style={styles.sectionWrapper}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cart" size={16} color={colors.primary} />
              <Text
                style={[styles.sectionTitle, { color: colors.text, flex: 1 }]}
              >
                Sale Items ({items.length})
              </Text>
              <TouchableOpacity
                style={[
                  styles.addItemBtn,
                  { backgroundColor: colors.primary + "15" },
                ]}
                onPress={() => setShowProductModal(true)}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text
                  style={{ color: colors.primary, fontWeight: FontWeight.bold }}
                >
                  Add Product
                </Text>
              </TouchableOpacity>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyItems}>
                <Text style={{ color: colors.textMuted }}>
                  No products added to this sale
                </Text>
              </View>
            ) : (
              items.map((item, i) => (
                <View
                  key={i}
                  style={[
                    styles.itemCard,
                    Shadow.sm,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderLight,
                      padding: Spacing.lg,
                    },
                  ]}
                >
                  <View style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, { color: colors.text }]}>
                        {item.product_name}
                      </Text>
                      <Text
                        style={[styles.itemSub, { color: colors.textMuted }]}
                      >
                        ৳{item.price.toLocaleString()} × {item.quantity} = ৳
                        {(item.price * item.quantity).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        onPress={() =>
                          updateQuantity(i, String(item.quantity - 1))
                        }
                        style={[
                          styles.qtyBtn,
                          { backgroundColor: colors.surfaceSecondary },
                        ]}
                      >
                        <Ionicons name="remove" size={16} color={colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => openQtyModal(i)}
                        style={styles.qtyDisplay}
                      >
                        <Text style={[styles.qtyText, { color: colors.text }]}>
                          {item.quantity}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          updateQuantity(i, String(item.quantity + 1))
                        }
                        style={[
                          styles.qtyBtn,
                          { backgroundColor: colors.surfaceSecondary },
                        ]}
                      >
                        <Ionicons name="add" size={16} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeItem(i)}
                      style={styles.removeBtn}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={colors.danger}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          <Input
            label="Sale Notes"
            placeholder="Additional details..."
            value={notes}
            onChangeText={setNotes}
            multiline
            style={{ marginBottom: Spacing.xl }}
          />

          {/* Total & Submit */}
          <View
            style={[
              styles.totalCard,
              Shadow.sm,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <View style={styles.totalRow}>
              <Text
                style={[styles.totalLabel, { color: colors.textSecondary }]}
              >
                Total Amount
              </Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>
                ৳{total.toLocaleString()}
              </Text>
            </View>
          </View>

          <Button
            title="Complete Sale"
            onPress={handleSubmit}
            loading={submitting}
            disabled={items.length === 0}
            size="lg"
          />
        </ScrollView>
      </View>

      {/* Product Selection Modal */}
      <Modal visible={showProductModal} animationType="slide" transparent>
        <View
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
        >
          <View
            style={[
              styles.modalContentFull,
              { backgroundColor: colors.surface },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: colors.borderLight },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select Product
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowProductModal(false);
                  setProdSearch("");
                }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchBox}>
              <Ionicons
                name="search"
                size={18}
                color={colors.textMuted}
                style={{ marginRight: Spacing.sm }}
              />
              <TextInput
                placeholder="Search products..."
                placeholderTextColor={colors.textMuted}
                style={{ flex: 1, color: colors.text, fontSize: FontSize.md }}
                value={prodSearch}
                onChangeText={setProdSearch}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredStock}
              keyExtractor={(item, index) =>
                item.product_id || index.toString()
              }
              contentContainerStyle={{ padding: Spacing.lg }}
              renderItem={({ item }) => {
                const pid = item.product_id || item.product?.id;
                const isAdded = items.some((it) => it.product_id === pid);
                const available = item.quantity_remaining ?? item.quantity;
                return (
                  <TouchableOpacity
                    style={[
                      styles.spListItem,
                      { borderBottomColor: colors.borderLight },
                      isAdded && { opacity: 0.5 },
                    ]}
                    onPress={() => !isAdded && available > 0 && addItem(item)}
                    disabled={isAdded || available <= 0}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: FontWeight.medium,
                        }}
                      >
                        {item.product?.name || item.product_name}
                      </Text>
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontSize: FontSize.sm,
                        }}
                      >
                        Available: {available}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          color: colors.primary,
                          fontWeight: FontWeight.bold,
                        }}
                      >
                        ৳{Number(item.product?.price || 0).toLocaleString()}
                      </Text>
                      {isAdded ? (
                        <Badge text="Added" variant="success" />
                      ) : available <= 0 ? (
                        <Badge text="Out of Stock" variant="danger" />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text
                  style={{
                    textAlign: "center",
                    color: colors.textMuted,
                    marginTop: Spacing["2xl"],
                  }}
                >
                  No products found
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Manual Quantity Modal */}
      <Modal visible={qtyModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.modalContentCenter,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: colors.text, marginBottom: Spacing.md },
              ]}
            >
              Update Quantity
            </Text>
            <Input
              label="Enter Quantity"
              placeholder="0"
              value={manualQtyValue}
              onChangeText={setManualQtyValue}
              keyboardType="number-pad"
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setQtyModalVisible(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title="Update"
                onPress={handleManualQtySave}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContent: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing["5xl"] },
  sectionWrapper: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  pickerDropdown: {
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  pickerSearch: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    fontSize: FontSize.sm,
  },
  pickerItem: {
    padding: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  formCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  emptyItems: {
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderStyle: "dashed",
    borderRadius: BorderRadius.md,
  },
  itemCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  itemName: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  itemSub: { fontSize: FontSize.xs, marginTop: 2 },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyDisplay: {
    paddingHorizontal: Spacing.sm,
    minWidth: 36,
    alignItems: "center",
  },
  qtyText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  removeBtn: { padding: Spacing.sm },
  totalCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.medium },
  totalValue: { fontSize: FontSize["2xl"], fontWeight: FontWeight.bold },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContentFull: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    height: "90%",
  },
  modalContentCenter: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadow.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  modalSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    margin: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: "#f5f5f5",
  },
  spListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

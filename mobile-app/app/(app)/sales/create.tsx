import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  const [availableStores, setAvailableStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // Big data handling state
  const [productSearch, setProductSearch] = useState("");
  const [visibleProductCount, setVisibleProductCount] = useState(20);
  const [storeSearch, setStoreSearch] = useState("");
  const [storePickerExpanded, setStorePickerExpanded] = useState(true);

  // Helper: select/deselect store and auto-fill customer fields
  const selectStore = (storeId: string | null) => {
    // If deselecting, clear customer fields if they still match the store
    if (!storeId && selectedStoreId) {
      const prev = availableStores.find((s: any) => s.id === selectedStoreId);
      if (prev) {
        if (customerName === prev.name) setCustomerName("");
        if (customerPhone === (prev.phone || "")) setCustomerPhone("");
      }
    }
    setSelectedStoreId(storeId);
    // If selecting, auto-fill customer fields
    if (storeId) {
      const store = availableStores.find((s: any) => s.id === storeId);
      if (store) {
        setCustomerName(store.name || "");
        setCustomerPhone(store.phone || "");
      }
    }
  };

  // Manual Quantity Modal State
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
      // Fallback to product catalog if stock endpoint is unavailable
      await fetchProducts();
    } finally {
      setLoading(false);
    }
  }, [fetchProducts]);

  // Fetch active stores
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
    // Wait for user to be loaded from the auth store
    if (!user) return;

    setLoading(true);

    if (isAdminOrManager) {
      // ADMIN/MANAGER: use warehouse stock so available quantity is accurate
      fetchAdminStock();
    } else {
      // SALESPERSON: fetch assigned stock, fallback to products on 403
      api
        .get(Endpoints.MY_STOCK)
        .then((res) => {
          const data = res.data?.data || res.data;
          setMyStock(Array.isArray(data) ? data : data?.items || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("My stock error:", err?.response?.status);
          // Fallback: if 403, fetch products instead
          if (err?.response?.status === 403) {
            fetchProducts();
          } else {
            setLoading(false);
          }
        });
    }
  }, [user, isAdminOrManager, fetchProducts, fetchAdminStock]);

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
      Alert.alert(
        "Insufficient Stock",
        `Only ${available} units available in stock.`,
      );
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
          {/* Header */}
          <View style={styles.headerSection}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={28}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>New Sale</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {isAdminOrManager
                ? "Select products from the catalog and record a sale"
                : "Select products from your assigned stock"}
            </Text>
          </View>

          {/* Available Stock */}
          <View style={styles.sectionWrapper}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Available Stock ({myStock.length})
              </Text>
            </View>

            {/* Product Search */}
            {!loading && myStock.length > 5 && (
              <View
                style={[
                  styles.inlineSearch,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <TextInput
                  placeholder="Search products..."
                  placeholderTextColor={colors.textMuted}
                  value={productSearch}
                  onChangeText={(t) => {
                    setProductSearch(t);
                    setVisibleProductCount(20);
                  }}
                  style={[styles.inlineSearchInput, { color: colors.text }]}
                />
                {productSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setProductSearch("")}>
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {loading ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ paddingVertical: Spacing.xl }}
              />
            ) : myStock.length === 0 ? (
              <View style={styles.emptyStock}>
                <Ionicons
                  name="cube-outline"
                  size={32}
                  color={colors.textMuted}
                />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {isAdminOrManager
                    ? "No active products found"
                    : "No stock assigned to you"}
                </Text>
              </View>
            ) : (
              (() => {
                const filtered = productSearch.trim()
                  ? myStock.filter((s) =>
                      (s.product?.name || "")
                        .toLowerCase()
                        .includes(productSearch.toLowerCase()),
                    )
                  : myStock;
                const visible = filtered.slice(0, visibleProductCount);
                const hasMoreProducts = filtered.length > visibleProductCount;
                return (
                  <>
                    {visible.length === 0 && (
                      <Text
                        style={[
                          styles.emptyText,
                          {
                            color: colors.textMuted,
                            textAlign: "center",
                            paddingVertical: Spacing.lg,
                          },
                        ]}
                      >
                        No products match "{productSearch}"
                      </Text>
                    )}
                    {visible.map((stock: any, i: number) => {
                      const pid = stock.product_id || stock.product?.id;
                      const isAdded = items.some((it) => it.product_id === pid);
                      return (
                        <TouchableOpacity
                          key={pid || i}
                          style={[
                            styles.stockCard,
                            !isAdded && Shadow.sm,
                            {
                              backgroundColor: isAdded
                                ? colors.primary + "10"
                                : colors.surface,
                              borderColor: isAdded
                                ? colors.primary
                                : colors.borderLight,
                            },
                          ]}
                          onPress={() => addItem(stock)}
                          activeOpacity={0.7}
                          disabled={isAdded}
                        >
                          <View style={styles.stockRow}>
                            <Ionicons
                              name={
                                isAdded
                                  ? "checkmark-circle"
                                  : "add-circle-outline"
                              }
                              size={22}
                              color={
                                isAdded ? colors.primary : colors.textMuted
                              }
                            />
                            <View style={styles.stockInfo}>
                              <Text
                                style={[
                                  styles.stockName,
                                  { color: colors.text },
                                ]}
                              >
                                {stock.product?.name || "Product"}
                              </Text>
                              <Text
                                style={[
                                  styles.stockQty,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Available:{" "}
                                {stock.quantity_remaining ?? stock.quantity}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.stockPrice,
                                { color: colors.primary },
                              ]}
                            >
                              ৳
                              {Number(
                                stock.product?.price || 0,
                              ).toLocaleString()}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {hasMoreProducts && (
                      <TouchableOpacity
                        style={[
                          styles.showMoreBtn,
                          { borderColor: colors.primary },
                        ]}
                        onPress={() => setVisibleProductCount((p) => p + 20)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.showMoreText,
                            { color: colors.primary },
                          ]}
                        >
                          Show more ({filtered.length - visibleProductCount}{" "}
                          remaining)
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={16}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                    )}
                  </>
                );
              })()
            )}
          </View>

          {/* Selected Items */}
          {items.length > 0 && (
            <View style={styles.sectionWrapper}>
              <View style={styles.sectionHeader}>
                <Ionicons name="cart" size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Sale Items ({items.length})
                </Text>
              </View>

              {items.map((item, i) => (
                <View
                  key={i}
                  style={[
                    styles.itemCard,
                    Shadow.sm,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderLight,
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
              ))}
            </View>
          )}

          {/* Store Picker */}
          {availableStores.length > 0 && (
            <View style={styles.sectionWrapper}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setStorePickerExpanded(!storePickerExpanded)}
                activeOpacity={0.7}
              >
                <Ionicons name="storefront" size={16} color={colors.primary} />
                <Text
                  style={[styles.sectionTitle, { color: colors.text, flex: 1 }]}
                >
                  Store (optional)
                </Text>
                <Ionicons
                  name={storePickerExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {/* Selected store indicator */}
              {selectedStoreId && !storePickerExpanded && (
                <View
                  style={[
                    styles.selectedStoreCard,
                    {
                      backgroundColor: colors.primary + "10",
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.selectedStoreName,
                      { color: colors.primary },
                    ]}
                  >
                    {availableStores.find((s: any) => s.id === selectedStoreId)
                      ?.name || "Selected"}
                  </Text>
                  <TouchableOpacity onPress={() => selectStore(null)}>
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {storePickerExpanded && (
                <>
                  {/* Store search */}
                  {availableStores.length > 5 && (
                    <View
                      style={[
                        styles.inlineSearch,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="search-outline"
                        size={16}
                        color={colors.textMuted}
                      />
                      <TextInput
                        placeholder="Search stores..."
                        placeholderTextColor={colors.textMuted}
                        value={storeSearch}
                        onChangeText={setStoreSearch}
                        style={[
                          styles.inlineSearchInput,
                          { color: colors.text },
                        ]}
                      />
                      {storeSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setStoreSearch("")}>
                          <Ionicons
                            name="close-circle"
                            size={16}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {(() => {
                    const filteredStores = storeSearch.trim()
                      ? availableStores.filter(
                          (s: any) =>
                            s.name
                              ?.toLowerCase()
                              .includes(storeSearch.toLowerCase()) ||
                            s.address
                              ?.toLowerCase()
                              .includes(storeSearch.toLowerCase()),
                        )
                      : availableStores;
                    return filteredStores.length === 0 ? (
                      <Text
                        style={[
                          styles.emptyText,
                          {
                            color: colors.textMuted,
                            textAlign: "center",
                            paddingVertical: Spacing.md,
                          },
                        ]}
                      >
                        No stores match "{storeSearch}"
                      </Text>
                    ) : (
                      filteredStores.map((s: any) => {
                        const isSelected = selectedStoreId === s.id;
                        return (
                          <TouchableOpacity
                            key={s.id}
                            style={[
                              styles.stockCard,
                              Shadow.sm,
                              {
                                backgroundColor: isSelected
                                  ? colors.primary + "10"
                                  : colors.surface,
                                borderColor: isSelected
                                  ? colors.primary
                                  : colors.borderLight,
                              },
                            ]}
                            onPress={() => {
                              selectStore(isSelected ? null : s.id);
                              setStorePickerExpanded(false);
                              setStoreSearch("");
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.stockRow}>
                              <Ionicons
                                name={
                                  isSelected
                                    ? "checkmark-circle"
                                    : "storefront-outline"
                                }
                                size={20}
                                color={
                                  isSelected ? colors.primary : colors.textMuted
                                }
                              />
                              <View style={styles.stockInfo}>
                                <Text
                                  style={[
                                    styles.stockName,
                                    { color: colors.text },
                                  ]}
                                >
                                  {s.name}
                                </Text>
                                {s.address && (
                                  <Text
                                    style={[
                                      styles.stockQty,
                                      { color: colors.textSecondary },
                                    ]}
                                  >
                                    {s.address}
                                  </Text>
                                )}
                              </View>
                              {isSelected && (
                                <Ionicons
                                  name="checkmark"
                                  size={20}
                                  color={colors.primary}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    );
                  })()}
                </>
              )}
            </View>
          )}

          {/* Customer Info */}
          <View style={styles.sectionWrapper}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Customer (optional)
              </Text>
            </View>
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
                label="Name"
                placeholder="Customer name"
                value={customerName}
                onChangeText={setCustomerName}
                leftIcon="person-outline"
              />
              <Input
                label="Phone"
                placeholder="Phone number"
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
                leftIcon="call-outline"
              />
              <Input
                label="Notes"
                placeholder="Sale notes..."
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>
          </View>

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
            <Text style={[styles.itemCountText, { color: colors.textMuted }]}>
              {items.length} item{items.length !== 1 ? "s" : ""} selected
            </Text>
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

      {/* Manual Quantity Modal */}
      <Modal
        visible={qtyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setQtyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Update Quantity
              </Text>
              <TouchableOpacity onPress={() => setQtyModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text
              style={[styles.modalSubtitle, { color: colors.textSecondary }]}
            >
              {editingItemIndex !== null
                ? items[editingItemIndex].product_name
                : ""}
            </Text>

            <Input
              label="Enter Quantity"
              placeholder="0"
              value={manualQtyValue}
              onChangeText={setManualQtyValue}
              keyboardType="number-pad"
              autoFocus
            />

            {editingItemIndex !== null && (
              <Text style={[styles.stockInfoText, { color: colors.textMuted }]}>
                Available: {items[editingItemIndex].available}
              </Text>
            )}

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
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
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
  subtitle: {
    fontSize: FontSize.sm,
    textAlign: "center",
  },
  sectionWrapper: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  emptyStock: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    gap: Spacing.sm,
  },
  emptyText: { fontSize: FontSize.sm },
  stockCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  stockRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  stockInfo: { flex: 1 },
  stockName: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  stockQty: { fontSize: FontSize.xs, marginTop: 1 },
  stockPrice: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  itemCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  itemName: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  itemSub: { fontSize: FontSize.xs, marginTop: 2 },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyDisplay: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minWidth: 40,
    alignItems: "center",
  },
  qtyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    textAlign: "center",
  },
  removeBtn: { padding: Spacing.sm },
  formCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  storeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  storeChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  inlineSearch: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  inlineSearchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    fontSize: FontSize.sm,
  },
  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: Spacing.xs,
  },
  showMoreText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  selectedStoreCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  selectedStoreName: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
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
  itemCountText: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
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
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  modalSubtitle: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.lg,
  },
  stockInfoText: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.lg,
    marginTop: -Spacing.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

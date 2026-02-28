import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
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

  const [myStock, setMyStock] = useState<any[]>([]);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get(Endpoints.MY_STOCK)
      .then((res) => {
        const data = res.data?.data || res.data;
        setMyStock(Array.isArray(data) ? data : data?.items || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
        items: items.map(({ product_id, quantity, price }) => ({
          product_id,
          quantity,
          unit_price: price,
        })),
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
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
            <Ionicons name="receipt-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>New Sale</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Select products from your stock and record a sale
          </Text>
        </View>

        {/* Available Stock */}
        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cube" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Available Stock
            </Text>
          </View>

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
                No stock assigned to you
              </Text>
            </View>
          ) : (
            myStock.map((stock, i) => {
              const pid = stock.product_id || stock.product?.id;
              const isAdded = items.some((it) => it.product_id === pid);
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.stockCard,
                    Shadow.sm,
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
                      name={isAdded ? "checkmark-circle" : "add-circle-outline"}
                      size={22}
                      color={isAdded ? colors.primary : colors.textMuted}
                    />
                    <View style={styles.stockInfo}>
                      <Text style={[styles.stockName, { color: colors.text }]}>
                        {stock.product?.name || "Product"}
                      </Text>
                      <Text
                        style={[styles.stockQty, { color: colors.textMuted }]}
                      >
                        Available: {stock.quantity_remaining ?? stock.quantity}
                      </Text>
                    </View>
                    <Text
                      style={[styles.stockPrice, { color: colors.primary }]}
                    >
                      ৳{Number(stock.product?.price || 0).toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
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
                    <Text style={[styles.itemSub, { color: colors.textMuted }]}>
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
                    <Text style={[styles.qtyText, { color: colors.text }]}>
                      {item.quantity}
                    </Text>
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
            Shadow.md,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
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
          icon={<Ionicons name="checkmark-circle" size={18} color="#FFF" />}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    padding: Spacing.md,
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
  qtyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    minWidth: 24,
    textAlign: "center",
  },
  removeBtn: { padding: Spacing.sm },
  formCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
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
});

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Alert,
  TouchableOpacity,
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
    if (items.find((i) => i.product_id === stock.product_id)) {
      Alert.alert("Already added", "This product is already in the sale");
      return;
    }
    setItems([
      ...items,
      {
        product_id: stock.product_id || stock.product?.id,
        product_name: stock.product?.name || stock.product_name || "Product",
        quantity: 1,
        price: Number(stock.product?.price || stock.price || 0),
      },
    ]);
  };

  const updateQuantity = (index: number, qty: string) => {
    const updated = [...items];
    updated[index].quantity = Math.max(1, parseInt(qty) || 1);
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
      Alert.alert("Success", "Sale created!", [
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>New Sale</Text>

      {/* Available Stock */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        Select Products
      </Text>
      {myStock.map((stock, i) => (
        <TouchableOpacity
          key={i}
          style={[
            styles.stockCard,
            Shadow.sm,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
          onPress={() => addItem(stock)}
          activeOpacity={0.7}
        >
          <View style={styles.stockRow}>
            <Ionicons
              name="add-circle-outline"
              size={22}
              color={colors.primary}
            />
            <View style={styles.stockInfo}>
              <Text style={[styles.stockName, { color: colors.text }]}>
                {stock.product?.name || "Product"}
              </Text>
              <Text style={[styles.stockQty, { color: colors.textMuted }]}>
                Available: {stock.quantity_remaining ?? stock.quantity}
              </Text>
            </View>
            <Text style={[styles.stockPrice, { color: colors.primary }]}>
              ৳{Number(stock.product?.price || 0).toLocaleString()}
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Selected Items */}
      {items.length > 0 && (
        <>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.textSecondary, marginTop: Spacing.xl },
            ]}
          >
            Sale Items
          </Text>
          {items.map((item, i) => (
            <View
              key={i}
              style={[
                styles.itemCard,
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
                    ৳{item.price} × {item.quantity} = ৳
                    {(item.price * item.quantity).toLocaleString()}
                  </Text>
                </View>
                <Input
                  value={String(item.quantity)}
                  onChangeText={(val) => updateQuantity(i, val)}
                  keyboardType="number-pad"
                  style={{ width: 60, textAlign: "center" }}
                />
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
        </>
      )}

      {/* Customer Info */}
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.textSecondary, marginTop: Spacing.xl },
        ]}
      >
        Customer (optional)
      </Text>
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

      {/* Total & Submit */}
      <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
          Total
        </Text>
        <Text style={[styles.totalValue, { color: colors.text }]}>
          ৳{total.toLocaleString()}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing["5xl"] },
  title: {
    fontSize: FontSize["2xl"],
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  stockCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stockRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  stockInfo: { flex: 1 },
  stockName: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  stockQty: { fontSize: FontSize.xs },
  stockPrice: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  itemCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  itemName: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  itemSub: { fontSize: FontSize.xs },
  removeBtn: { padding: Spacing.sm },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    marginVertical: Spacing.lg,
  },
  totalLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.medium },
  totalValue: { fontSize: FontSize["2xl"], fontWeight: FontWeight.bold },
});

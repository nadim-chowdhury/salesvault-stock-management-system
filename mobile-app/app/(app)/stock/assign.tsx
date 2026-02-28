import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import api from "../../../src/services/api";
import { Endpoints } from "../../../src/constants/api";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
} from "../../../src/constants/theme";
import Button from "../../../src/components/ui/Button";
import Input from "../../../src/components/ui/Input";

export default function AssignStockScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();

  const [productId, setProductId] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!productId.trim() || !salespersonId.trim() || !quantity.trim()) {
      Alert.alert("Validation", "All fields are required");
      return;
    }
    setLoading(true);
    try {
      await api.post(Endpoints.STOCK_ASSIGN, {
        product_id: productId.trim(),
        salesperson_id: salespersonId.trim(),
        quantity: parseInt(quantity),
        warehouse_id: warehouseId.trim() || undefined,
      });
      Alert.alert("Success", "Stock assigned!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to assign stock",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>Assign Stock</Text>
      <Input
        label="Product ID"
        placeholder="UUID of the product"
        value={productId}
        onChangeText={setProductId}
        leftIcon="cube-outline"
      />
      <Input
        label="Salesperson ID"
        placeholder="UUID of the salesperson"
        value={salespersonId}
        onChangeText={setSalespersonId}
        leftIcon="person-outline"
      />
      <Input
        label="Warehouse ID (optional)"
        placeholder="UUID of the warehouse"
        value={warehouseId}
        onChangeText={setWarehouseId}
        leftIcon="business-outline"
      />
      <Input
        label="Quantity"
        placeholder="e.g. 50"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="number-pad"
        leftIcon="layers-outline"
      />
      <Button
        title="Assign Stock"
        onPress={handleAssign}
        loading={loading}
        disabled={
          !productId.trim() || !salespersonId.trim() || !quantity.trim()
        }
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
    marginBottom: Spacing["2xl"],
  },
});

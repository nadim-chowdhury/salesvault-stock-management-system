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

export default function CreateProductScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !sku.trim() || !price.trim()) {
      Alert.alert("Validation", "Name, SKU, and Price are required");
      return;
    }
    setLoading(true);
    try {
      await api.post(Endpoints.PRODUCTS, {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        price: parseFloat(price),
        cost_price: costPrice ? parseFloat(costPrice) : 0,
        description: description.trim() || undefined,
      });
      Alert.alert("Success", "Product created", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to create product",
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
      <Text style={[styles.title, { color: colors.text }]}>New Product</Text>
      <Input
        label="Product Name"
        placeholder="e.g. Widget Pro"
        value={name}
        onChangeText={setName}
        leftIcon="cube-outline"
      />
      <Input
        label="SKU"
        placeholder="e.g. WGT-PRO-001"
        value={sku}
        onChangeText={setSku}
        autoCapitalize="characters"
        leftIcon="barcode-outline"
      />
      <Input
        label="Price (৳)"
        placeholder="0.00"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        leftIcon="pricetag-outline"
      />
      <Input
        label="Cost Price (৳)"
        placeholder="0.00"
        value={costPrice}
        onChangeText={setCostPrice}
        keyboardType="decimal-pad"
        leftIcon="wallet-outline"
      />
      <Input
        label="Description (optional)"
        placeholder="Product details..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />
      <Button
        title="Create Product"
        onPress={handleCreate}
        loading={loading}
        disabled={!name.trim() || !sku.trim() || !price.trim()}
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

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
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
import PageHeader from "@/src/components/ui/PageHeader";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditProductScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const {
    id,
    name: initialName,
    price: initialPrice,
    cost_price: initialCostPrice,
    description: initialDescription,
  } = useLocalSearchParams<{
    id: string;
    name: string;
    price: string;
    cost_price: string;
    description: string;
  }>();

  const [name, setName] = useState(initialName || "");
  const [price, setPrice] = useState(initialPrice || "");
  const [costPrice, setCostPrice] = useState(initialCostPrice || "");
  const [description, setDescription] = useState(initialDescription || "");
  const [loading, setLoading] = useState(false);

  const hasChanges =
    name !== (initialName || "") ||
    price !== (initialPrice || "") ||
    costPrice !== (initialCostPrice || "") ||
    description !== (initialDescription || "");

  const handleSave = async () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert("Validation", "Name and Price are required");
      return;
    }
    const priceVal = parseFloat(price);
    if (isNaN(priceVal) || priceVal <= 0) {
      Alert.alert("Validation", "Please enter a valid price");
      return;
    }
    setLoading(true);
    try {
      await api.patch(`${Endpoints.PRODUCTS}/${id}`, {
        name: name.trim(),
        price: priceVal,
        cost_price: costPrice ? parseFloat(costPrice) : undefined,
        description: description.trim() || undefined,
      });
      Alert.alert("Success", "Product updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to update product",
      );
    } finally {
      setLoading(false);
    }
  };

  const margin =
    price && costPrice ? parseFloat(price) - parseFloat(costPrice) : null;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surface }]}
      edges={["top"]}
    >
      <PageHeader title="Edit Product" showBack />
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
            <Ionicons name="create-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Edit Product
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Update the product details below
          </Text>
        </View>

        {/* Form Card */}
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
            label="Product Name *"
            placeholder="e.g. Widget Pro"
            value={name}
            onChangeText={setName}
            leftIcon="cube-outline"
          />
          <Input
            label="Selling Price (৳) *"
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
            label="Description"
            placeholder="Product details..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Margin Preview */}
        {margin !== null && !isNaN(margin) && (
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: colors.textMuted }]}>
                Updated Margin
              </Text>
              <Text
                style={[
                  styles.previewValue,
                  { color: margin >= 0 ? colors.success : colors.danger },
                ]}
              >
                ৳{margin.toLocaleString()} (
                {parseFloat(costPrice) > 0
                  ? ((margin / parseFloat(costPrice)) * 100).toFixed(1)
                  : "—"}
                %)
              </Text>
            </View>
          </View>
        )}

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={loading}
          disabled={!name.trim() || !price.trim() || !hasChanges}
          size="lg"
        />

        {!hasChanges && (
          <Text style={[styles.noChanges, { color: colors.textMuted }]}>
            No changes to save
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
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
    marginBottom: Spacing.xl,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  previewValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  noChanges: {
    textAlign: "center",
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
  },
});

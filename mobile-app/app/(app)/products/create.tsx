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
    const priceVal = parseFloat(price);
    const costVal = costPrice ? parseFloat(costPrice) : 0;
    if (isNaN(priceVal) || priceVal <= 0) {
      Alert.alert("Validation", "Please enter a valid price");
      return;
    }
    setLoading(true);
    try {
      await api.post(Endpoints.PRODUCTS, {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        price: priceVal,
        cost_price: costVal,
        description: description.trim() || undefined,
      });
      Alert.alert("Success", "Product created successfully!", [
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

  const margin =
    price && costPrice ? parseFloat(price) - parseFloat(costPrice) : null;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader title="Create Product" showBack />

      <View style={[styles.mainContent, { backgroundColor: colors.surface }]}>
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
            <Ionicons name="cube-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            New Product
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Add a new product to your catalog
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
            label="SKU *"
            placeholder="e.g. WGT-PRO-001"
            value={sku}
            onChangeText={setSku}
            autoCapitalize="characters"
            leftIcon="barcode-outline"
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

        {/* Preview */}
        {(name || price) && (
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
              Preview
            </Text>
            <Text style={[styles.previewName, { color: colors.text }]}>
              {name || "Product Name"}
            </Text>
            {sku ? (
              <Text style={[styles.previewSku, { color: colors.textMuted }]}>
                SKU: {sku.toUpperCase()}
              </Text>
            ) : null}
            <View style={styles.previewPriceRow}>
              {price ? (
                <Text style={[styles.previewPrice, { color: colors.primary }]}>
                  ৳{parseFloat(price || "0").toLocaleString()}
                </Text>
              ) : null}
              {margin !== null && !isNaN(margin) && (
                <Text
                  style={[
                    styles.previewMargin,
                    { color: margin >= 0 ? colors.success : colors.danger },
                  ]}
                >
                  Margin: ৳{margin.toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        )}

        <Button
          title="Create Product"
          onPress={handleCreate}
          loading={loading}
          disabled={!name.trim() || !sku.trim() || !price.trim()}
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
  previewName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: 2,
  },
  previewSku: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.sm,
  },
  previewPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  previewPrice: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  previewMargin: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});

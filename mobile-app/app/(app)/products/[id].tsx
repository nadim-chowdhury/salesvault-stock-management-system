import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import api from "../../../src/services/api";
import { Endpoints } from "../../../src/constants/api";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
} from "../../../src/constants/theme";
import Card from "../../../src/components/ui/Card";
import Badge from "../../../src/components/ui/Badge";

export default function ProductDetailScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`${Endpoints.PRODUCTS}/${id}`)
      .then((res) => setProduct(res.data?.data || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>Product not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.text }]}>
          {product.name}
        </Text>
        <Badge
          text={product.is_active ? "Active" : "Inactive"}
          variant={product.is_active ? "success" : "danger"}
        />
      </View>

      <Card style={styles.detailCard}>
        <DetailRow label="SKU" value={product.sku} colors={colors} />
        <DetailRow
          label="Price"
          value={`৳${Number(product.price || 0).toLocaleString()}`}
          colors={colors}
        />
        <DetailRow
          label="Cost Price"
          value={`৳${Number(product.cost_price || 0).toLocaleString()}`}
          colors={colors}
        />
        {product.description && (
          <DetailRow
            label="Description"
            value={product.description}
            colors={colors}
          />
        )}
      </Card>
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: Spacing.lg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  name: {
    fontSize: FontSize["2xl"],
    fontWeight: FontWeight.bold,
    flex: 1,
    marginRight: Spacing.md,
  },
  detailCard: { marginBottom: Spacing.lg },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E2E8F020",
  },
  detailLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  detailValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textAlign: "right",
    flex: 1,
    marginLeft: Spacing.lg,
  },
});

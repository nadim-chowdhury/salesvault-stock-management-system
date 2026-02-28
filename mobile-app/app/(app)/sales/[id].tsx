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
  BorderRadius,
} from "../../../src/constants/theme";
import Card from "../../../src/components/ui/Card";
import Badge from "../../../src/components/ui/Badge";

export default function SaleDetailScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { id } = useLocalSearchParams();
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`${Endpoints.SALES}/${id}`)
      .then((res) => setSale(res.data?.data || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  if (!sale)
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>Sale not found</Text>
      </View>
    );

  const statusVariant =
    sale.payment_status === "PAID"
      ? "success"
      : sale.payment_status === "CANCELLED"
        ? "danger"
        : "warning";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={[styles.amount, { color: colors.text }]}>
          ৳{Number(sale.total_amount || 0).toLocaleString()}
        </Text>
        <Badge text={sale.payment_status} variant={statusVariant} />
      </View>

      <Card style={styles.card}>
        {sale.customer_name && (
          <DetailRow
            label="Customer"
            value={sale.customer_name}
            colors={colors}
          />
        )}
        {sale.customer_phone && (
          <DetailRow
            label="Phone"
            value={sale.customer_phone}
            colors={colors}
          />
        )}
        <DetailRow
          label="Date"
          value={new Date(sale.created_at).toLocaleString()}
          colors={colors}
        />
        {sale.notes && (
          <DetailRow label="Notes" value={sale.notes} colors={colors} />
        )}
      </Card>

      {sale.items && sale.items.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Items
          </Text>
          {sale.items.map((item: any, i: number) => (
            <Card key={i} style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.text }]}>
                    {item.product?.name || "Product"}
                  </Text>
                  <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                    Qty: {item.quantity} × ৳
                    {Number(
                      item.price || item.unit_price || 0,
                    ).toLocaleString()}
                  </Text>
                </View>
                <Text style={[styles.itemTotal, { color: colors.primary }]}>
                  ৳
                  {(
                    item.quantity * Number(item.price || item.unit_price || 0)
                  ).toLocaleString()}
                </Text>
              </View>
            </Card>
          ))}
        </>
      )}
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
  amount: { fontSize: FontSize["3xl"], fontWeight: FontWeight.bold },
  card: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.md,
  },
  itemCard: { marginBottom: Spacing.sm },
  itemRow: { flexDirection: "row", alignItems: "center" },
  itemName: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  itemMeta: { fontSize: FontSize.xs, marginTop: 2 },
  itemTotal: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  detailLabel: { fontSize: FontSize.sm },
  detailValue: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});

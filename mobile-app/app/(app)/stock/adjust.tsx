import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
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
import { useThemeStore } from "../../../src/stores/theme-store";

const REASONS = [
  { label: "Correction (+/-)", value: "CORRECTION" },
  { label: "Damaged (-)", value: "DAMAGED" },
  { label: "Return (+)", value: "RETURN" },
  { label: "Expiry (-)", value: "EXPIRY" },
];

export default function AdjustStockScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();

  const { setThemeMode } = useThemeStore();
  const toggleTheme = () => {
    setThemeMode(scheme === "light" ? "dark" : "light");
  };

  // Destructure parameters passed from our previous index.tsx touchable update
  const { productId, warehouseId, currentQuantity, productName } =
    useLocalSearchParams<{
      productId: string;
      warehouseId: string;
      currentQuantity: string;
      productName: string;
    }>();

  const [quantityChange, setQuantityChange] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReasons, setShowReasons] = useState(false);

  const handleAdjust = async () => {
    if (!quantityChange.trim() || isNaN(Number(quantityChange))) {
      Alert.alert(
        "Validation",
        "Please enter a valid quantity change (can be negative)",
      );
      return;
    }

    // Calculate final quantity based on the reason
    let finalQuantity = parseInt(quantityChange, 10);

    if (reason.value === "DAMAGED" || reason.value === "EXPIRY") {
      // Force negative
      finalQuantity = -Math.abs(finalQuantity);
    } else if (reason.value === "RETURN") {
      // Force positive
      finalQuantity = Math.abs(finalQuantity);
    }
    // "CORRECTION" stays as whatever the user inputted

    setLoading(true);
    try {
      await api.post(Endpoints.STOCK_ADJUSTMENT, {
        product_id: productId,
        warehouse_id: warehouseId,
        quantity_change: finalQuantity,
        reason: reason.value,
        notes: notes.trim() || undefined,
      });

      Alert.alert("Success", "Stock adjusted successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to adjust stock",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader
        title="Adjust Stock"
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
          {/* Header Info */}
          <View style={styles.headerSection}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons
                name="options-outline"
                size={28}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {productName || "Product"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Current Quantity: {currentQuantity || 0}
            </Text>
          </View>

          {/* Reason Picker */}
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Reason *
            </Text>
            <TouchableOpacity
              style={[
                styles.picker,
                Shadow.sm,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}
              onPress={() => setShowReasons(!showReasons)}
            >
              <Text style={[styles.pickerText, { color: colors.text }]}>
                {reason.label}
              </Text>
              <Ionicons
                name={showReasons ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {showReasons && (
              <View
                style={[
                  styles.dropdownList,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                {REASONS.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: colors.borderLight },
                    ]}
                    onPress={() => {
                      setReason(r);
                      setShowReasons(false);
                    }}
                  >
                    <Text style={[styles.dropdownText, { color: colors.text }]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Inputs */}
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
              label="Quantity Change *"
              placeholder="e.g. 5 or -2"
              value={quantityChange}
              onChangeText={setQuantityChange}
              keyboardType="numbers-and-punctuation"
              leftIcon="layers-outline"
            />

            <View style={{ marginTop: Spacing.md }}>
              <Input
                label="Notes"
                placeholder="Optional explanation..."
                value={notes}
                onChangeText={setNotes}
                leftIcon="document-text-outline"
              />
            </View>
          </View>

          <Button
            title="Submit Adjustment"
            onPress={handleAdjust}
            loading={loading}
            disabled={!quantityChange.trim()}
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
  headerSection: { alignItems: "center", marginBottom: Spacing["2xl"] },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize["xl"],
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: { fontSize: FontSize.md },
  sectionWrapper: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  pickerText: { fontSize: FontSize.md, flex: 1 },
  dropdownList: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    overflow: "hidden",
  },
  dropdownItem: { padding: Spacing.md, borderBottomWidth: 0.5 },
  dropdownText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  formCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

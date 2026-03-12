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

export default function StoreEditScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { setThemeMode } = useThemeStore();
  const {
    id,
    name: initialName,
    address: initialAddress,
    phone: initialPhone,
  } = useLocalSearchParams<{
    id: string;
    name: string;
    address: string;
    phone: string;
  }>();

  const toggleTheme = () => {
    const nextMode = scheme === "light" ? "dark" : "light";
    setThemeMode(nextMode);
  };

  const [name, setName] = useState(initialName || "");
  const [address, setAddress] = useState(initialAddress || "");
  const [phone, setPhone] = useState(initialPhone || "");
  const [loading, setLoading] = useState(false);

  const hasChanges =
    name !== (initialName || "") ||
    address !== (initialAddress || "") ||
    phone !== (initialPhone || "");

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Store name is required");
      return;
    }
    setLoading(true);
    try {
      await api.patch(`${Endpoints.STORES}/${id}`, {
        name: name.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      Alert.alert("Success", "Store updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to update store",
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
        title="Edit Store"
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
                name="create-outline"
                size={28}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Edit Store
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Update store details
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
              label="Store Name *"
              placeholder="e.g. Downtown Shop"
              value={name}
              onChangeText={setName}
              leftIcon="storefront-outline"
            />
            <Input
              label="Address (optional)"
              placeholder="e.g. 123 Main Street"
              value={address}
              onChangeText={setAddress}
              leftIcon="location-outline"
            />
            <Input
              label="Phone (optional)"
              placeholder="e.g. +880 1700-000000"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon="call-outline"
            />
          </View>

          {/* Change indicator */}
          {hasChanges && (
            <View
              style={[
                styles.changeCard,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.changeLabel, { color: colors.textMuted }]}>
                Changes detected
              </Text>
              <View style={styles.changeDetails}>
                {name !== (initialName || "") && (
                  <Text style={[styles.changeText, { color: colors.primary }]}>
                    Name: {name}
                  </Text>
                )}
                {address !== (initialAddress || "") && (
                  <Text style={[styles.changeText, { color: colors.primary }]}>
                    Address: {address || "(cleared)"}
                  </Text>
                )}
                {phone !== (initialPhone || "") && (
                  <Text style={[styles.changeText, { color: colors.primary }]}>
                    Phone: {phone || "(cleared)"}
                  </Text>
                )}
              </View>
            </View>
          )}

          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={loading}
            disabled={!name.trim() || !hasChanges}
            size="lg"
          />

          {!hasChanges && (
            <Text style={[styles.noChanges, { color: colors.textMuted }]}>
              No changes to save
            </Text>
          )}
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
  changeCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  changeLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  changeDetails: {
    gap: 4,
  },
  changeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  noChanges: {
    textAlign: "center",
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
  },
  themeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -Spacing.sm,
  },
});

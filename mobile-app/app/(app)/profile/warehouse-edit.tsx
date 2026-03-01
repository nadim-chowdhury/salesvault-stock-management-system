import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from "@/src/components/ui/PageHeader";

export default function WarehouseEditScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const {
    id,
    name: initialName,
    location: initialLocation,
  } = useLocalSearchParams<{
    id: string;
    name: string;
    location: string;
  }>();

  const [name, setName] = useState(initialName || "");
  const [location, setLocation] = useState(initialLocation || "");
  const [loading, setLoading] = useState(false);

  const hasChanges =
    name !== (initialName || "") || location !== (initialLocation || "");

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Warehouse name is required");
      return;
    }
    setLoading(true);
    try {
      await api.patch(`${Endpoints.WAREHOUSES}/${id}`, {
        name: name.trim(),
        location: location.trim() || undefined,
      });
      Alert.alert("Success", "Warehouse updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to update warehouse",
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
      <PageHeader title="Edit Warehouse" showBack />

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
            <Ionicons name="create-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Edit Warehouse
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Update warehouse details
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
            label="Warehouse Name *"
            placeholder="e.g. Main Warehouse"
            value={name}
            onChangeText={setName}
            leftIcon="business-outline"
          />
          <Input
            label="Location (optional)"
            placeholder="e.g. Dhaka, Bangladesh"
            value={location}
            onChangeText={setLocation}
            leftIcon="location-outline"
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
              {location !== (initialLocation || "") && (
                <Text style={[styles.changeText, { color: colors.primary }]}>
                  Location: {location || "(cleared)"}
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
});

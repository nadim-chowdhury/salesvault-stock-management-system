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

export default function CreateWarehouseScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Warehouse name is required");
      return;
    }
    setLoading(true);
    try {
      await api.post(Endpoints.WAREHOUSES, {
        name: name.trim(),
        location: location.trim() || undefined,
      });
      Alert.alert("Success", "Warehouse created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to create warehouse",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
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
              name="business-outline"
              size={28}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            New Warehouse
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Add a new storage location
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

        {/* Preview */}
        {name.trim() && (
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
            <View style={styles.previewRow}>
              <View
                style={[
                  styles.previewIcon,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons name="business" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.previewName, { color: colors.text }]}>
                  {name}
                </Text>
                {location.trim() ? (
                  <View style={styles.previewLocationRow}>
                    <Ionicons
                      name="location-outline"
                      size={12}
                      color={colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.previewLocation,
                        { color: colors.textMuted },
                      ]}
                    >
                      {location}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}

        <Button
          title="Create Warehouse"
          onPress={handleCreate}
          loading={loading}
          disabled={!name.trim()}
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
    borderStyle: "dashed",
    marginBottom: Spacing.xl,
  },
  previewTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  previewName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  previewLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  previewLocation: {
    fontSize: FontSize.xs,
  },
});

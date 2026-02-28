import React, { useState } from "react";
import {
  StyleSheet,
  ScrollView,
  useColorScheme,
  Alert,
  Text,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
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
      Alert.alert("Success", "Warehouse updated", [
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>Edit Warehouse</Text>
      <Input
        label="Warehouse Name"
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
      <Button
        title="Save Changes"
        onPress={handleSave}
        loading={loading}
        disabled={!name.trim()}
        size="lg"
        style={{ marginTop: Spacing.xl }}
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

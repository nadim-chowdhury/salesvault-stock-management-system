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
      Alert.alert("Success", "Warehouse created", [
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>New Warehouse</Text>
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
        title="Create Warehouse"
        onPress={handleCreate}
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

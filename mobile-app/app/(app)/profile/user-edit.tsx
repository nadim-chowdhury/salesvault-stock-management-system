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

export default function UserEditScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const {
    id,
    name: initialName,
    role: initialRole,
  } = useLocalSearchParams<{
    id: string;
    name: string;
    role: string;
  }>();

  const [name, setName] = useState(initialName || "");
  const [role, setRole] = useState(initialRole || "SALESPERSON");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Name is required");
      return;
    }
    setLoading(true);
    try {
      await api.patch(`${Endpoints.USERS}/${id}`, {
        name: name.trim(),
        role,
      });
      Alert.alert("Success", "User updated", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to update user",
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
      <Text style={[styles.title, { color: colors.text }]}>Edit User</Text>

      <Input
        label="Full Name"
        placeholder="John Doe"
        value={name}
        onChangeText={setName}
        leftIcon="person-outline"
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Role</Text>
      <Button
        title="SALESPERSON"
        variant={role === "SALESPERSON" ? "primary" : "secondary"}
        size="md"
        onPress={() => setRole("SALESPERSON")}
        style={{ marginBottom: Spacing.sm }}
      />
      <View style={styles.roleRow}>
        <Button
          title="ADMIN"
          variant={role === "ADMIN" ? "primary" : "secondary"}
          size="sm"
          fullWidth={false}
          onPress={() => setRole("ADMIN")}
          style={{ flex: 1 }}
        />
        <Button
          title="MANAGER"
          variant={role === "MANAGER" ? "primary" : "secondary"}
          size="sm"
          fullWidth={false}
          onPress={() => setRole("MANAGER")}
          style={{ flex: 1 }}
        />
      </View>

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
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.sm,
  },
  roleRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
});

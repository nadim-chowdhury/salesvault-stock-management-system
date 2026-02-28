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

export default function CreateUserScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("SALESPERSON");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Validation", "All fields are required");
      return;
    }
    setLoading(true);
    try {
      await api.post(Endpoints.USERS, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });
      Alert.alert("Success", "User created", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to create user",
      );
    } finally {
      setLoading(false);
    }
  };

  const roles = ["ADMIN", "MANAGER", "SALESPERSON"];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>New User</Text>
      <Input
        label="Full Name"
        placeholder="John Doe"
        value={name}
        onChangeText={setName}
        leftIcon="person-outline"
      />
      <Input
        label="Email"
        placeholder="john@company.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        leftIcon="mail-outline"
      />
      <Input
        label="Password"
        placeholder="Strong password"
        value={password}
        onChangeText={setPassword}
        isPassword
        leftIcon="lock-closed-outline"
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Role</Text>
      <View style={styles.roleRow}>
        {roles.map((r) => (
          <Button
            key={r}
            title={r}
            variant={role === r ? "primary" : "secondary"}
            size="sm"
            fullWidth={false}
            onPress={() => setRole(r)}
            style={{ flex: 1 }}
          />
        ))}
      </View>

      <Button
        title="Create User"
        onPress={handleCreate}
        loading={loading}
        disabled={!name.trim() || !email.trim() || !password.trim()}
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

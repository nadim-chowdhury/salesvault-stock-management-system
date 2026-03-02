import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/stores/auth-store";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from "../../src/constants/theme";
import Button from "../../src/components/ui/Button";
import Input from "../../src/components/ui/Input";

export default function LoginScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    try {
      await login(email.trim().toLowerCase(), password);
    } catch {
      // Error is handled in the store
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Brand */}
        <View style={styles.brandContainer}>
          <View
            style={[
              styles.logoCircle,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <Ionicons
              name="shield-checkmark"
              size={40}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>
            SalesVault
          </Text>
          <Text style={[styles.tagline, { color: colors.textMuted }]}>
            Secure Stock Management
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {error && (
            <TouchableOpacity
              onPress={clearError}
              style={[
                styles.errorBanner,
                { backgroundColor: colors.dangerLight },
              ]}
            >
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {error}
              </Text>
            </TouchableOpacity>
          )}

          <Input
            label="Email"
            placeholder="you@company.com"
            leftIcon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) clearError();
            }}
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            leftIcon="lock-closed-outline"
            isPassword
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) clearError();
            }}
            onSubmitEditing={handleLogin}
            returnKeyType="go"
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={isLoading}
            disabled={!email.trim() || !password.trim()}
            size="lg"
          />
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.textMuted }]}>
          v1.0.0 · Enterprise Edition
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
    paddingVertical: Spacing["5xl"],
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: Spacing["4xl"],
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: FontSize["3xl"],
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
  },
  formContainer: {
    marginBottom: Spacing["3xl"],
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  footer: {
    textAlign: "center",
    fontSize: FontSize.xs,
  },
});

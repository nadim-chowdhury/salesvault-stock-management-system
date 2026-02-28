import React, { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { useAuthStore } from "../src/stores/auth-store";
import { Colors } from "../src/constants/theme";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [isAuthenticated, isInitialized, segments]);

  if (!isInitialized) {
    return <SplashLoading />;
  }

  return <>{children}</>;
}

function SplashLoading() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  return (
    <View style={[styles.splash, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export default function RootLayout() {
  const { initialize } = useAuthStore();
  const scheme = useColorScheme() ?? "light";

  useEffect(() => {
    initialize();
  }, []);

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <AuthGuard>
        <Slot />
      </AuthGuard>
    </>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

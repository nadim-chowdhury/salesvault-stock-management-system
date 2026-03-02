import React, { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as Updates from "expo-updates";
import { useAuthStore } from "../src/stores/auth-store";
import { useThemeStore } from "../src/stores/theme-store";
import { Colors } from "../src/constants/theme";
import QuickActionDrawer from "../src/components/ui/QuickActionDrawer";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized: authInitialized } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  const isInitialized = authInitialized;

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [isAuthenticated, isInitialized, segments, router]);

  if (!isInitialized) {
    return <SplashLoading />;
  }

  return (
    <>
      {children}
      {isAuthenticated && <QuickActionDrawer />}
    </>
  );
}

function UpdateGate({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const [checking, setChecking] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const checkForUpdate = async () => {
      if (__DEV__) {
        setChecking(false);
        return;
      }
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          setUpdateAvailable(true);
        }
      } catch {
        // ignore update check errors
      } finally {
        setChecking(false);
      }
    };

    checkForUpdate();
  }, []);

  const handleUpdateNow = async () => {
    try {
      setUpdating(true);
      const result = await Updates.fetchUpdateAsync();
      if (result.isNew) {
        await Updates.reloadAsync();
      } else {
        setUpdating(false);
      }
    } catch {
      setUpdating(false);
    }
  };

  return (
    <>
      {children}
      {updateAvailable && !checking && (
        <View style={[styles.updateBanner, { backgroundColor: colors.surface }]}>
          <Text style={[styles.updateText, { color: colors.text }]}>
            A new version of SalesVault is available.
          </Text>
          <View style={styles.updateActions}>
            <Text
              onPress={handleUpdateNow}
              style={[
                styles.updateButtonText,
                {
                  backgroundColor: colors.primary,
                  opacity: updating ? 0.7 : 1,
                },
              ]}
            >
              {updating ? "Updating..." : "Update now"}
            </Text>
          </View>
        </View>
      )}
    </>
  );
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
  const { initialize: authInit } = useAuthStore();
  const { initialize: themeInit } = useThemeStore();
  const scheme = useColorScheme() ?? "light";

  useEffect(() => {
    authInit();
    themeInit();
  }, [authInit, themeInit]);

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <AuthGuard>
        <UpdateGate>
          <Slot />
        </UpdateGate>
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
  updateBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  updateText: {
    flex: 1,
    marginRight: 12,
    fontSize: 14,
  },
  updateActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  updateButtonText: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    overflow: "hidden",
  },
});

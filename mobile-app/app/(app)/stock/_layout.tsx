import React from "react";
import { Stack, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontWeight, FontSize } from "../../../src/constants/theme";

export default function StockLayout() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();

  const backButton = () => (
    <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 8 }}>
      <Ionicons name="arrow-back" size={28} color={colors.text} />
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: FontWeight.semibold,
          fontSize: FontSize.lg,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="add"
        options={{
          title: "Add Stock",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="assign"
        options={{
          title: "Assign Stock",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="adjust"
        options={{
          title: "Adjust Stock",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
    </Stack>
  );
}

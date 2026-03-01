import React from "react";
import { Stack, useRouter } from "expo-router";
import { TouchableOpacity, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontWeight, FontSize } from "../../../src/constants/theme";

export default function SalesLayout() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();

  const backButton = () => (
    <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 8 }}>
      <Ionicons name="arrow-back" size={24} color={colors.text} />
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
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
        name="create"
        options={{
          title: "Create Sale",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Sale Details",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sales-approvals"
        options={{
          title: "Sale Approvals",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sales-targets"
        options={{
          title: "Sales Targets",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="daily-sales"
        options={{
          title: "Daily Sales Report",
          headerShown: false,
        }}
      />
    </Stack>
  );
}

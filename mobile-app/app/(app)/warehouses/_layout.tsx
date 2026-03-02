import React from "react";
import { Stack, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontWeight, FontSize } from "../../../src/constants/theme";

export default function WarehousesLayout() {
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
          title: "Create Warehouse",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Warehouse Details",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: "Edit Warehouse",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
    </Stack>
  );
}

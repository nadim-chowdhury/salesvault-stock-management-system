import React from "react";
import { Stack, useRouter } from "expo-router";
import { TouchableOpacity, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  FontWeight,
  FontSize,
  Spacing,
} from "../../../src/constants/theme";

export default function ProfileLayout() {
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
        name="users"
        options={{
          title: "User Management",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="user-create"
        options={{
          title: "Create User",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="user-detail"
        options={{
          title: "User Details",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="user-edit"
        options={{
          title: "Edit User",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="warehouse-create"
        options={{
          title: "Create Warehouse",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="warehouse-detail"
        options={{
          title: "Warehouse Details",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="warehouse-edit"
        options={{
          title: "Edit Warehouse",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="stock"
        options={{
          title: "Stock Management",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="stock-add"
        options={{
          title: "Add Stock",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="stock-assign"
        options={{
          title: "Assign Stock",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="warehouse-users"
        options={{
          title: "Warehouse Users",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sales-targets"
        options={{
          title: "Sales Targets",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="activity"
        options={{
          title: "Activity Log",
          headerLeft: backButton,
          headerShown: false,
        }}
      />
    </Stack>
  );
}

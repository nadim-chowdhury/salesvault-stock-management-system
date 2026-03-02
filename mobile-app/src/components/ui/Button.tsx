import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Colors,
  BorderRadius,
  FontSize,
  FontWeight,
  Spacing,
} from "../../constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = true,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "secondary":
        return {
          backgroundColor: colors.surfaceSecondary,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case "danger":
        return { backgroundColor: colors.danger };
      case "ghost":
        return { backgroundColor: "transparent" };
      default:
        return { backgroundColor: colors.primary };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case "secondary":
        return colors.text;
      case "ghost":
        return colors.primary;
      default:
        return "#FFFFFF";
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case "sm":
        return { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg };
      case "lg":
        return {
          paddingVertical: Spacing.lg + 2,
          paddingHorizontal: Spacing["2xl"],
        };
      default:
        return {
          paddingVertical: Spacing.md + 2,
          paddingHorizontal: Spacing.xl,
        };
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.base,
        getVariantStyle(),
        getSizeStyle(),
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: size === "sm" ? FontSize.sm : FontSize.md,
              },
              icon ? { marginLeft: Spacing.sm } : undefined,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: FontWeight.semibold,
  },
});

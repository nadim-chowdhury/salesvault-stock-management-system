import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDrawerStore } from "../../stores/drawer-store";
import { useAuthStore } from "../../stores/auth-store";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from "../../constants/theme";

const { width } = Dimensions.get("window");
const DRAWER_WIDTH = width * 0.8;

export default function QuickActionDrawer() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const router = useRouter();
  const { isOpen, closeDrawer } = useDrawerStore();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [isRendered, setIsRendered] = React.useState(isOpen);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsRendered(false);
      });
    }
  }, [isOpen]);

  const handleNavigate = (path: string) => {
    closeDrawer();
    // Use setTimeout to allow drawer to close before navigating
    setTimeout(() => {
      router.push(path as any);
    }, 300);
  };

  const handleLogout = () => {
    closeDrawer();
    logout();
  };

  if (!isRendered) return null;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={isOpen ? "auto" : "none"}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayOpacity,
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      {/* Drawer Content */}
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: colors.surface,
            transform: [{ translateX }],
          },
        ]}
      >
        <View
          style={[styles.header, { borderBottomColor: colors.borderLight }]}
        >
          <View
            style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}
          >
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(user?.name || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text
              style={[styles.userName, { color: colors.text }]}
              numberOfLines={1}
            >
              {user?.name || "User"}
            </Text>
            <Text style={[styles.userRole, { color: colors.textMuted }]}>
              {user?.role}
            </Text>
          </View>
          <TouchableOpacity onPress={closeDrawer} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.menuContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            Quick Actions
          </Text>

          <DrawerItem
            icon="add-circle-outline"
            label="Create Sale"
            onPress={() => handleNavigate("/(app)/sales/create")}
            colors={colors}
          />

          <DrawerItem
            icon="bar-chart-outline"
            label="Daily Sales Report"
            onPress={() => handleNavigate("/(app)/sales/daily-sales")}
            colors={colors}
          />

          <DrawerItem
            icon="trophy-outline"
            label="Sales Targets"
            onPress={() => handleNavigate("/(app)/sales/sales-targets")}
            colors={colors}
          />

          {isAdmin && (
            <>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.borderLight },
                ]}
              />
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                Management
              </Text>

              <DrawerItem
                icon="checkmark-done-outline"
                label="Sale Approvals"
                onPress={() => handleNavigate("/(app)/sales/sales-approvals")}
                colors={colors}
              />

              <DrawerItem
                icon="layers-outline"
                label="Stock Management"
                onPress={() => handleNavigate("/(app)/stock")}
                colors={colors}
              />

              <DrawerItem
                icon="people-circle-outline"
                label="Warehouse Users"
                onPress={() => handleNavigate("/(app)/profile/warehouse-users")}
                colors={colors}
              />

              <DrawerItem
                icon="people-outline"
                label="User Management"
                onPress={() => handleNavigate("/(app)/profile/users")}
                colors={colors}
              />
            </>
          )}

          <View
            style={[styles.divider, { backgroundColor: colors.borderLight }]}
          />

          <DrawerItem
            icon="time-outline"
            label="Activity Log"
            onPress={() => handleNavigate("/(app)/profile/activity")}
            colors={colors}
          />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

function DrawerItem({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={styles.drawerItem}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View
        style={[styles.itemIcon, { backgroundColor: colors.primary + "10" }]}
      >
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={[styles.itemLabel, { color: colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    zIndex: 1000,
    elevation: 10,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 44,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  userRole: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  menuContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginVertical: Spacing.md,
    marginLeft: Spacing.xs,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: 4,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  itemLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.lg,
    marginHorizontal: Spacing.sm,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 40 : Spacing.lg,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.sm,
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});

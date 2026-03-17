import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from "../../constants/theme";

interface SearchableItem {
  id: string;
  name: string;
  subtitle?: string;
  rightText?: string;
  isDangerRightText?: boolean;
}

interface SearchableModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: any) => void;
  items: any[];
  title: string;
  placeholder?: string;
  mapItem: (item: any) => SearchableItem;
}

export default function SearchableModal({
  visible,
  onClose,
  onSelect,
  items,
  title,
  placeholder = "Search...",
  mapItem,
}: SearchableModalProps) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => {
      const mapped = mapItem(item);
      return (
        mapped.name.toLowerCase().includes(q) ||
        (mapped.subtitle && mapped.subtitle.toLowerCase().includes(q))
      );
    });
  }, [items, search, mapItem]);

  const handleSelect = (item: any) => {
    setSearch("");
    onSelect(item);
  };

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  const renderItem = ({ item }: { item: any }) => {
    const mapped = mapItem(item);
    return (
      <TouchableOpacity
        style={[styles.item, { borderBottomColor: colors.borderLight }]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemContent}>
          <Text style={[styles.itemName, { color: colors.text }]}>
            {mapped.name}
          </Text>
          {mapped.subtitle ? (
            <Text style={[styles.itemSubtitle, { color: colors.textMuted }]}>
              {mapped.subtitle}
            </Text>
          ) : null}
        </View>
        {mapped.rightText ? (
          <Text
            style={[
              styles.itemRight,
              {
                color: mapped.isDangerRightText
                  ? colors.danger
                  : colors.success,
              },
            ]}
          >
            {mapped.rightText}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[styles.header, { borderBottomColor: colors.borderLight }]}
          >
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <View style={styles.spacer} />
          </View>

          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={placeholder}
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus={false}
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ color: colors.textMuted }}>
                  No results found
                </Text>
              </View>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  closeBtn: { padding: Spacing.sm },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    flex: 1,
    textAlign: "center",
  },
  spacer: { width: 44 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.md,
  },
  list: { paddingBottom: Spacing.xl },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 0.5,
  },
  itemContent: { flex: 1 },
  itemName: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  itemSubtitle: { fontSize: FontSize.xs, marginTop: 4 },
  itemRight: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    marginLeft: Spacing.md,
  },
  empty: { padding: Spacing.xl, alignItems: "center" },
});

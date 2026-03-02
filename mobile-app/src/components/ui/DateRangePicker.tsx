import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadow,
} from "../../constants/theme";

type Preset = "all" | "today" | "7d" | "30d" | "custom";

interface DateRangePickerProps {
  fromDate: string | null;
  toDate: string | null;
  onApply: (from: string | null, to: string | null) => void;
}

function formatDisplay(from: string | null, to: string | null): string {
  if (!from && !to) return "All time";
  const fmt = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  };
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  return `Until ${fmt(to!)}`;
}

function getPreset(from: string | null, to: string | null): Preset {
  if (!from && !to) return "all";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (from && to) {
    const f = new Date(from);
    const t = new Date(to);
    const fDay = new Date(f.getFullYear(), f.getMonth(), f.getDate());
    const tDay = new Date(t.getFullYear(), t.getMonth(), t.getDate());

    if (
      fDay.getTime() === today.getTime() &&
      tDay.getTime() === tomorrow.getTime()
    )
      return "today";

    const d7 = new Date(today);
    d7.setDate(d7.getDate() - 6);
    if (
      fDay.getTime() === d7.getTime() &&
      tDay.getTime() === tomorrow.getTime()
    )
      return "7d";

    const d30 = new Date(today);
    d30.setDate(d30.getDate() - 29);
    if (
      fDay.getTime() === d30.getTime() &&
      tDay.getTime() === tomorrow.getTime()
    )
      return "30d";
  }
  return "custom";
}

export default function DateRangePicker({
  fromDate,
  toDate,
  onApply,
}: DateRangePickerProps) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const [showModal, setShowModal] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const activePreset = getPreset(fromDate, toDate);
  const hasRange = fromDate || toDate;

  const applyPreset = (preset: Preset) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (preset) {
      case "all":
        onApply(null, null);
        break;
      case "today":
        onApply(today.toISOString(), tomorrow.toISOString());
        break;
      case "7d": {
        const d7 = new Date(today);
        d7.setDate(d7.getDate() - 6);
        onApply(d7.toISOString(), tomorrow.toISOString());
        break;
      }
      case "30d": {
        const d30 = new Date(today);
        d30.setDate(d30.getDate() - 29);
        onApply(d30.toISOString(), tomorrow.toISOString());
        break;
      }
      case "custom":
        setCustomFrom(fromDate ? fromDate.slice(0, 10) : "");
        setCustomTo(toDate ? toDate.slice(0, 10) : "");
        setShowModal(true);
        return;
    }
  };

  const applyCustom = () => {
    const from = customFrom.trim()
      ? new Date(customFrom.trim()).toISOString()
      : null;
    const to = customTo.trim()
      ? new Date(customTo.trim() + "T23:59:59").toISOString()
      : null;
    onApply(from, to);
    setShowModal(false);
  };

  const presets: {
    label: string;
    value: Preset;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { label: "All", value: "all", icon: "ellipse-outline" },
    { label: "Today", value: "today", icon: "today-outline" },
    { label: "7 Days", value: "7d", icon: "calendar-outline" },
    { label: "30 Days", value: "30d", icon: "calendar-outline" },
    { label: "Custom", value: "custom", icon: "options-outline" },
  ];

  return (
    <>
      <View style={styles.container}>
        {/* Date display label */}
        {hasRange && (
          <View style={styles.labelRow}>
            <Ionicons name="calendar" size={13} color={colors.primary} />
            <Text style={[styles.labelText, { color: colors.primary }]}>
              {formatDisplay(fromDate, toDate)}
            </Text>
            <TouchableOpacity
              onPress={() => onApply(null, null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close-circle"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Preset chips */}
        <View style={styles.chipRow}>
          {presets.map((p) => {
            const isActive = activePreset === p.value;
            return (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? colors.primary + "15"
                      : colors.surfaceSecondary,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => applyPreset(p.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={p.icon}
                  size={12}
                  color={isActive ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.chipText,
                    { color: isActive ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Custom Date Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View
            style={[
              styles.modal,
              Shadow.lg,
              { backgroundColor: colors.surface },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Custom Date Range
            </Text>
            <Text style={[styles.modalHint, { color: colors.textMuted }]}>
              Format: YYYY-MM-DD
            </Text>

            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  From
                </Text>
                <TextInput
                  style={[
                    styles.dateInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="2026-01-01"
                  placeholderTextColor={colors.textMuted}
                  value={customFrom}
                  onChangeText={setCustomFrom}
                  maxLength={10}
                  keyboardType={
                    Platform.OS === "ios"
                      ? "numbers-and-punctuation"
                      : "default"
                  }
                />
              </View>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={colors.textMuted}
                style={{ marginTop: 20 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  To
                </Text>
                <TextInput
                  style={[
                    styles.dateInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="2026-12-31"
                  placeholderTextColor={colors.textMuted}
                  value={customTo}
                  onChangeText={setCustomTo}
                  maxLength={10}
                  keyboardType={
                    Platform.OS === "ios"
                      ? "numbers-and-punctuation"
                      : "default"
                  }
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => setShowModal(false)}
              >
                <Text
                  style={[styles.modalBtnText, { color: colors.textSecondary }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  { backgroundColor: colors.primary },
                ]}
                onPress={applyCustom}
              >
                <Text style={[styles.modalBtnText, { color: "#FFF" }]}>
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  labelText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  chipRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modal: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  modalHint: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.lg,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.xs,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  modalBtnPrimary: {
    borderWidth: 0,
  },
  modalBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});

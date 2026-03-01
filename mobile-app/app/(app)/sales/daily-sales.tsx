import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../src/services/api";
import { Endpoints } from "../../../src/constants/api";
import { useAuthStore } from "../../../src/stores/auth-store";
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadow,
} from "../../../src/constants/theme";
import PageHeader from "../../../src/components/ui/PageHeader";

export default function DailySalesReportScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [date, setDate] = useState(new Date());
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salespersonId, setSalespersonId] = useState<string | null>(null);
  const [salespersons, setSalespersons] = useState<any[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [customDate, setCustomDate] = useState("");

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        date: date.toISOString().split("T")[0],
      };
      if (salespersonId) {
        params.salesperson_id = salespersonId;
      }
      const response = await api.get(Endpoints.SALES_DAILY_REPORT, { params });
      setReportData(response.data?.data || response.data || []);
    } catch (err) {
      console.error("Daily report fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, salespersonId]);

  const fetchSalespersons = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await api.get(Endpoints.USERS, {
        params: { role: "SALESPERSON", limit: 100 },
      });
      const result = response.data?.data || response.data;
      setSalespersons(result?.data || result?.items || []);
    } catch (err) {
      console.error("Fetch salespersons error:", err);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    fetchSalespersons();
  }, [fetchSalespersons]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReport();
  };

  const changeDate = (days: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    setDate(newDate);
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const applyCustomDate = () => {
    if (!customDate.trim()) return;
    const newDate = new Date(customDate.trim());
    if (isNaN(newDate.getTime())) {
      alert("Invalid date format. Please use YYYY-MM-DD");
      return;
    }
    setDate(newDate);
    setShowDateModal(false);
  };

  const totalQty = reportData.reduce(
    (sum, item) => sum + item.total_quantity,
    0,
  );
  const totalAmt = reportData.reduce((sum, item) => sum + item.total_amount, 0);

  const renderItem = ({ item }: { item: any }) => (
    <View
      style={[
        styles.card,
        Shadow.sm,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.productName, { color: colors.text }]}>
          {item.product_name}
        </Text>
        <Text style={[styles.sku, { color: colors.textMuted }]}>
          {item.sku}
        </Text>
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            Units Sold
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {item.total_quantity}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            Total Amount
          </Text>
          <Text
            style={[
              styles.statValue,
              { color: colors.primary, fontWeight: FontWeight.bold },
            ]}
          >
            ৳{item.total_amount.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.primary }]}
      edges={["top"]}
    >
      <PageHeader title="Daily Sales Report" showBack />

      <View style={[styles.mainContent, { backgroundColor: colors.surface }]}>
        {/* Date Selector */}
        <View
          style={[styles.datePicker, { borderBottomColor: colors.borderLight }]}
        >
          <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateInfo}
            onPress={() => {
              setCustomDate(date.toISOString().split("T")[0]);
              setShowDateModal(true);
            }}
          >
            <Text style={[styles.dateText, { color: colors.text }]}>
              {formatDate(date)}
            </Text>
            <View style={styles.dateSubRow}>
              {date.toDateString() === new Date().toDateString() && (
                <Text style={[styles.todayBadge, { color: colors.primary }]}>
                  Today
                </Text>
              )}
              <Ionicons
                name="calendar-outline"
                size={14}
                color={colors.primary}
                style={{ marginLeft: 4 }}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => changeDate(1)}
            style={styles.dateBtn}
            disabled={date.toDateString() === new Date().toDateString()}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={
                date.toDateString() === new Date().toDateString()
                  ? colors.textMuted
                  : colors.primary
              }
            />
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
        <Modal
          visible={showDateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDateModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDateModal(false)}
          >
            <View
              style={[styles.dateModal, { backgroundColor: colors.surface }]}
              onStartShouldSetResponder={() => true}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select Specific Date
              </Text>
              <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                Format: YYYY-MM-DD
              </Text>

              <TextInput
                style={[
                  styles.modalInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
                value={customDate}
                onChangeText={setCustomDate}
                placeholder="2026-03-01"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={10}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { borderColor: colors.border }]}
                  onPress={() => setShowDateModal(false)}
                >
                  <Text style={{ color: colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    styles.modalBtnPrimary,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={applyCustomDate}
                >
                  <Text style={{ color: "#FFF", fontWeight: "bold" }}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Admin Filter */}
        {isAdmin && (
          <View style={styles.filterSection}>
            <TouchableOpacity
              style={[
                styles.userPicker,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowUserPicker(!showUserPicker)}
            >
              <Ionicons name="person-outline" size={18} color={colors.primary} />
              <Text style={[styles.userPickerText, { color: colors.text }]}>
                {salespersonId
                  ? salespersons.find((s) => s.id === salespersonId)?.name ||
                    "Selected Salesperson"
                  : "All Salespersons"}
              </Text>
              <Ionicons
                name={showUserPicker ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {showUserPicker && (
              <View
                style={[
                  styles.userDropdown,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <TouchableOpacity
                  style={styles.userItem}
                  onPress={() => {
                    setSalespersonId(null);
                    setShowUserPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.userItemText,
                      !salespersonId && {
                        color: colors.primary,
                        fontWeight: FontWeight.bold,
                      },
                    ]}
                  >
                    All Salespersons
                  </Text>
                </TouchableOpacity>
                {salespersons.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.userItem}
                    onPress={() => {
                      setSalespersonId(s.id);
                      setShowUserPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.userItemText,
                        salespersonId === s.id && {
                          color: colors.primary,
                          fontWeight: FontWeight.bold,
                        },
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Summary Ribbon */}
        {!loading && reportData.length > 0 && (
          <View
            style={[styles.summary, { backgroundColor: colors.primary + "10" }]}
          >
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                Total Qty
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {totalQty}
              </Text>
            </View>
            <View
              style={[styles.divider, { backgroundColor: colors.borderLight }]}
            />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                Total Revenue
              </Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                ৳{totalAmt.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={reportData}
            renderItem={renderItem}
            keyExtractor={(item) => item.product_id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons
                  name="bar-chart-outline"
                  size={48}
                  color={colors.textMuted}
                />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No sales data for this day
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContent: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  datePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  dateBtn: {
    padding: Spacing.sm,
  },
  dateInfo: {
    alignItems: "center",
  },
  dateText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  todayBadge: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase",
  },
  dateSubRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  dateModal: {
    width: "100%",
    maxWidth: 320,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    ...Shadow.lg,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  modalLabel: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    marginBottom: Spacing.xl,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    borderWidth: 1,
  },
  modalBtnPrimary: {
    borderWidth: 0,
  },
  filterSection: {
    padding: Spacing.lg,
    zIndex: 10,
  },
  userPicker: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  userPickerText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  userDropdown: {
    position: "absolute",
    top: Spacing.lg + 54,
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    zIndex: 20,
    ...Shadow.md,
  },
  userItem: {
    padding: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  userItemText: {
    fontSize: FontSize.sm,
  },
  summary: {
    flexDirection: "row",
    margin: Spacing.lg,
    marginTop: 0,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  divider: {
    width: 1,
    height: 30,
    marginHorizontal: Spacing.md,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["5xl"],
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    marginBottom: Spacing.md,
  },
  productName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  sku: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#eee",
    paddingTop: Spacing.md,
  },
  stat: {
    alignItems: "flex-start",
  },
  statLabel: {
    fontSize: FontSize.xs,
    marginBottom: 2,
  },
  statValue: {
    fontSize: FontSize.md,
  },
  empty: {
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: {
    fontSize: FontSize.md,
    marginTop: Spacing.md,
  },
});

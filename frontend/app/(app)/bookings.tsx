import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { api, Booking, Forfait } from "@/src/api/client";
import { colors, spacing, radius, fontSizes } from "@/src/theme";
import { useAuth } from "@/src/context/auth";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmée",
  pending: "En attente",
  cancelled: "Annulée",
  attended: "Présent",
};

const STATUS_COLOR: Record<string, string> = {
  confirmed: "#38A169",
  pending: "#DD6B20",
  cancelled: "#E53E3E",
  attended: "#7FA15D",
};

function formatDateTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatExpiry(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const CAT_LABELS: Record<string, string> = {
  yoga: "Yoga",
  pilates: "Pilates",
  massage: "Massages",
};

export default function Bookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [forfaits, setForfaits] = useState<Forfait[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const [message, setMessage] = useState<{ text: string; kind: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    try {
      const [b, f] = await Promise.all([
        api.myBookings(),
        user?.role === "client" ? api.myForfaits().catch(() => []) : Promise.resolve([]),
      ]);
      setBookings(b);
      setForfaits(f);
    } catch (e: any) {
      setMessage({ text: e?.message || "Erreur de chargement", kind: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const now = Date.now();
  const filtered = bookings.filter((b) => {
    const t = b.class_snapshot?.starts_at ? new Date(b.class_snapshot.starts_at).getTime() : 0;
    const isUpcoming = t >= now - 3600 * 1000 && b.status !== "cancelled";
    return tab === "upcoming" ? isUpcoming : !isUpcoming;
  });

  const cancel = async (id: string) => {
    setMessage(null);
    try {
      await api.cancelBooking(id);
      setMessage({ text: "Réservation annulée", kind: "success" });
      await load();
    } catch (e: any) {
      setMessage({ text: e?.message || "Erreur", kind: "error" });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes Réservations</Text>
      </View>

      {user?.role === "client" && forfaits.length > 0 && (
        <View style={styles.forfaitsSection}>
          <Text style={styles.sectionOverline}>MES FORFAITS ACTIFS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.forfaitsRow}
          >
            {forfaits.map((f) => {
              const low = f.remaining_classes <= 2 && f.remaining_classes > 0;
              const empty = f.remaining_classes <= 0;
              const exp = formatExpiry(f.expires_at);
              return (
                <View
                  key={f.id}
                  testID={`forfait-mine-${f.id}`}
                  style={[
                    styles.forfaitCard,
                    empty && { opacity: 0.6 },
                    low && { borderColor: colors.warning },
                  ]}
                >
                  <View style={styles.forfaitTop}>
                    <Ionicons name="ticket-outline" size={18} color={colors.primary} />
                    {low && !empty && (
                      <View style={styles.warnPill}>
                        <Text style={styles.warnPillText}>Bientôt épuisé</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.forfaitName} numberOfLines={1}>{f.name}</Text>
                  <Text style={styles.forfaitCat}>
                    {f.category ? CAT_LABELS[f.category] || f.category : "Tous cours"}
                  </Text>
                  <View style={styles.forfaitBalance}>
                    <Text style={styles.forfaitBalanceNum}>{f.remaining_classes}</Text>
                    <Text style={styles.forfaitBalanceUnit}>/ {f.total_classes} séances</Text>
                  </View>
                  {exp && (
                    <Text style={styles.forfaitExp}>Expire le {exp}</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.tabs}>
        <TouchableOpacity
          testID="tab-upcoming"
          onPress={() => setTab("upcoming")}
          style={[styles.tab, tab === "upcoming" && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === "upcoming" && styles.tabTextActive]}>À venir</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="tab-history"
          onPress={() => setTab("history")}
          style={[styles.tab, tab === "history" && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>Historique</Text>
        </TouchableOpacity>
      </View>

      {message && (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: message.kind === "success" ? "#E6F4EA" : "#FDECEA",
              borderColor: message.kind === "success" ? colors.success : colors.error,
            },
          ]}
        >
          <Text style={{ color: message.kind === "success" ? colors.success : colors.error }}>
            {message.text}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bookmark-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            {tab === "upcoming" ? "Aucune réservation à venir" : "Aucun historique"}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary}
            />
          }
        >
          {filtered.map((b) => (
            <View key={b.id} style={styles.card} testID={`booking-card-${b.id}`}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{b.class_snapshot?.title || "Cours"}</Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: `${STATUS_COLOR[b.status]}20`, borderColor: STATUS_COLOR[b.status] },
                  ]}
                >
                  <Text style={[styles.statusText, { color: STATUS_COLOR[b.status] }]}>
                    {STATUS_LABEL[b.status]}
                  </Text>
                </View>
              </View>
              <Text style={styles.meta}>
                <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                {"  "}{formatDateTime(b.class_snapshot?.starts_at)}
              </Text>
              {b.class_snapshot?.instructor ? (
                <Text style={styles.meta}>
                  <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
                  {"  "}avec {b.class_snapshot.instructor}
                </Text>
              ) : null}

              {tab === "upcoming" && b.status !== "cancelled" && b.status !== "attended" && (
                <TouchableOpacity
                  testID={`cancel-booking-${b.id}`}
                  onPress={() => cancel(b.id)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Annuler la réservation</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: fontSizes.xxl, color: colors.textPrimary, fontWeight: "500" },
  forfaitsSection: { marginBottom: spacing.md },
  sectionOverline: {
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    color: colors.textSecondary,
    fontWeight: "600",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  forfaitsRow: {
    paddingHorizontal: spacing.lg,
    gap: 10,
  },
  forfaitCard: {
    width: 200,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    marginRight: 10,
  },
  forfaitTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  warnPill: {
    backgroundColor: `${colors.warning}20`,
    borderColor: colors.warning,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  warnPillText: { color: colors.warning, fontSize: 10, fontWeight: "600" },
  forfaitName: { color: colors.textPrimary, fontWeight: "600", fontSize: fontSizes.md },
  forfaitCat: { color: colors.textSecondary, fontSize: fontSizes.xs, marginTop: 2 },
  forfaitBalance: { flexDirection: "row", alignItems: "baseline", marginTop: spacing.sm, gap: 6 },
  forfaitBalanceNum: { color: colors.primary, fontSize: 28, fontWeight: "700" },
  forfaitBalanceUnit: { color: colors.textSecondary, fontSize: fontSizes.sm },
  forfaitExp: { color: colors.textSecondary, fontSize: fontSizes.xs, marginTop: 4 },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginBottom: spacing.md,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textPrimary, fontSize: fontSizes.sm },
  tabTextActive: { color: "#fff", fontWeight: "600" },
  banner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyText: { color: colors.textSecondary, marginTop: spacing.md },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: fontSizes.md, color: colors.textPrimary, fontWeight: "500", flex: 1 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusText: { fontSize: fontSizes.xs, fontWeight: "600" },
  meta: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 4 },
  cancelBtn: {
    marginTop: spacing.md,
    padding: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: "center",
  },
  cancelBtnText: { color: colors.error, fontWeight: "600" },
});

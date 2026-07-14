import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { api, ClassItem } from "@/src/api/client";
import { colors, spacing, radius, fontSizes, images, texts } from "@/src/theme";
import { useAuth } from "@/src/context/auth";
import { formatFrenchTime } from "@/src/utils/date";

const CATEGORIES_KEYS = [
  { key: "all", labelKey: "calendarFilterAll" as const },
  { key: "yoga", labelKey: "calendarFilterYoga" as const },
  { key: "pilates", labelKey: "calendarFilterPilates" as const },
];

const FR_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const FR_MONTHS_SHORT = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
];
const FR_DAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
// Grid header starting Monday (French convention)
const FR_GRID = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function categoryImage(cat: string) {
  if (cat === "yoga") return images.yoga;
  if (cat === "pilates") return images.pilates;
  if (cat === "massage") return images.massage;
  return images.loginHero;
}

// Build 6x7 grid of Date objects for a given month (weeks start Monday)
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // JS getDay() Sunday=0..Sat=6; we want Monday=0..Sun=6
  const jsDow = first.getDay();
  const shift = (jsDow + 6) % 7;
  const start = new Date(year, month, 1 - shift);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export default function Calendar() {
  const router = useRouter();
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [monthCursor, setMonthCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await api.listClasses();
      const now = Date.now();
      const upcoming = list.filter((c) => new Date(c.starts_at).getTime() >= now - 60 * 60 * 1000);
      setClasses(upcoming);
    } catch (e: any) {
      setMessage({ text: e?.message || "Erreur de chargement", kind: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh whenever the calendar tab regains focus so newly created classes
  // (from the admin tab) show up without needing a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    if (filter === "all") return classes;
    return classes.filter((c) => c.category === filter);
  }, [classes, filter]);

  // Set of "y-m-d" for days with at least one class (respecting filter)
  const daysWithClasses = useMemo(() => {
    const s = new Set<string>();
    filtered.forEach((c) => {
      const d = new Date(c.starts_at);
      s.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return s;
  }, [filtered]);

  const monthGrid = useMemo(
    () => buildMonthGrid(monthCursor.getFullYear(), monthCursor.getMonth()),
    [monthCursor],
  );

  const classesForSelectedDay = useMemo(
    () => filtered.filter((c) => sameDay(new Date(c.starts_at), selectedDate)),
    [filtered, selectedDate],
  );

  const book = async (cls: ClassItem) => {
    setBookingId(cls.id);
    setMessage(null);
    try {
      const b = await api.createBooking(cls.id);
      setMessage({
        text:
          b.status === "pending"
            ? "Demande envoyée ! En attente de confirmation."
            : "Réservation confirmée !",
        kind: "success",
      });
      await load();
    } catch (e: any) {
      setMessage({ text: e?.message || "Erreur de réservation", kind: "error" });
    } finally {
      setBookingId(null);
    }
  };

  const changeMonth = (delta: number) => {
    setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + delta, 1));
  };

  const today = new Date();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.overline}>{texts.calendarWelcomePrefix} {user?.name?.toUpperCase() || ""}</Text>
          <Text style={styles.title}>{texts.calendarTitle}</Text>
        </View>
      </View>

      <View style={styles.chipsRow}>
        {CATEGORIES_KEYS.map((c) => {
          const active = filter === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              testID={`filter-${c.key}`}
              onPress={() => setFilter(c.key)}
              style={[
                styles.chip,
                active && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.chipText, active && { color: "#fff" }]}>{texts[c.labelKey]}</Text>
            </TouchableOpacity>
          );
        })}
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
          <View style={styles.monthHeader}>
            <TouchableOpacity testID="month-prev" onPress={() => changeMonth(-1)} style={styles.monthNavBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {FR_MONTHS[monthCursor.getMonth()]} {monthCursor.getFullYear()}
            </Text>
            <TouchableOpacity testID="month-next" onPress={() => changeMonth(1)} style={styles.monthNavBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.gridHeaderRow}>
            {FR_GRID.map((d) => (
              <Text key={d} style={styles.gridHeaderCell}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {monthGrid.map((d, idx) => {
              const inMonth = d.getMonth() === monthCursor.getMonth();
              const isToday = sameDay(d, today);
              const isSelected = sameDay(d, selectedDate);
              const hasClasses = daysWithClasses.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
              return (
                <TouchableOpacity
                  key={idx}
                  testID={`day-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
                  onPress={() => setSelectedDate(d)}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: colors.primary },
                    !isSelected && isToday && { borderColor: colors.primary, borderWidth: 1.5 },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !inMonth && { color: colors.border },
                      isSelected && { color: "#fff", fontWeight: "600" },
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                  {hasClasses && (
                    <View
                      style={[
                        styles.dayDot,
                        { backgroundColor: isSelected ? "#fff" : colors.primary },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.dayHeader}>
            {FR_DAYS_SHORT[selectedDate.getDay()]} {selectedDate.getDate()} {FR_MONTHS_SHORT[selectedDate.getMonth()]}
          </Text>

          {classesForSelectedDay.length === 0 ? (
            <View style={{ padding: spacing.lg, alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary }}>Aucun cours ce jour</Text>
            </View>
          ) : (
            classesForSelectedDay.map((cls) => (
              <ClassCard
                key={cls.id}
                cls={cls}
                isClient={user?.role === "client"}
                bookingId={bookingId}
                onBook={() => book(cls)}
                onOpen={() => router.push({ pathname: "/(app)/class/[id]", params: { id: cls.id } })}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ClassCard({
  cls,
  isClient,
  bookingId,
  onBook,
  onOpen,
}: {
  cls: ClassItem;
  isClient: boolean;
  bookingId: string | null;
  onBook: () => void;
  onOpen: () => void;
}) {
  const spotsLeft = cls.capacity - cls.booked_count;
  const isFull = spotsLeft <= 0;
  return (
    <TouchableOpacity
      style={styles.card}
      testID={`class-card-${cls.id}`}
      activeOpacity={0.85}
      onPress={onOpen}
    >
      <Image source={{ uri: cls.image || categoryImage(cls.category) }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.timePill}>
            <Text style={styles.timePillText}>{formatFrenchTime(cls.starts_at)}</Text>
          </View>
          <View
            style={[
              styles.kindPill,
              { backgroundColor: cls.kind === "private" ? colors.accentSand : colors.surface },
            ]}
          >
            <Text style={styles.kindPillText}>{cls.kind === "private" ? "Privé" : "Groupe"}</Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>{cls.title}</Text>
        {cls.instructor ? (
          <Text style={styles.cardMeta}>avec {cls.instructor} · {cls.duration_minutes} min</Text>
        ) : (
          <Text style={styles.cardMeta}>{cls.duration_minutes} min</Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={[styles.spots, isFull && { color: colors.error }]}>
            {isFull ? "Complet" : `${spotsLeft} places disponibles`}
          </Text>
          {isClient && (
            <TouchableOpacity
              testID={`book-btn-${cls.id}`}
              disabled={isFull || bookingId === cls.id}
              onPress={onBook}
              style={[styles.bookBtn, (isFull || bookingId === cls.id) && { opacity: 0.5 }]}
            >
              <Text style={styles.bookBtnText}>{bookingId === cls.id ? "..." : "Réserver"}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overline: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: { fontSize: fontSizes.xxl, color: colors.textPrimary, fontWeight: "500" },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewToggle: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  togglePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  togglePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { color: colors.textPrimary, fontSize: fontSizes.sm, fontWeight: "500" },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipsContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginRight: 8,
  },
  chipText: { color: colors.textPrimary, fontSize: fontSizes.sm },
  banner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyTitle: {
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    marginTop: spacing.md,
    fontWeight: "500",
  },
  emptyHint: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  group: { marginBottom: spacing.lg },
  dayHeader: {
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    fontWeight: "600",
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  gridHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  gridHeaderCell: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  dayText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  dayDot: {
    position: "absolute",
    bottom: 6,
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  cardImage: { width: "100%", height: 140 },
  cardContent: { padding: spacing.md },
  cardHeaderRow: { flexDirection: "row", gap: 8, marginBottom: spacing.sm },
  timePill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  timePillText: { color: "#fff", fontSize: fontSizes.xs, fontWeight: "600" },
  kindPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kindPillText: { color: colors.textPrimary, fontSize: fontSizes.xs, fontWeight: "500" },
  cardTitle: { fontSize: fontSizes.lg, color: colors.textPrimary, fontWeight: "500" },
  cardMeta: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
  },
  spots: { fontSize: fontSizes.sm, color: colors.primary, fontWeight: "600" },
  bookBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  bookBtnText: { color: "#fff", fontWeight: "600" },
});

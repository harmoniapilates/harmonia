import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/src/api/client";
import { colors, spacing, radius, fontSizes } from "@/src/theme";
import { formatFrenchDateTime } from "@/src/utils/date";

type Msg = { text: string; kind: "success" | "error" };
type Kind = "classes" | "forfaits";

type ArchivedClass = {
  id: string;
  title: string;
  category: string;
  kind: string;
  starts_at: string;
  duration_minutes: number;
  instructor: string;
  archived_at: string;
  attendees: { id: string; name: string; email: string; status: string }[];
};

type ArchivedForfaitGroup = {
  user_id: string;
  user_name: string;
  user_email: string;
  forfaits: {
    id: string;
    name: string;
    category: string | null;
    total_classes: number;
    remaining_classes: number;
    created_at: string;
    archived_at: string;
    expires_at: string | null;
    consumed_bookings: {
      booking_id: string;
      class_title: string;
      category: string;
      starts_at: string;
      attended_at: string;
    }[];
  }[];
};

export default function ArchivesPanel({ onMessage }: { onMessage: (m: Msg) => void }) {
  const [kind, setKind] = useState<Kind>("classes");
  const [classes, setClasses] = useState<ArchivedClass[]>([]);
  const [forfaitGroups, setForfaitGroups] = useState<ArchivedForfaitGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClass, setExpandedClass] = useState<Record<string, boolean>>({});
  const [expandedForfait, setExpandedForfait] = useState<Record<string, boolean>>({});
  const [expandedUser, setExpandedUser] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cls, fs] = await Promise.all([
        api.listArchivedClasses(),
        api.listArchivedForfaits(),
      ]);
      setClasses(cls);
      setForfaitGroups(fs);
    } catch (e: any) {
      onMessage({ text: e?.message || "Erreur de chargement", kind: "error" });
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    load();
  }, [load]);

  const restoreClass = async (id: string) => {
    try {
      await api.restoreClass(id);
      onMessage({ text: "Cours restauré. Il apparaît de nouveau dans l'onglet Cours.", kind: "success" });
      await load();
    } catch (e: any) {
      onMessage({ text: e?.message || "Erreur", kind: "error" });
    }
  };

  const restoreForfait = async (id: string) => {
    try {
      await api.restoreForfait(id);
      onMessage({ text: "Forfait restauré et réactivé", kind: "success" });
      await load();
    } catch (e: any) {
      onMessage({ text: e?.message || "Erreur", kind: "error" });
    }
  };

  return (
    <View>
      <View style={styles.tabsRow}>
        <TouchableOpacity
          testID="archives-tab-classes"
          onPress={() => setKind("classes")}
          style={[styles.tab, kind === "classes" && styles.tabActive]}
        >
          <Text style={[styles.tabText, kind === "classes" && styles.tabTextActive]}>
            Cours archivés ({classes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="archives-tab-forfaits"
          onPress={() => setKind("forfaits")}
          style={[styles.tab, kind === "forfaits" && styles.tabActive]}
        >
          <Text style={[styles.tabText, kind === "forfaits" && styles.tabTextActive]}>
            Forfaits archivés ({forfaitGroups.reduce((n, g) => n + g.forfaits.length, 0)})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : kind === "classes" ? (
        classes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="archive-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Aucun cours archivé</Text>
          </View>
        ) : (
          classes.map((c) => {
            const open = expandedClass[c.id];
            const attendedList = c.attendees.filter((a) => a.status === "attended");
            return (
              <View key={c.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{c.title}</Text>
                    <Text style={styles.meta}>{formatFrenchDateTime(c.starts_at)}</Text>
                    <Text style={styles.meta}>
                      {c.category} · {c.attendees.length} inscrit(s) · {attendedList.length} présent(s)
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  testID={`toggle-archived-class-${c.id}`}
                  onPress={() => setExpandedClass((p) => ({ ...p, [c.id]: !p[c.id] }))}
                  style={styles.expandBtn}
                >
                  <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.expandText}>
                    {open ? "Masquer les participants" : "Voir les participants"}
                  </Text>
                </TouchableOpacity>

                {open && (
                  <View style={styles.attendeeList}>
                    {c.attendees.map((a) => (
                      <View key={a.id} style={styles.attendeeItem}>
                        <View
                          style={[
                            styles.statusDot,
                            {
                              backgroundColor:
                                a.status === "attended"
                                  ? colors.success
                                  : a.status === "confirmed"
                                  ? colors.primary
                                  : colors.textSecondary,
                            },
                          ]}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.attName}>{a.name}</Text>
                          <Text style={styles.attMeta}>
                            {a.email} · {a.status === "attended" ? "présent" : a.status}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  testID={`restore-class-${c.id}`}
                  onPress={() => restoreClass(c.id)}
                  style={styles.restoreBtn}
                >
                  <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                  <Text style={styles.restoreText}>Restaurer</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )
      ) : forfaitGroups.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="archive-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Aucun forfait archivé</Text>
        </View>
      ) : (
        forfaitGroups.map((g) => {
          const open = expandedUser[g.user_id];
          return (
            <View key={g.user_id} style={styles.card}>
              <TouchableOpacity
                testID={`toggle-user-${g.user_id}`}
                onPress={() => setExpandedUser((p) => ({ ...p, [g.user_id]: !p[g.user_id] }))}
                style={styles.cardHeader}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{g.user_name?.[0]?.toUpperCase() || "?"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{g.user_name}</Text>
                  <Text style={styles.meta}>
                    {g.user_email} · {g.forfaits.length} forfait(s) archivé(s)
                  </Text>
                </View>
                <Ionicons
                  name={open ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {open && (
                <View style={{ marginTop: spacing.sm }}>
                  {g.forfaits.map((f) => {
                    const fopen = expandedForfait[f.id];
                    return (
                      <View key={f.id} style={styles.forfaitBox}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.forfaitName}>{f.name}</Text>
                            <Text style={styles.meta}>
                              {f.total_classes - f.remaining_classes} / {f.total_classes} séances utilisées
                              {f.category ? ` · ${f.category}` : ""}
                            </Text>
                            <Text style={styles.metaSmall}>
                              Archivé le {formatFrenchDateTime(f.archived_at)}
                            </Text>
                          </View>
                          <TouchableOpacity
                            testID={`restore-forfait-${f.id}`}
                            onPress={() => restoreForfait(f.id)}
                            style={styles.restorePill}
                          >
                            <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                            <Text style={styles.restorePillText}>Restaurer</Text>
                          </TouchableOpacity>
                        </View>

                        {f.consumed_bookings.length > 0 && (
                          <>
                            <TouchableOpacity
                              testID={`toggle-consumed-${f.id}`}
                              onPress={() =>
                                setExpandedForfait((p) => ({ ...p, [f.id]: !p[f.id] }))
                              }
                              style={styles.expandBtnSmall}
                            >
                              <Ionicons
                                name={fopen ? "chevron-up" : "chevron-down"}
                                size={14}
                                color={colors.textSecondary}
                              />
                              <Text style={styles.expandTextSmall}>
                                {fopen ? "Masquer" : "Voir"} les cours utilisés (
                                {f.consumed_bookings.length})
                              </Text>
                            </TouchableOpacity>
                            {fopen && (
                              <View style={{ gap: 4, marginTop: 6 }}>
                                {f.consumed_bookings.map((cb) => (
                                  <View key={cb.booking_id} style={styles.consumedRow}>
                                    <View style={styles.consumedDot} />
                                    <Text style={styles.consumedText}>
                                      {formatFrenchDateTime(cb.starts_at)}
                                      {cb.category ? ` · ${cb.category}` : ""}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.md,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textPrimary, fontSize: fontSizes.sm },
  tabTextActive: { color: "#fff", fontWeight: "600" },
  empty: { alignItems: "center", padding: spacing.xl },
  emptyText: { marginTop: spacing.sm, color: colors.textSecondary },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.textSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "600", fontSize: fontSizes.md },
  title: { color: colors.textPrimary, fontSize: fontSizes.md, fontWeight: "500" },
  meta: { color: colors.textSecondary, fontSize: fontSizes.xs, marginTop: 2 },
  metaSmall: { color: colors.textSecondary, fontSize: 11, marginTop: 2, fontStyle: "italic" },
  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
  },
  expandText: { color: colors.textSecondary, fontSize: fontSizes.sm },
  expandBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  expandTextSmall: { color: colors.textSecondary, fontSize: fontSizes.xs },
  attendeeList: { marginTop: spacing.sm, gap: 6 },
  attendeeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: radius.md,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  attName: { color: colors.textPrimary, fontSize: fontSizes.sm, fontWeight: "500" },
  attMeta: { color: colors.textSecondary, fontSize: fontSizes.xs, marginTop: 1 },
  restoreBtn: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  restoreText: { color: colors.primary, fontWeight: "600", fontSize: fontSizes.sm },
  restorePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  restorePillText: { color: colors.primary, fontSize: fontSizes.xs, fontWeight: "600" },
  forfaitBox: {
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  forfaitName: { color: colors.textPrimary, fontSize: fontSizes.sm, fontWeight: "500" },
  consumedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  consumedDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  consumedText: { color: colors.textPrimary, fontSize: fontSizes.xs },
});

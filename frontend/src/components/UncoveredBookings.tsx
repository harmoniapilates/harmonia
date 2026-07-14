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

type UncoveredGroup = {
  user_id: string;
  user_name: string;
  user_email: string;
  count: number;
  bookings: {
    id: string;
    class_id: string;
    title: string;
    category: string;
    starts_at: string;
    status: string;
  }[];
};

type Msg = { text: string; kind: "success" | "error" };

type Props = {
  onMessage: (m: Msg) => void;
  onGoToForfait: (clientId: string) => void;
  refreshKey?: number;
};

export default function UncoveredBookings({ onMessage, onGoToForfait, refreshKey }: Props) {
  const [groups, setGroups] = useState<UncoveredGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listUncoveredBookings();
      setGroups(list);
    } catch (e: any) {
      onMessage({ text: e?.message || "Erreur de chargement", kind: "error" });
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="checkmark-circle-outline" size={40} color={colors.success} />
        <Text style={styles.emptyText}>Aucune réservation en attente de forfait</Text>
        <Text style={styles.emptyHint}>
          Toutes les réservations passées ont été prises en charge par un forfait.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.intro}>
        Ces clients ont réservé des cours qui n&apos;ont pas été décomptés d&apos;un forfait
        (aucun forfait actif au moment du cours). Créez ou complétez leur forfait — les
        réservations passées seront automatiquement couvertes.
      </Text>

      {groups.map((g) => {
        const isOpen = expanded[g.user_id];
        return (
          <View key={g.user_id} style={styles.card} testID={`uncovered-row-${g.user_id}`}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{g.user_name?.[0]?.toUpperCase() || "?"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{g.user_name}</Text>
                <Text style={styles.email}>{g.user_email}</Text>
              </View>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{g.count}</Text>
              </View>
            </View>

            <TouchableOpacity
              testID={`uncovered-toggle-${g.user_id}`}
              onPress={() => setExpanded((prev) => ({ ...prev, [g.user_id]: !prev[g.user_id] }))}
              style={styles.detailsBtn}
            >
              <Ionicons
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.detailsText}>
                {isOpen ? "Masquer les cours" : `Voir les ${g.count} cours`}
              </Text>
            </TouchableOpacity>

            {isOpen && (
              <View style={styles.list}>
                {g.bookings.map((b) => (
                  <View key={b.id} style={styles.listItem}>
                    <View style={styles.categoryDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{b.title}</Text>
                      <Text style={styles.itemDate}>{formatFrenchDateTime(b.starts_at)}</Text>
                    </View>
                    <Text style={styles.itemCategory}>{b.category}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              testID={`uncovered-fix-${g.user_id}`}
              onPress={() => onGoToForfait(g.user_id)}
              style={styles.actionBtn}
            >
              <Ionicons name="ticket-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Créer / modifier forfait</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", padding: spacing.xl },
  empty: { alignItems: "center", padding: spacing.xl },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  emptyHint: {
    marginTop: 4,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
  intro: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
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
    backgroundColor: colors.warning,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "600", fontSize: fontSizes.md },
  name: { color: colors.textPrimary, fontSize: fontSizes.md, fontWeight: "500" },
  email: { color: colors.textSecondary, fontSize: fontSizes.xs, marginTop: 2 },
  countPill: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: colors.warning,
    alignItems: "center",
    justifyContent: "center",
  },
  countPillText: { color: "#fff", fontWeight: "700", fontSize: fontSizes.md },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
  },
  detailsText: { color: colors.textSecondary, fontSize: fontSizes.sm },
  list: { marginTop: spacing.sm, gap: 8 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  itemTitle: { fontSize: fontSizes.sm, color: colors.textPrimary, fontWeight: "500" },
  itemDate: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  itemCategory: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  actionBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: fontSizes.md },
});

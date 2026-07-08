import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { api, ClassItem } from "@/src/api/client";
import { useAuth } from "@/src/context/auth";
import { colors, spacing, radius, fontSizes, images } from "@/src/theme";

function fmt(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function categoryImage(cat: string) {
  if (cat === "yoga") return images.yoga;
  if (cat === "pilates") return images.pilates;
  if (cat === "massage") return images.massage;
  return images.loginHero;
}

const CAT_LABELS: Record<string, string> = {
  yoga: "Yoga",
  pilates: "Pilates",
  massage: "Massages",
};

export default function ClassDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [cls, setCls] = useState<ClassItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; kind: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await api.listClasses();
      const found = list.find((c) => c.id === id) || null;
      setCls(found);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const book = async () => {
    if (!cls) return;
    setBusy(true);
    setMessage(null);
    try {
      const b = await api.createBooking(cls.id);
      setMessage({
        text:
          b.status === "pending"
            ? "Demande envoyée ! En attente de confirmation du propriétaire."
            : "Réservation confirmée !",
        kind: "success",
      });
      await load();
    } catch (e: any) {
      setMessage({ text: e?.message || "Erreur", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!cls) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.error}>Cours introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const spotsLeft = cls.capacity - cls.booked_count;
  const isFull = spotsLeft <= 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View>
          <Image source={{ uri: cls.image || categoryImage(cls.category) }} style={styles.hero} />
          <TouchableOpacity
            testID="detail-back"
            onPress={() => router.back()}
            style={styles.backCircle}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <View style={styles.pills}>
            <View style={[styles.pill, { backgroundColor: colors.primary }]}>
              <Text style={[styles.pillText, { color: "#fff" }]}>
                {CAT_LABELS[cls.category] || cls.category}
              </Text>
            </View>
            <View
              style={[
                styles.pill,
                { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
              ]}
            >
              <Text style={styles.pillText}>{cls.kind === "private" ? "Privé" : "Groupe"}</Text>
            </View>
          </View>

          <Text style={styles.title}>{cls.title}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.metaText}>{fmt(cls.starts_at)} · {cls.duration_minutes} min</Text>
          </View>
          {cls.instructor ? (
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.metaText}>avec {cls.instructor}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.metaText, isFull && { color: colors.error }]}>
              {isFull ? "Complet" : `${spotsLeft} places disponibles`}
            </Text>
          </View>

          {cls.description ? (
            <>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{cls.description}</Text>
            </>
          ) : null}

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

          {user?.role === "client" && (
            <TouchableOpacity
              testID="detail-book-btn"
              onPress={book}
              disabled={isFull || busy}
              style={[styles.primaryBtn, (isFull || busy) && { opacity: 0.5 }]}
            >
              <Text style={styles.primaryBtnText}>
                {busy ? "..." : isFull ? "Complet" : "Réserver maintenant"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  hero: { width: "100%", height: 260 },
  backCircle: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: spacing.lg },
  pills: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { fontSize: fontSizes.xs, fontWeight: "600", color: colors.textPrimary },
  title: {
    fontSize: fontSizes.huge,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  metaText: { color: colors.textSecondary, fontSize: fontSizes.md },
  sectionTitle: {
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },
  description: { color: colors.textPrimary, fontSize: fontSizes.md, lineHeight: 22 },
  banner: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: fontSizes.md },
  error: { color: colors.error, padding: spacing.lg },
  backBtn: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  backBtnText: { color: colors.textPrimary },
});

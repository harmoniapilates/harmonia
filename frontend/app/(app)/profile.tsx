import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "@/src/context/auth";
import { colors, spacing, radius, fontSizes } from "@/src/theme";

export default function Profile() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const doLogout = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  const reloadApp = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || "?"}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>
              {user?.role === "owner" ? "Propriétaire" : "Client"}
            </Text>
          </View>
        </View>

        <TouchableOpacity testID="reload-app" onPress={reloadApp} style={styles.reloadBtn}>
          <Ionicons name="refresh-outline" size={20} color={colors.primary} />
          <Text style={styles.reloadText}>Actualiser l&apos;application</Text>
        </TouchableOpacity>

        <TouchableOpacity testID="logout-button" onPress={doLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  avatarWrap: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "600" },
  name: { fontSize: fontSizes.xl, color: colors.textPrimary, fontWeight: "500" },
  email: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 },
  rolePill: {
    marginTop: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleText: { color: colors.primary, fontWeight: "600", fontSize: fontSizes.sm },
  section: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontWeight: "600",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  rowText: { fontSize: fontSizes.md, color: colors.textPrimary },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: { color: colors.error, fontWeight: "600", fontSize: fontSizes.md },
  reloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  reloadText: { color: colors.primary, fontWeight: "600", fontSize: fontSizes.md },
});

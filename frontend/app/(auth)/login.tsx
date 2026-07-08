import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/context/auth";
import { colors, spacing, radius, fontSizes, images, business } from "@/src/theme";

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setError(null);
    if (!email || !password) {
      setError("Saisissez email et mot de passe");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace("/(app)/calendar");
    } catch (e: any) {
      setError(e?.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ImageBackground
            source={{ uri: images.loginHero }}
            style={styles.hero}
            imageStyle={{ borderRadius: radius.xl }}
          >
            <View style={styles.heroOverlay}>
              <Text style={styles.overline}>BIEN-ÊTRE · CALME</Text>
              <Text style={styles.heroTitle}>{business.name}</Text>
              <Text style={styles.heroTagline}>{business.tagline}</Text>
            </View>
          </ImageBackground>

          <View style={styles.form}>
            <Text style={styles.title}>Se connecter</Text>
            <Text style={styles.subtitle}>Bienvenue. Réservez votre prochaine séance.</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="login-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="vous@email.com"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />

            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              testID="login-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="Votre mot de passe"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              style={styles.input}
            />

            {error && (
              <Text testID="login-error" style={styles.error}>
                {error}
              </Text>
            )}

            <TouchableOpacity
              testID="login-submit-button"
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={handle}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>{loading ? "Connexion..." : "Se connecter"}</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Pas encore de compte ? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity testID="go-to-register">
                  <Text style={styles.footerLink}>S&apos;inscrire</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: {
    height: 220,
    borderRadius: radius.xl,
    overflow: "hidden",
    justifyContent: "flex-end",
    marginBottom: spacing.lg,
  },
  heroOverlay: {
    backgroundColor: "rgba(45,55,72,0.35)",
    padding: spacing.lg,
    borderRadius: radius.xl,
  },
  overline: { color: "#fff", fontSize: fontSizes.xs, letterSpacing: 3, marginBottom: spacing.xs },
  heroTitle: { color: "#fff", fontSize: fontSizes.huge, fontWeight: "500" },
  heroTagline: { color: "#fff", fontSize: fontSizes.md, opacity: 0.9, marginTop: 4 },
  form: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: fontSizes.xxl, color: colors.textPrimary, fontWeight: "500" },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: fontSizes.md, fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
  footerText: { color: colors.textSecondary },
  footerLink: { color: colors.primary, fontWeight: "600" },
  error: { color: colors.error, marginTop: spacing.sm, fontSize: fontSizes.sm },
});

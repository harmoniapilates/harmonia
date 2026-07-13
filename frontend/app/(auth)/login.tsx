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
  Modal,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/context/auth";
import { colors, spacing, radius, fontSizes, images, business } from "@/src/theme";

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

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
            <View style={styles.passwordRow}>
              <TextInput
                testID="login-password-input"
                value={password}
                onChangeText={setPassword}
                placeholder="Votre mot de passe"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                style={[styles.input, styles.passwordInput]}
              />
              <TouchableOpacity
                testID="login-toggle-password"
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                accessibilityLabel={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              testID="login-forgot-password"
              onPress={() => setForgotOpen(true)}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

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

      <Modal
        visible={forgotOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mot de passe oublié</Text>
              <TouchableOpacity testID="forgot-close" onPress={() => setForgotOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBody}>
              Contactez le propriétaire de <Text style={{ fontWeight: "600" }}>{business.name}</Text> pour
              réinitialiser votre mot de passe. Il pourra vous en attribuer un nouveau directement depuis
              son espace de gestion.
            </Text>
            <TouchableOpacity
              testID="forgot-ok"
              onPress={() => setForgotOpen(false)}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>J&apos;ai compris</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  passwordRow: { position: "relative" },
  passwordInput: { paddingRight: 48 },
  eyeBtn: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  forgotBtn: { alignSelf: "flex-end", marginTop: spacing.sm },
  forgotText: { color: colors.primary, fontSize: fontSizes.sm, fontWeight: "500" },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: fontSizes.xl, color: colors.textPrimary, fontWeight: "500" },
  modalBody: { color: colors.textPrimary, fontSize: fontSizes.md, lineHeight: 22 },
});

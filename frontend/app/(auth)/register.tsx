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
  Switch,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/context/auth";
import { colors, spacing, radius, fontSizes } from "@/src/theme";

export default function Register() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setError(null);
    if (!name || !email || !password) {
      setError("Remplissez tous les champs");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (isOwner && !adminCode) {
      setError("Entrez le code propriétaire");
      return;
    }
    setLoading(true);
    try {
      await signUp(name, email.trim().toLowerCase(), password, isOwner ? adminCode : undefined);
      router.replace("/(app)/calendar");
    } catch (e: any) {
      setError(e?.message || "Erreur d'inscription");
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
          <Text style={styles.title}>S&apos;inscrire</Text>
          <Text style={styles.subtitle}>Créez votre compte en quelques secondes.</Text>

          <Text style={styles.label}>Nom</Text>
          <TextInput
            testID="register-name-input"
            value={name}
            onChangeText={setName}
            placeholder="Votre nom"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            testID="register-email-input"
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
              testID="register-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="Au moins 6 caractères"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
            />
            <TouchableOpacity
              testID="register-toggle-password"
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Je suis le propriétaire</Text>
              <Text style={styles.switchHint}>Nécessite un code secret</Text>
            </View>
            <Switch
              testID="register-owner-switch"
              value={isOwner}
              onValueChange={setIsOwner}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>

          {isOwner && (
            <>
              <Text style={styles.label}>Code Propriétaire</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  testID="register-admin-code-input"
                  value={adminCode}
                  onChangeText={setAdminCode}
                  placeholder="Code secret"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showAdminCode}
                  style={[styles.input, styles.passwordInput]}
                />
                <TouchableOpacity
                  testID="register-toggle-admin-code"
                  onPress={() => setShowAdminCode((v) => !v)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showAdminCode ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </>
          )}

          {error && (
            <Text testID="register-error" style={styles.error}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            testID="register-submit-button"
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handle}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Inscription..." : "Créer le compte"}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Vous avez déjà un compte ? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity testID="go-to-login">
                <Text style={styles.footerLink}>Se connecter</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: {
    fontSize: fontSizes.xxl,
    color: colors.textPrimary,
    fontWeight: "500",
    marginTop: spacing.lg,
  },
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
    backgroundColor: colors.surfaceElevated,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchTitle: { fontSize: fontSizes.md, color: colors.textPrimary, fontWeight: "500" },
  switchHint: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
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
});

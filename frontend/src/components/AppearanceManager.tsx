import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api, AppSettings } from "@/src/api/client";
import { colors, spacing, radius, fontSizes } from "@/src/theme";

type Msg = { text: string; kind: "success" | "error" };

type Section = "identity" | "colors" | "images" | "texts";

const COLOR_FIELDS: { key: keyof AppSettings["colors"]; label: string; hint?: string }[] = [
  { key: "primary", label: "Couleur principale", hint: "Boutons, filtres actifs" },
  { key: "primaryHover", label: "Couleur principale (survol)", hint: "Version foncée du principal" },
  { key: "secondary", label: "Couleur secondaire", hint: "Accents et titres" },
  { key: "background", label: "Fond de l'app" },
  { key: "surface", label: "Surface (cartes)" },
  { key: "surfaceElevated", label: "Surface claire" },
  { key: "textPrimary", label: "Texte principal" },
  { key: "textSecondary", label: "Texte secondaire" },
  { key: "border", label: "Bordures" },
  { key: "divider", label: "Séparateurs" },
  { key: "success", label: "Succès (vert)" },
  { key: "error", label: "Erreur (rouge)" },
  { key: "warning", label: "Avertissement (orange)" },
];

const IMAGE_FIELDS: { key: keyof AppSettings["images"]; label: string; hint?: string }[] = [
  { key: "loginHero", label: "Image d'accueil (login)", hint: "Grande image sur la page de connexion" },
  { key: "logoUrl", label: "Logo de l'entreprise", hint: "URL PNG carré (utilisé dans l'app)" },
  { key: "yoga", label: "Image par défaut Yoga" },
  { key: "pilates", label: "Image par défaut Pilates" },
  { key: "massage", label: "Image par défaut Massage" },
  { key: "faviconUrl", label: "Favicon", hint: "URL PNG 64×64 (icône onglet navigateur)" },
  { key: "appIconUrl", label: "Icône installation", hint: "URL PNG 512×512 (installation sur téléphone)" },
];

const TEXT_GROUPS: { title: string; fields: { key: string; label: string; multiline?: boolean }[] }[] = [
  {
    title: "Écran de connexion",
    fields: [
      { key: "loginHeroOverline", label: "Surtitre héros (majuscules)" },
      { key: "loginTitle", label: "Titre" },
      { key: "loginSubtitle", label: "Sous-titre" },
      { key: "loginEmailLabel", label: "Label email" },
      { key: "loginPasswordLabel", label: "Label mot de passe" },
      { key: "loginSubmit", label: "Bouton connexion" },
      { key: "loginForgotPassword", label: "Lien mot de passe oublié" },
      { key: "loginNoAccount", label: "Texte 'pas de compte'" },
      { key: "loginRegisterLink", label: "Lien inscription" },
      { key: "forgotTitle", label: "Titre popup oubli" },
      { key: "forgotBody", label: "Message popup oubli", multiline: true },
      { key: "forgotOk", label: "Bouton popup oubli" },
    ],
  },
  {
    title: "Inscription",
    fields: [
      { key: "registerTitle", label: "Titre" },
      { key: "registerSubtitle", label: "Sous-titre" },
      { key: "registerNameLabel", label: "Label nom" },
      { key: "registerEmailLabel", label: "Label email" },
      { key: "registerPasswordLabel", label: "Label mot de passe" },
      { key: "registerOwnerToggle", label: "Toggle propriétaire" },
      { key: "registerAdminCodeLabel", label: "Label code propriétaire" },
      { key: "registerSubmit", label: "Bouton créer compte" },
      { key: "registerHasAccount", label: "Texte 'déjà inscrit'" },
      { key: "registerLoginLink", label: "Lien connexion" },
    ],
  },
  {
    title: "Calendrier",
    fields: [
      { key: "calendarWelcomePrefix", label: "Salutation (ex: BONJOUR)" },
      { key: "calendarTitle", label: "Titre" },
      { key: "calendarFilterAll", label: "Filtre 'Tous'" },
      { key: "calendarFilterYoga", label: "Filtre 'Yoga'" },
      { key: "calendarFilterPilates", label: "Filtre 'Pilates'" },
      { key: "calendarNoClasses", label: "Aucun cours" },
    ],
  },
  {
    title: "Détail d'un cours",
    fields: [
      { key: "classBookBtn", label: "Bouton réserver" },
      { key: "classBookingConfirmed", label: "Réservation confirmée" },
      { key: "classBookingCancel", label: "Bouton annuler" },
      { key: "classFull", label: "Cours complet" },
      { key: "classAlreadyBooked", label: "Déjà réservé" },
    ],
  },
  {
    title: "Mes réservations & compte",
    fields: [
      { key: "bookingsTitle", label: "Titre réservations" },
      { key: "bookingsEmpty", label: "Aucune réservation" },
      { key: "bookingsForfaitsTitle", label: "Titre forfaits" },
      { key: "bookingsForfaitsEmpty", label: "Aucun forfait" },
      { key: "profileTitle", label: "Titre compte" },
      { key: "profileLogout", label: "Se déconnecter" },
    ],
  },
  {
    title: "Barre de navigation",
    fields: [
      { key: "tabCalendar", label: "Onglet Calendrier" },
      { key: "tabBookings", label: "Onglet Réservations" },
      { key: "tabProfile", label: "Onglet Compte" },
      { key: "tabAdmin", label: "Onglet Gestion" },
    ],
  },
];

export default function AppearanceManager({ onMessage }: { onMessage: (m: Msg) => void }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<Section>("identity");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (e: any) {
      onMessage({ text: e?.message || "Erreur de chargement", kind: "error" });
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api.updateSettings(settings);
      // Persist immediately in the local cache so the next reload picks it up
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "__harmonia_theme_v3",
          JSON.stringify({
            business_name: settings.business_name,
            business_tagline: settings.business_tagline,
            browser_title: settings.browser_title,
            colors: settings.colors,
            images: settings.images,
            texts: settings.texts,
          }),
        );
      }
      onMessage({
        text: "Modifications enregistrées. Rechargez la page pour voir tous les changements (Ctrl+Shift+R).",
        kind: "success",
      });
    } catch (e: any) {
      onMessage({ text: e?.message || "Erreur d'enregistrement", kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View>
      <View style={styles.tabsInner}>
        {(["identity", "colors", "images", "texts"] as Section[]).map((s) => (
          <TouchableOpacity
            key={s}
            testID={`apparence-section-${s}`}
            onPress={() => setSection(s)}
            style={[styles.tabInner, section === s && styles.tabInnerActive]}
          >
            <Text style={[styles.tabInnerText, section === s && styles.tabInnerTextActive]}>
              {s === "identity"
                ? "Identité"
                : s === "colors"
                ? "Couleurs"
                : s === "images"
                ? "Images"
                : "Textes"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {section === "identity" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nom de l&apos;entreprise</Text>
          <TextInput
            testID="apparence-business-name"
            value={settings.business_name}
            onChangeText={(v) => setSettings({ ...settings, business_name: v })}
            style={styles.input}
          />
          <Text style={styles.sectionTitle}>Slogan / sous-titre</Text>
          <TextInput
            testID="apparence-business-tagline"
            value={settings.business_tagline}
            onChangeText={(v) => setSettings({ ...settings, business_tagline: v })}
            style={styles.input}
          />
          <Text style={styles.sectionTitle}>Titre onglet navigateur</Text>
          <TextInput
            testID="apparence-browser-title"
            value={settings.browser_title}
            onChangeText={(v) => setSettings({ ...settings, browser_title: v })}
            style={styles.input}
          />
          <Text style={styles.hint}>Affiché dans la barre d&apos;onglets du navigateur.</Text>
        </View>
      )}

      {section === "colors" && (
        <View style={styles.card}>
          <Text style={styles.hint}>
            Utilise des codes HEX (ex: #7FA15D). Génère une palette sur coolors.co.
          </Text>
          {COLOR_FIELDS.map((f) => (
            <View key={f.key} style={styles.colorRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                {f.hint && <Text style={styles.hint}>{f.hint}</Text>}
              </View>
              <TextInput
                testID={`apparence-color-${f.key}`}
                value={settings.colors[f.key]}
                onChangeText={(v) =>
                  setSettings({
                    ...settings,
                    colors: { ...settings.colors, [f.key]: v },
                  })
                }
                style={[styles.input, styles.colorInput]}
                placeholder="#000000"
                autoCapitalize="none"
              />
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: settings.colors[f.key] || "#000" },
                ]}
              />
            </View>
          ))}
        </View>
      )}

      {section === "images" && (
        <View style={styles.card}>
          <Text style={styles.hint}>
            Utilise des URL HTTPS publiques (Unsplash, ton hosting, Imgur, Cloudinary…). Format JPG ou PNG.
          </Text>
          {IMAGE_FIELDS.map((f) => (
            <View key={f.key} style={styles.imageBlock}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              {f.hint && <Text style={styles.hint}>{f.hint}</Text>}
              <TextInput
                testID={`apparence-image-${f.key}`}
                value={settings.images[f.key] || ""}
                onChangeText={(v) =>
                  setSettings({
                    ...settings,
                    images: { ...settings.images, [f.key]: v },
                  })
                }
                style={styles.input}
                placeholder="https://..."
                autoCapitalize="none"
              />
              {!!settings.images[f.key] && (
                <Image
                  source={{ uri: settings.images[f.key] }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
              )}
            </View>
          ))}
        </View>
      )}

      {section === "texts" && (
        <View style={styles.card}>
          <Text style={styles.hint}>
            Modifie ici toutes les phrases visibles par tes clients dans l&apos;app.
          </Text>
          {TEXT_GROUPS.map((group) => (
            <View key={group.title} style={styles.textGroup}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.fields.map((f) => (
                <View key={f.key} style={styles.textField}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    testID={`apparence-text-${f.key}`}
                    value={settings.texts[f.key] || ""}
                    onChangeText={(v) =>
                      setSettings({
                        ...settings,
                        texts: { ...settings.texts, [f.key]: v },
                      })
                    }
                    style={[styles.input, f.multiline && { height: 80, textAlignVertical: "top" }]}
                    multiline={f.multiline}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        testID="apparence-save-btn"
        onPress={save}
        disabled={saving}
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
      >
        <Ionicons name="save-outline" size={20} color="#fff" />
        <Text style={styles.saveBtnText}>
          {saving ? "Enregistrement…" : "Enregistrer les modifications"}
        </Text>
      </TouchableOpacity>
      <Text style={styles.reloadHint}>
        Après enregistrement, recharge la page (Ctrl+Shift+R) pour voir tous les changements appliqués.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", padding: spacing.xl },
  tabsInner: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.md,
  },
  tabInner: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  tabInnerActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabInnerText: { color: colors.textPrimary, fontSize: fontSizes.sm },
  tabInnerTextActive: { color: "#fff", fontWeight: "600" },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  fieldLabel: { fontSize: fontSizes.sm, color: colors.textPrimary, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    marginTop: 4,
  },
  hint: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 4, marginBottom: 4 },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.sm,
  },
  colorInput: { flex: 0, width: 110 },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageBlock: { marginTop: spacing.md },
  imagePreview: {
    marginTop: 8,
    width: "100%",
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  textGroup: { marginTop: spacing.md },
  groupTitle: {
    fontSize: fontSizes.sm,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderColor: colors.divider,
  },
  textField: { marginTop: spacing.sm },
  saveBtn: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.pill,
  },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: fontSizes.md },
  reloadHint: {
    marginTop: 8,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
});

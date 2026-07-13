import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/src/api/client";
import { colors, spacing, radius, fontSizes } from "@/src/theme";

type Client = { id: string; name: string; email: string };
type Msg = { text: string; kind: "success" | "error" };

export default function ClientsManager({ onMessage }: { onMessage: (m: Msg) => void }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listClients();
      setClients(list);
    } catch (e: any) {
      onMessage({ text: e?.message || "Erreur de chargement", kind: "error" });
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (c: Client) => {
    setEditing(c);
    setEditName(c.name);
    setEditEmail(c.email);
    setNewPassword("");
    setShowPassword(false);
  };

  const closeEdit = () => {
    setEditing(null);
    setNewPassword("");
  };

  const save = async () => {
    if (!editing) return;
    if (!editName.trim()) {
      onMessage({ text: "Le nom ne peut pas être vide", kind: "error" });
      return;
    }
    if (newPassword && newPassword.length < 6) {
      onMessage({ text: "Le mot de passe doit contenir au moins 6 caractères", kind: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload: { name?: string; email?: string; password?: string } = {};
      if (editName !== editing.name) payload.name = editName.trim();
      if (editEmail !== editing.email) payload.email = editEmail.trim().toLowerCase();
      if (newPassword) payload.password = newPassword;
      if (Object.keys(payload).length === 0) {
        closeEdit();
        return;
      }
      await api.updateUser(editing.id, payload);
      onMessage({
        text: newPassword
          ? `Compte de ${editName} mis à jour et mot de passe réinitialisé`
          : `Compte de ${editName} mis à jour`,
        kind: "success",
      });
      closeEdit();
      await load();
    } catch (e: any) {
      onMessage({ text: e?.message || "Erreur de mise à jour", kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  const filtered = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  return (
    <View>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          testID="clients-search"
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un client…"
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            {clients.length === 0 ? "Aucun client inscrit" : "Aucun résultat"}
          </Text>
        </View>
      ) : (
        filtered.map((c) => (
          <View key={c.id} style={styles.row} testID={`client-row-${c.id}`}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{c.name?.[0]?.toUpperCase() || "?"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.email}>{c.email}</Text>
            </View>
            <TouchableOpacity
              testID={`edit-client-${c.id}`}
              onPress={() => openEdit(c)}
              style={styles.editBtn}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text style={styles.editText}>Gérer</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <Modal
        visible={!!editing}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalWrap}
          >
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Gérer le client</Text>
                <TouchableOpacity testID="close-client-edit" onPress={closeEdit}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.label}>Nom</Text>
                <TextInput
                  testID="client-edit-name"
                  value={editName}
                  onChangeText={setEditName}
                  style={styles.input}
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={styles.label}>Email</Text>
                <TextInput
                  testID="client-edit-email"
                  value={editEmail}
                  onChangeText={setEditEmail}
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={styles.label}>Nouveau mot de passe</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    testID="client-edit-password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Laisser vide pour ne pas changer"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showPassword}
                    style={[styles.input, styles.passwordInput]}
                  />
                  <TouchableOpacity
                    testID="client-toggle-password"
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
                <Text style={styles.hint}>
                  Le client pourra se connecter avec ce nouveau mot de passe dès son enregistrement.
                </Text>

                <TouchableOpacity
                  testID="client-save-btn"
                  onPress={save}
                  disabled={saving}
                  style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
                >
                  <Text style={styles.primaryBtnText}>
                    {saving ? "Enregistrement…" : "Enregistrer"}
                  </Text>
                </TouchableOpacity>
                <View style={{ height: spacing.xl }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSizes.md,
  },
  empty: { alignItems: "center", padding: spacing.xl },
  emptyText: { color: colors.textSecondary, marginTop: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "600", fontSize: fontSizes.md },
  name: { color: colors.textPrimary, fontSize: fontSizes.md, fontWeight: "500" },
  email: { color: colors.textSecondary, fontSize: fontSizes.xs, marginTop: 2 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editText: { color: colors.primary, fontWeight: "600", fontSize: fontSizes.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalWrap: { maxHeight: "92%" },
  modal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: fontSizes.xl, color: colors.textPrimary, fontWeight: "500" },
  label: {
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: 4,
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
  hint: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 6 },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: fontSizes.md },
});

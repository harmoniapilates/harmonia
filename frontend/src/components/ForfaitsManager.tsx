import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api, Forfait } from "@/src/api/client";
import { colors, spacing, radius, fontSizes } from "@/src/theme";

const CATEGORIES = [
  { key: "", label: "Tous" },
  { key: "yoga", label: "Yoga" },
  { key: "pilates", label: "Pilates" },
  { key: "massage", label: "Massages" },
];

const CAT_LABELS: Record<string, string> = {
  yoga: "Yoga",
  pilates: "Pilates",
  massage: "Massages",
};

const emptyForm = {
  id: "",
  user_id: "",
  name: "",
  total_classes: "10",
  remaining_classes: "10",
  category: "",
  expires_at: "",
  active: true,
};

type FormState = typeof emptyForm;

function pad(n: number) { return String(n).padStart(2, "0"); }

function fmtExpDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function isoDateOnly(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateToEndOfDayIso(date: string): string | null {
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [Y, M, D] = date.split("-").map(Number);
  return new Date(Y, M - 1, D, 23, 59, 59).toISOString();
}

function isExpired(iso?: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

type Props = {
  onMessage: (m: { text: string; kind: "success" | "error" }) => void;
  initialUserId?: string | null;
  onInitialHandled?: () => void;
};

export default function ForfaitsManager({ onMessage, initialUserId, onInitialHandled }: Props) {
  const [forfaits, setForfaits] = useState<Forfait[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [f, c] = await Promise.all([api.listForfaits(), api.listClients()]);
      setForfaits(f);
      setClients(c);
    } catch (e: any) {
      onMessage({ text: e?.message || "Erreur", kind: "error" });
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    load();
  }, [load]);

  // If a user id was pre-selected (e.g. jumping from the "Sans forfait" panel),
  // wait until clients are loaded, then either open the edit form for the
  // client's existing forfait or open create with that client pre-selected.
  useEffect(() => {
    if (!initialUserId) return;
    if (loading) return;
    const existing = forfaits.find(
      (f) => f.user_id === initialUserId && f.active,
    );
    if (existing) {
      openEdit(existing);
    } else {
      setForm({ ...emptyForm, user_id: initialUserId });
      setModalOpen(true);
    }
    onInitialHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId, loading]);

  const openCreate = () => {
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (f: Forfait) => {
    setForm({
      id: f.id,
      user_id: f.user_id,
      name: f.name,
      total_classes: String(f.total_classes),
      remaining_classes: String(f.remaining_classes),
      category: f.category || "",
      expires_at: isoDateOnly(f.expires_at),
      active: f.active,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.user_id) {
      onMessage({ text: "Sélectionnez un client", kind: "error" });
      return;
    }
    if (!form.name) {
      onMessage({ text: "Le nom du forfait est obligatoire", kind: "error" });
      return;
    }
    const total = parseInt(form.total_classes);
    const remaining = parseInt(form.remaining_classes);
    if (!total || total < 1) {
      onMessage({ text: "Nombre total invalide", kind: "error" });
      return;
    }
    setSaving(true);
    try {
      const expIso = dateToEndOfDayIso(form.expires_at);
      if (form.id) {
        await api.updateForfait(form.id, {
          name: form.name,
          total_classes: total,
          remaining_classes: isNaN(remaining) ? 0 : remaining,
          category: form.category || null,
          expires_at: expIso,
          active: form.active,
        } as any);
      } else {
        await api.createForfait({
          user_id: form.user_id,
          name: form.name,
          total_classes: total,
          category: form.category || null,
          expires_at: expIso,
        });
      }
      setModalOpen(false);
      onMessage({ text: "Forfait enregistré", kind: "success" });
      await load();
    } catch (e: any) {
      onMessage({ text: e?.message || "Erreur d'enregistrement", kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteForfait(id);
      onMessage({ text: "Forfait supprimé", kind: "success" });
      await load();
    } catch (e: any) {
      onMessage({ text: e?.message || "Erreur", kind: "error" });
    }
  };

  const selectedClient = clients.find((c) => c.id === form.user_id);

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />;
  }

  return (
    <View>
      <TouchableOpacity testID="add-forfait-btn" onPress={openCreate} style={styles.addBtn}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addBtnText}>Nouveau forfait</Text>
      </TouchableOpacity>

      {forfaits.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="ticket-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Aucun forfait. Créez le premier !</Text>
          <Text style={styles.emptyHint}>
            Les forfaits sont des carnets prépayés. Ils sont décomptés automatiquement quand vous marquez la présence.
          </Text>
        </View>
      ) : (
        forfaits.map((f) => {
          const empty = f.remaining_classes <= 0;
          const expired = isExpired(f.expires_at);
          const expDate = fmtExpDate(f.expires_at);
          return (
            <View key={f.id} style={styles.card} testID={`forfait-card-${f.id}`}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{f.name}</Text>
                  <Text style={styles.cardMeta}>
                    <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
                    {"  "}{f.user_name} · {f.user_email}
                  </Text>
                  {f.category ? (
                    <Text style={styles.cardMeta}>
                      Catégorie : {CAT_LABELS[f.category] || f.category}
                    </Text>
                  ) : (
                    <Text style={styles.cardMeta}>Toutes catégories</Text>
                  )}
                  {expDate && (
                    <Text style={[styles.cardMeta, expired && { color: colors.error, fontWeight: "600" }]}>
                      {expired ? "Expiré le" : "Expire le"} : {expDate}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.balancePill,
                    (empty || expired) && { backgroundColor: "#FDECEA", borderColor: colors.error },
                  ]}
                >
                  <Text style={[styles.balanceText, (empty || expired) && { color: colors.error }]}>
                    {f.remaining_classes} / {f.total_classes}
                  </Text>
                  <Text style={[styles.balanceLabel, (empty || expired) && { color: colors.error }]}>
                    séances
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  testID={`edit-forfait-${f.id}`}
                  onPress={() => openEdit(f)}
                  style={styles.actionBtn}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>Modifier</Text>
                </TouchableOpacity>
                <View style={{ width: 1, backgroundColor: colors.border }} />
                <TouchableOpacity
                  testID={`delete-forfait-${f.id}`}
                  onPress={() => remove(f.id)}
                  style={styles.actionBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                  <Text style={[styles.actionText, { color: colors.error }]}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Forfait Form Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalWrap}
          >
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {form.id ? "Modifier le forfait" : "Nouveau forfait"}
                </Text>
                <TouchableOpacity testID="close-forfait-modal" onPress={() => setModalOpen(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.formLabel}>Client</Text>
                <TouchableOpacity
                  testID="pick-client"
                  onPress={() => !form.id && setClientPickerOpen(true)}
                  disabled={!!form.id}
                  style={[styles.input, styles.pickerInput, form.id && { opacity: 0.6 }]}
                >
                  <Text style={{ color: selectedClient ? colors.textPrimary : colors.textSecondary }}>
                    {selectedClient ? `${selectedClient.name} · ${selectedClient.email}` : "Choisir un client"}
                  </Text>
                  {!form.id && (
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>

                <Text style={styles.formLabel}>Nom du forfait</Text>
                <TextInput
                  testID="forfait-name"
                  value={form.name}
                  onChangeText={(v) => setForm({ ...form, name: v })}
                  style={styles.input}
                  placeholder="ex. Carnet 10 séances"
                  placeholderTextColor={colors.textSecondary}
                />

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Nombre total</Text>
                    <TextInput
                      testID="forfait-total"
                      value={form.total_classes}
                      onChangeText={(v) => {
                        // when creating, remaining follows total
                        if (!form.id) {
                          setForm({ ...form, total_classes: v, remaining_classes: v });
                        } else {
                          setForm({ ...form, total_classes: v });
                        }
                      }}
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  </View>
                  {form.id && (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Restantes</Text>
                      <TextInput
                        testID="forfait-remaining"
                        value={form.remaining_classes}
                        onChangeText={(v) => setForm({ ...form, remaining_classes: v })}
                        keyboardType="number-pad"
                        style={styles.input}
                      />
                    </View>
                  )}
                </View>

                <Text style={styles.formLabel}>Catégorie</Text>
                <View style={styles.chipsRow}>
                  {CATEGORIES.map((c) => {
                    const active = form.category === c.key;
                    return (
                      <TouchableOpacity
                        key={c.key || "all"}
                        testID={`forfait-cat-${c.key || "all"}`}
                        onPress={() => setForm({ ...form, category: c.key })}
                        style={[
                          styles.chip,
                          active && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                      >
                        <Text style={[styles.chipText, active && { color: "#fff" }]}>{c.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.hint}>
                  Un forfait sans catégorie peut être utilisé pour tous les cours.
                </Text>

                <Text style={styles.formLabel}>Date d&apos;expiration (facultatif)</Text>
                <TextInput
                  testID="forfait-expiry"
                  value={form.expires_at}
                  onChangeText={(v) => setForm({ ...form, expires_at: v })}
                  style={styles.input}
                  placeholder="AAAA-MM-JJ (vide = jamais)"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.hint}>
                  Passée cette date, le forfait ne sera plus utilisable ni décompté automatiquement.
                </Text>

                <TouchableOpacity
                  testID="forfait-save-btn"
                  onPress={save}
                  disabled={saving}
                  style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
                >
                  <Text style={styles.primaryBtnText}>
                    {saving ? "Enregistrement..." : "Enregistrer"}
                  </Text>
                </TouchableOpacity>
                <View style={{ height: spacing.xl }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Client Picker Modal */}
      <Modal
        visible={clientPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setClientPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { maxHeight: "70%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un client</Text>
              <TouchableOpacity onPress={() => setClientPickerOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {clients.length === 0 ? (
                <Text style={{ color: colors.textSecondary, padding: spacing.md }}>
                  Aucun client enregistré.
                </Text>
              ) : (
                clients.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    testID={`client-option-${c.id}`}
                    onPress={() => {
                      setForm({ ...form, user_id: c.id });
                      setClientPickerOpen(false);
                    }}
                    style={styles.clientRow}
                  >
                    <View>
                      <Text style={styles.clientName}>{c.name}</Text>
                      <Text style={styles.clientEmail}>{c.email}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  addBtnText: { color: "#fff", fontWeight: "600" },
  center: { padding: spacing.xl, alignItems: "center" },
  emptyText: { color: colors.textPrimary, marginTop: spacing.md, fontWeight: "500" },
  emptyHint: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontSize: fontSizes.sm,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTop: { flexDirection: "row", gap: spacing.md },
  cardTitle: { fontSize: fontSizes.md, color: colors.textPrimary, fontWeight: "500" },
  cardMeta: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 },
  balancePill: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 76,
  },
  balanceText: { color: colors.primary, fontWeight: "700", fontSize: fontSizes.lg },
  balanceLabel: { color: colors.primary, fontSize: fontSizes.xs },
  cardActions: {
    flexDirection: "row",
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  actionText: { fontWeight: "600", fontSize: fontSizes.sm },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalWrap: { maxHeight: "92%" },
  modal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: fontSizes.xl, color: colors.textPrimary, fontWeight: "500" },
  formLabel: {
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
    backgroundColor: colors.background,
  },
  pickerInput: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hint: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 4 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  chipText: { color: colors.textPrimary, fontSize: fontSizes.sm },
  rowInputs: { flexDirection: "row", gap: 12 },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: fontSizes.md },
  clientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  clientName: { color: colors.textPrimary, fontSize: fontSizes.md, fontWeight: "500" },
  clientEmail: { color: colors.textSecondary, fontSize: fontSizes.xs, marginTop: 2 },
});

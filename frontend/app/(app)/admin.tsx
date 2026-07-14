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
  Switch,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { api, ClassItem, AppSettings } from "@/src/api/client";
import { colors, spacing, radius, fontSizes } from "@/src/theme";
import ForfaitsManager from "@/src/components/ForfaitsManager";
import ClientsManager from "@/src/components/ClientsManager";
import UncoveredBookings from "@/src/components/UncoveredBookings";
import NativePicker from "@/src/components/NativePicker";
import { formatFrenchDateTime } from "@/src/utils/date";

const CATEGORIES = ["yoga", "pilates", "massage"];
const CATEGORY_LABELS: Record<string, string> = {
  yoga: "Yoga",
  pilates: "Pilates",
  massage: "Massages",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// The class create/edit form uses native <input type="date"> and
// <input type="time"> on web, which require canonical formats
// (YYYY-MM-DD and HH:MM). The browser displays them in the user's locale
// (French Chrome will show 13/07/2026 and 24h time).
function toIsoLocal(dateStr: string, time: string): string {
  const [Y, M, D] = dateStr.split("-").map(Number);
  const [h, m] = time.split(":").map(Number);
  const d = new Date(Y, (M || 1) - 1, D || 1, h || 0, m || 0, 0, 0);
  return d.toISOString();
}

function fromIso(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function todayIso(): string {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

const DATE_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function fmtDateTime(iso: string) {
  return formatFrenchDateTime(iso);
}

const emptyForm = {
  id: "",
  title: "",
  description: "",
  category: "yoga",
  kind: "group",
  date: "",
  time: "",
  duration_minutes: "60",
  capacity: "10",
  instructor: "",
  image: "",
};

type FormState = typeof emptyForm;

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
// Map array index 0..6 (Lun..Dim) to JS Date.getDay() (0=Dim, 1=Lun, ..., 6=Sam)
const DAY_INDEX_TO_JS: Record<number, number> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 0 };

const emptyBulkForm = {
  title: "",
  description: "",
  category: "yoga",
  kind: "group",
  startDate: "",
  time: "10:00",
  duration_minutes: "60",
  capacity: "10",
  instructor: "",
  image: "",
  weeks: "4",
  days: [false, false, false, false, false, false, false] as boolean[],
};

type BulkFormState = typeof emptyBulkForm;

function computeBulkDates(bulk: BulkFormState): string[] {
  if (!DATE_ISO_RE.test(bulk.startDate)) return [];
  if (!/^\d{2}:\d{2}$/.test(bulk.time)) return [];
  const weeks = Math.max(1, parseInt(bulk.weeks) || 0);
  const selected = bulk.days
    .map((v, idx) => (v ? DAY_INDEX_TO_JS[idx] : -1))
    .filter((v) => v >= 0);
  if (selected.length === 0) return [];
  const [Y, M, D] = bulk.startDate.split("-").map(Number);
  const [h, m] = bulk.time.split(":").map(Number);
  const start = new Date(Y, M - 1, D, h, m, 0, 0);
  const dates: string[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (selected.includes(d.getDay())) {
      dates.push(d.toISOString());
    }
  }
  return dates;
}

export default function Admin() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tab, setTab] = useState<"classes" | "forfaits" | "uncovered" | "clients" | "settings">("classes");
  const [pendingForfaitClientId, setPendingForfaitClientId] = useState<string | null>(null);
  const [uncoveredRefreshKey, setUncoveredRefreshKey] = useState(0);
  const [message, setMessage] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkFormState>(emptyBulkForm);
  const [bulkSaving, setBulkSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([api.listClasses(), api.getSettings()]);
      setClasses(list);
      setSettings(s);
    } catch (e: any) {
      setMessage({ text: e?.message || "Erreur", kind: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm({ ...emptyForm, date: todayIso(), time: "10:00" });
    setModalOpen(true);
  };

  const openBulk = () => {
    setBulkForm({ ...emptyBulkForm, startDate: todayIso() });
    setBulkModalOpen(true);
  };

  const saveBulk = async () => {
    setMessage(null);
    if (!bulkForm.title) {
      setMessage({ text: "Le titre est obligatoire", kind: "error" });
      return;
    }
    const dates = computeBulkDates(bulkForm);
    if (dates.length === 0) {
      setMessage({ text: "Vérifiez la date, l'heure et les jours sélectionnés", kind: "error" });
      return;
    }
    setBulkSaving(true);
    try {
      const created = await api.bulkCreateClasses({
        title: bulkForm.title,
        description: bulkForm.description,
        category: bulkForm.category,
        kind: bulkForm.kind,
        duration_minutes: parseInt(bulkForm.duration_minutes) || 60,
        capacity: parseInt(bulkForm.capacity) || 10,
        instructor: bulkForm.instructor,
        image: bulkForm.image,
        starts_at_list: dates,
      });
      setBulkModalOpen(false);
      setMessage({ text: `${created.length} cours créés avec succès`, kind: "success" });
      await load();
    } catch (e: any) {
      setMessage({ text: e?.message || "Erreur de création", kind: "error" });
    } finally {
      setBulkSaving(false);
    }
  };

  const openEdit = (cls: ClassItem) => {
    const { date, time } = fromIso(cls.starts_at);
    setForm({
      id: cls.id,
      title: cls.title,
      description: cls.description || "",
      category: cls.category,
      kind: cls.kind,
      date,
      time,
      duration_minutes: String(cls.duration_minutes),
      capacity: String(cls.capacity),
      instructor: cls.instructor || "",
      image: cls.image || "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    setMessage(null);
    if (!form.title || !form.date || !form.time) {
      setMessage({ text: "Remplissez titre, date et heure", kind: "error" });
      return;
    }
    if (!DATE_ISO_RE.test(form.date)) {
      setMessage({ text: "Sélectionnez une date valide", kind: "error" });
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(form.time)) {
      setMessage({ text: "Heure invalide (HH:MM)", kind: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        kind: form.kind,
        starts_at: toIsoLocal(form.date, form.time),
        duration_minutes: parseInt(form.duration_minutes) || 60,
        capacity: parseInt(form.capacity) || 10,
        instructor: form.instructor,
        image: form.image,
      };
      if (form.id) {
        await api.updateClass(form.id, payload);
      } else {
        await api.createClass(payload);
      }
      setModalOpen(false);
      setMessage({ text: "Enregistré avec succès", kind: "success" });
      await load();
    } catch (e: any) {
      setMessage({ text: e?.message || "Erreur d'enregistrement", kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setMessage(null);
    try {
      await api.deleteClass(id);
      setMessage({ text: "Cours supprimé", kind: "success" });
      await load();
    } catch (e: any) {
      setMessage({ text: e?.message || "Erreur", kind: "error" });
    }
  };

  const updateSettingsField = async (patch: Partial<AppSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      await api.updateSettings(next);
    } catch (e: any) {
      setMessage({ text: e?.message || "Erreur", kind: "error" });
      await load();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestion</Text>
        {tab === "classes" && (
          <View style={styles.headerActions}>
            <TouchableOpacity testID="bulk-create-btn" onPress={openBulk} style={styles.bulkBtn}>
              <Ionicons name="albums-outline" size={18} color={colors.primary} />
              <Text style={styles.bulkBtnText}>Série</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="add-class-btn" onPress={openCreate} style={styles.addBtn}>
              <Ionicons name="add" size={22} color="#fff" />
              <Text style={styles.addBtnText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          testID="admin-tab-classes"
          onPress={() => setTab("classes")}
          style={[styles.tab, tab === "classes" && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === "classes" && styles.tabTextActive]}>Cours</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="admin-tab-forfaits"
          onPress={() => setTab("forfaits")}
          style={[styles.tab, tab === "forfaits" && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === "forfaits" && styles.tabTextActive]}>Forfaits</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="admin-tab-uncovered"
          onPress={() => setTab("uncovered")}
          style={[styles.tab, tab === "uncovered" && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === "uncovered" && styles.tabTextActive]}>Sans forfait</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="admin-tab-clients"
          onPress={() => setTab("clients")}
          style={[styles.tab, tab === "clients" && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === "clients" && styles.tabTextActive]}>Clients</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="admin-tab-settings"
          onPress={() => setTab("settings")}
          style={[styles.tab, tab === "settings" && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === "settings" && styles.tabTextActive]}>Paramètres</Text>
        </TouchableOpacity>
      </View>

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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : tab === "classes" ? (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary}
            />
          }
        >
          {classes.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="add-circle-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Aucun cours. Ajoutez le premier !</Text>
            </View>
          ) : (
            classes.map((cls) => (
              <View key={cls.id} style={styles.card} testID={`admin-class-${cls.id}`}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{cls.title}</Text>
                    <Text style={styles.cardMeta}>
                      {CATEGORY_LABELS[cls.category] || cls.category} · {cls.kind === "private" ? "Privé" : "Groupe"}
                    </Text>
                    <Text style={styles.cardMeta}>{fmtDateTime(cls.starts_at)}</Text>
                    <Text style={styles.cardSpot}>
                      {cls.booked_count} / {cls.capacity} inscrits
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    testID={`view-attendees-${cls.id}`}
                    onPress={() => openEdit(cls)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                    <Text style={[styles.actionText, { color: colors.primary }]}>Modifier</Text>
                  </TouchableOpacity>
                  <View style={{ width: 1, backgroundColor: colors.border }} />
                  <TouchableOpacity
                    testID={`delete-class-${cls.id}`}
                    onPress={() => remove(cls.id)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                    <Text style={[styles.actionText, { color: colors.error }]}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
                <AttendeesInline classId={cls.id} onChange={load} onMessage={setMessage} />
              </View>
            ))
          )}
        </ScrollView>
      ) : tab === "forfaits" ? (
        <ScrollView contentContainerStyle={styles.list}>
          <ForfaitsManager
            onMessage={(m) => {
              setMessage(m);
              if (m.kind === "success") setUncoveredRefreshKey((k) => k + 1);
            }}
            initialUserId={pendingForfaitClientId}
            onInitialHandled={() => setPendingForfaitClientId(null)}
          />
        </ScrollView>
      ) : tab === "uncovered" ? (
        <ScrollView contentContainerStyle={styles.list}>
          <UncoveredBookings
            onMessage={setMessage}
            refreshKey={uncoveredRefreshKey}
            onGoToForfait={(uid) => {
              setPendingForfaitClientId(uid);
              setTab("forfaits");
            }}
          />
        </ScrollView>
      ) : tab === "clients" ? (
        <ScrollView contentContainerStyle={styles.list}>
          <ClientsManager onMessage={setMessage} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {settings && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Nom de l&apos;entreprise</Text>
              <TextInput
                testID="settings-business-name"
                value={settings.business_name}
                onChangeText={(v) => setSettings({ ...settings, business_name: v })}
                onBlur={() => updateSettingsField({ business_name: settings.business_name })}
                style={styles.input}
              />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Réservations multiples</Text>
                  <Text style={styles.switchHint}>
                    Autoriser le client à réserver plusieurs cours
                  </Text>
                </View>
                <Switch
                  testID="settings-multi-bookings"
                  value={settings.allow_multiple_bookings}
                  onValueChange={(v) => updateSettingsField({ allow_multiple_bookings: v })}
                  trackColor={{ true: colors.primary, false: colors.border }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Cours privés à confirmer</Text>
                  <Text style={styles.switchHint}>
                    Les cours 1-à-1 démarrent en &quot;En attente&quot;
                  </Text>
                </View>
                <Switch
                  testID="settings-private-confirm"
                  value={settings.private_requires_confirmation}
                  onValueChange={(v) => updateSettingsField({ private_requires_confirmation: v })}
                  trackColor={{ true: colors.primary, false: colors.border }}
                />
              </View>

              <Text style={styles.sectionTitle}>Heures min. avant annulation</Text>
              <TextInput
                testID="settings-cancellation-window"
                value={String(settings.cancellation_window_hours)}
                onChangeText={(v) =>
                  setSettings({ ...settings, cancellation_window_hours: parseInt(v) || 0 })
                }
                onBlur={() =>
                  updateSettingsField({ cancellation_window_hours: settings.cancellation_window_hours })
                }
                keyboardType="number-pad"
                style={styles.input}
              />
              <Text style={styles.hint}>
                Le client ne peut pas annuler s&apos;il reste moins de temps avant le début du cours.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Class Form Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalWrap}
          >
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{form.id ? "Modifier le cours" : "Ajouter un cours"}</Text>
                <TouchableOpacity testID="close-modal" onPress={() => setModalOpen(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.formLabel}>Titre</Text>
                <TextInput
                  testID="form-title"
                  value={form.title}
                  onChangeText={(v) => setForm({ ...form, title: v })}
                  style={styles.input}
                  placeholder="ex. Yoga matinal"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  value={form.description}
                  onChangeText={(v) => setForm({ ...form, description: v })}
                  style={[styles.input, { height: 70 }]}
                  multiline
                  placeholder="Description (facultatif)"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={styles.formLabel}>Catégorie</Text>
                <View style={styles.chipsRow}>
                  {CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      testID={`form-category-${c}`}
                      onPress={() => setForm({ ...form, category: c })}
                      style={[
                        styles.chip,
                        form.category === c && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.chipText, form.category === c && { color: "#fff" }]}>
                        {CATEGORY_LABELS[c]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.formLabel}>Type</Text>
                <View style={styles.chipsRow}>
                  {["group", "private"].map((k) => (
                    <TouchableOpacity
                      key={k}
                      testID={`form-kind-${k}`}
                      onPress={() => setForm({ ...form, kind: k })}
                      style={[
                        styles.chip,
                        form.kind === k && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.chipText, form.kind === k && { color: "#fff" }]}>
                        {k === "group" ? "Groupe" : "Privé"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Date</Text>
                    <NativePicker
                      kind="date"
                      testID="form-date"
                      value={form.date}
                      onChangeText={(v) => setForm({ ...form, date: v })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Heure</Text>
                    <NativePicker
                      kind="time"
                      testID="form-time"
                      value={form.time}
                      onChangeText={(v) => setForm({ ...form, time: v })}
                    />
                  </View>
                </View>

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Durée (min)</Text>
                    <TextInput
                      testID="form-duration"
                      value={form.duration_minutes}
                      onChangeText={(v) => setForm({ ...form, duration_minutes: v })}
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Capacité</Text>
                    <TextInput
                      testID="form-capacity"
                      value={form.capacity}
                      onChangeText={(v) => setForm({ ...form, capacity: v })}
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  </View>
                </View>

                <Text style={styles.formLabel}>Instructeur</Text>
                <TextInput
                  testID="form-instructor"
                  value={form.instructor}
                  onChangeText={(v) => setForm({ ...form, instructor: v })}
                  style={styles.input}
                  placeholder="Nom de l'instructeur"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={styles.formLabel}>URL image (facultatif)</Text>
                <TextInput
                  value={form.image}
                  onChangeText={(v) => setForm({ ...form, image: v })}
                  style={styles.input}
                  placeholder="https://..."
                  placeholderTextColor={colors.textSecondary}
                />

                <TouchableOpacity
                  testID="form-save-btn"
                  onPress={save}
                  disabled={saving}
                  style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
                >
                  <Text style={styles.primaryBtnText}>{saving ? "Enregistrement..." : "Enregistrer"}</Text>
                </TouchableOpacity>
                <View style={{ height: spacing.xl }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Bulk Create Modal */}
      <Modal visible={bulkModalOpen} animationType="slide" transparent onRequestClose={() => setBulkModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalWrap}
          >
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Créer plusieurs cours</Text>
                <TouchableOpacity testID="close-bulk-modal" onPress={() => setBulkModalOpen(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.hint}>
                  Créez rapidement une série de cours récurrents (ex. Yoga tous les lundis et mercredis pendant 4 semaines).
                </Text>

                <Text style={styles.formLabel}>Titre</Text>
                <TextInput
                  testID="bulk-title"
                  value={bulkForm.title}
                  onChangeText={(v) => setBulkForm({ ...bulkForm, title: v })}
                  style={styles.input}
                  placeholder="ex. Yoga matinal"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  value={bulkForm.description}
                  onChangeText={(v) => setBulkForm({ ...bulkForm, description: v })}
                  style={[styles.input, { height: 60 }]}
                  multiline
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={styles.formLabel}>Catégorie</Text>
                <View style={styles.chipsRow}>
                  {CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      testID={`bulk-category-${c}`}
                      onPress={() => setBulkForm({ ...bulkForm, category: c })}
                      style={[
                        styles.chip,
                        bulkForm.category === c && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.chipText, bulkForm.category === c && { color: "#fff" }]}>
                        {CATEGORY_LABELS[c]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.formLabel}>Type</Text>
                <View style={styles.chipsRow}>
                  {["group", "private"].map((k) => (
                    <TouchableOpacity
                      key={k}
                      testID={`bulk-kind-${k}`}
                      onPress={() => setBulkForm({ ...bulkForm, kind: k })}
                      style={[
                        styles.chip,
                        bulkForm.kind === k && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.chipText, bulkForm.kind === k && { color: "#fff" }]}>
                        {k === "group" ? "Groupe" : "Privé"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Date de début</Text>
                    <NativePicker
                      kind="date"
                      testID="bulk-start-date"
                      value={bulkForm.startDate}
                      onChangeText={(v) => setBulkForm({ ...bulkForm, startDate: v })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Heure</Text>
                    <NativePicker
                      kind="time"
                      testID="bulk-time"
                      value={bulkForm.time}
                      onChangeText={(v) => setBulkForm({ ...bulkForm, time: v })}
                    />
                  </View>
                </View>

                <Text style={styles.formLabel}>Jours de la semaine</Text>
                <View style={styles.daysRow}>
                  {DAY_LABELS.map((label, idx) => {
                    const active = bulkForm.days[idx];
                    return (
                      <TouchableOpacity
                        key={label}
                        testID={`bulk-day-${idx}`}
                        onPress={() => {
                          const next = [...bulkForm.days];
                          next[idx] = !next[idx];
                          setBulkForm({ ...bulkForm, days: next });
                        }}
                        style={[
                          styles.dayChip,
                          active && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                      >
                        <Text style={[styles.dayChipText, active && { color: "#fff" }]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Nombre de semaines</Text>
                    <TextInput
                      testID="bulk-weeks"
                      value={bulkForm.weeks}
                      onChangeText={(v) => setBulkForm({ ...bulkForm, weeks: v })}
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Durée (min)</Text>
                    <TextInput
                      testID="bulk-duration"
                      value={bulkForm.duration_minutes}
                      onChangeText={(v) => setBulkForm({ ...bulkForm, duration_minutes: v })}
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Capacité</Text>
                    <TextInput
                      testID="bulk-capacity"
                      value={bulkForm.capacity}
                      onChangeText={(v) => setBulkForm({ ...bulkForm, capacity: v })}
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Instructeur</Text>
                    <TextInput
                      testID="bulk-instructor"
                      value={bulkForm.instructor}
                      onChangeText={(v) => setBulkForm({ ...bulkForm, instructor: v })}
                      style={styles.input}
                      placeholder="Nom"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                <Text style={styles.formLabel}>URL image (facultatif)</Text>
                <TextInput
                  value={bulkForm.image}
                  onChangeText={(v) => setBulkForm({ ...bulkForm, image: v })}
                  style={styles.input}
                  placeholder="https://..."
                  placeholderTextColor={colors.textSecondary}
                />

                <View style={styles.previewBox}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  <Text style={styles.previewText} testID="bulk-preview-count">
                    {computeBulkDates(bulkForm).length} cours seront créés
                  </Text>
                </View>

                <TouchableOpacity
                  testID="bulk-save-btn"
                  onPress={saveBulk}
                  disabled={bulkSaving}
                  style={[styles.primaryBtn, bulkSaving && { opacity: 0.7 }]}
                >
                  <Text style={styles.primaryBtnText}>
                    {bulkSaving ? "Création..." : "Créer les cours"}
                  </Text>
                </TouchableOpacity>
                <View style={{ height: spacing.xl }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const STATUS_FR: Record<string, string> = {
  confirmed: "confirmée",
  pending: "en attente",
  cancelled: "annulée",
  attended: "présent",
};

function AttendeesInline({ classId, onChange, onMessage }: { classId: string; onChange: () => void; onMessage: (m: { text: string; kind: "success" | "error" }) => void }) {
  const [open, setOpen] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.classBookings(classId);
      setBookings(list);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const attend = async (id: string) => {
    try {
      const res = await api.attend(id);
      if (res.forfait_consumed) {
        onMessage({
          text: `Présence enregistrée. Forfait "${res.forfait_consumed.name}" : ${res.forfait_consumed.remaining_after} séances restantes`,
          kind: "success",
        });
      } else {
        onMessage({ text: "Présence enregistrée (aucun forfait actif)", kind: "success" });
      }
      await load();
      onChange();
    } catch (e: any) {
      onMessage({ text: e?.message || "Erreur", kind: "error" });
    }
  };
  const confirm = async (id: string) => { await api.confirm(id); await load(); onChange(); };
  const cancel = async (id: string) => { await api.cancelBooking(id); await load(); onChange(); };

  return (
    <View style={{ marginTop: spacing.md }}>
      <TouchableOpacity
        testID={`toggle-attendees-${classId}`}
        onPress={() => setOpen((v) => !v)}
        style={styles.attendeesToggle}
      >
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.textPrimary} />
        <Text style={styles.attendeesToggleText}>
          {open ? "Masquer" : "Voir"} les inscrits
        </Text>
      </TouchableOpacity>
      {open && (
        <View style={{ marginTop: spacing.sm }}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : bookings.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: fontSizes.sm }}>
              Aucun inscrit
            </Text>
          ) : (
            bookings.map((b) => (
              <View key={b.id} style={styles.attendeeRow} testID={`attendee-row-${b.id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.attendeeName}>{b.user_name}</Text>
                  <Text style={styles.attendeeMeta}>
                    {b.user_email} · {STATUS_FR[b.status] || b.status}
                  </Text>
                </View>
                {b.status === "pending" && (
                  <TouchableOpacity
                    testID={`confirm-${b.id}`}
                    onPress={() => confirm(b.id)}
                    style={[styles.smallBtn, { backgroundColor: colors.accentMoss }]}
                  >
                    <Text style={styles.smallBtnText}>Confirmer</Text>
                  </TouchableOpacity>
                )}
                {(b.status === "confirmed" || b.status === "pending") && (
                  <TouchableOpacity
                    testID={`attend-${b.id}`}
                    onPress={() => attend(b.id)}
                    style={[styles.smallBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.smallBtnText}>Présent</Text>
                  </TouchableOpacity>
                )}
                {b.status !== "cancelled" && b.status !== "attended" && (
                  <TouchableOpacity
                    testID={`cancel-attendee-${b.id}`}
                    onPress={() => cancel(b.id)}
                    style={[
                      styles.smallBtn,
                      { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.error },
                    ]}
                  >
                    <Text style={[styles.smallBtnText, { color: colors.error }]}>Annuler</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: fontSizes.xxl, color: colors.textPrimary, fontWeight: "500" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  addBtnText: { color: "#fff", fontWeight: "600" },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  bulkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bulkBtnText: { color: colors.primary, fontWeight: "600" },
  daysRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, gap: 4 },
  dayChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
  },
  dayChipText: { color: colors.textPrimary, fontSize: fontSizes.xs, fontWeight: "600" },
  previewBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewText: { color: colors.textPrimary, fontWeight: "500" },
  tabs: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.lg, gap: 8, marginBottom: spacing.md },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textPrimary, fontSize: fontSizes.sm },
  tabTextActive: { color: "#fff", fontWeight: "600" },
  banner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  center: { padding: spacing.xl, alignItems: "center" },
  emptyText: { color: colors.textSecondary, marginTop: spacing.md },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTop: { flexDirection: "row" },
  cardTitle: { fontSize: fontSizes.md, color: colors.textPrimary, fontWeight: "500" },
  cardMeta: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 },
  cardSpot: { fontSize: fontSizes.sm, color: colors.primary, marginTop: 4, fontWeight: "600" },
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
  sectionTitle: {
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontWeight: "600",
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
  hint: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 4 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchTitle: { fontSize: fontSizes.md, color: colors.textPrimary, fontWeight: "500" },
  switchHint: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
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
  formLabel: {
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: 4,
    textTransform: "uppercase",
  },
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
  attendeesToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attendeesToggleText: { color: colors.textPrimary, fontSize: fontSizes.sm, fontWeight: "500" },
  attendeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    flexWrap: "wrap",
  },
  attendeeName: { color: colors.textPrimary, fontSize: fontSizes.sm, fontWeight: "500" },
  attendeeMeta: { color: colors.textSecondary, fontSize: fontSizes.xs, marginTop: 2 },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  smallBtnText: { color: "#fff", fontSize: fontSizes.xs, fontWeight: "600" },
});

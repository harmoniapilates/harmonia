import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, radius, fontSizes } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const DISMISS_KEY = "install_prompt_dismissed_at";
const DISMISS_DAYS = 7; // don't show again for 7 days after dismissal

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari
  if ((window.navigator as any).standalone) return true;
  // Others
  return window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    if (isStandalone()) return; // already installed

    (async () => {
      const dismissed = await storage.getItem<number>(DISMISS_KEY, 0);
      if (dismissed && Date.now() - dismissed < DISMISS_DAYS * 24 * 3600 * 1000) return;

      if (isIos()) {
        // iOS: show manual instructions after a short delay
        setTimeout(() => setVisible(true), 1200);
        return;
      }

      // Android / desktop Chrome: listen for the install prompt event
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setVisible(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      window.addEventListener("appinstalled", () => {
        setVisible(false);
        setDeferredPrompt(null);
      });
      return () => window.removeEventListener("beforeinstallprompt", handler);
    })();
  }, []);

  const install = async () => {
    if (isIos()) {
      setShowIosModal(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const dismiss = async () => {
    setVisible(false);
    await storage.setItem(DISMISS_KEY, Date.now());
  };

  if (Platform.OS !== "web" || !visible) return null;

  return (
    <>
      <View style={styles.banner} testID="install-banner">
        <View style={styles.iconWrap}>
          <Ionicons name="phone-portrait-outline" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Installez l&apos;application</Text>
          <Text style={styles.subtitle}>
            Accès rapide depuis votre écran d&apos;accueil, comme une vraie app.
          </Text>
        </View>
        <TouchableOpacity testID="install-btn" onPress={install} style={styles.installBtn}>
          <Text style={styles.installBtnText}>Installer</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="install-dismiss" onPress={dismiss} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* iOS instructions modal */}
      <Modal
        visible={showIosModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIosModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Installer sur iPhone</Text>
              <TouchableOpacity onPress={() => setShowIosModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
              <Text style={styles.stepText}>
                Appuyez sur le bouton{" "}
                <Ionicons name="share-outline" size={18} color={colors.primary} />
                {" "}Partager en bas de Safari
              </Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
              <Text style={styles.stepText}>
                Faites défiler et choisissez{"\n"}
                <Text style={{ fontWeight: "600" }}>« Sur l&apos;écran d&apos;accueil »</Text>
              </Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
              <Text style={styles.stepText}>
                Appuyez sur <Text style={{ fontWeight: "600" }}>Ajouter</Text> en haut à droite. C&apos;est prêt !
              </Text>
            </View>

            <TouchableOpacity
              testID="ios-modal-close"
              onPress={() => setShowIosModal(false)}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>J&apos;ai compris</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute" as any,
    bottom: 84,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 999,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.textPrimary, fontWeight: "600", fontSize: fontSizes.sm },
  subtitle: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  installBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  installBtnText: { color: "#fff", fontWeight: "600", fontSize: fontSizes.sm },
  closeBtn: { padding: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
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
  modalTitle: { fontSize: fontSizes.xl, fontWeight: "500", color: colors.textPrimary },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginVertical: 8,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: "#fff", fontWeight: "700" },
  stepText: { color: colors.textPrimary, fontSize: fontSizes.md, flex: 1, lineHeight: 22 },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: fontSizes.md },
});

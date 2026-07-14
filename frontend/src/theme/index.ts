import themeConfig from "../../theme.config.json";

// ---------- Text defaults (mirror backend BrandingTexts) ----------
const defaultTexts = {
  loginHeroOverline: "BIEN-ÊTRE · CALME",
  loginTitle: "Se connecter",
  loginSubtitle: "Bienvenue. Réservez votre prochaine séance.",
  loginEmailLabel: "Email",
  loginPasswordLabel: "Mot de passe",
  loginSubmit: "Se connecter",
  loginSubmitLoading: "Connexion...",
  loginForgotPassword: "Mot de passe oublié ?",
  loginNoAccount: "Pas encore de compte ?",
  loginRegisterLink: "S'inscrire",
  forgotTitle: "Mot de passe oublié",
  forgotBody:
    "Contactez le propriétaire pour réinitialiser votre mot de passe. Il pourra vous en attribuer un nouveau directement depuis son espace de gestion.",
  forgotOk: "J'ai compris",
  registerTitle: "Créer un compte",
  registerSubtitle: "Rejoignez notre communauté.",
  registerNameLabel: "Prénom & nom",
  registerEmailLabel: "Email",
  registerPasswordLabel: "Mot de passe",
  registerOwnerToggle: "Je suis propriétaire",
  registerAdminCodeLabel: "Code Propriétaire",
  registerSubmit: "Créer mon compte",
  registerSubmitLoading: "Création...",
  registerHasAccount: "Déjà inscrit ?",
  registerLoginLink: "Se connecter",
  calendarWelcomePrefix: "BONJOUR",
  calendarTitle: "Calendrier des cours",
  calendarFilterAll: "Tous",
  calendarFilterYoga: "Yoga",
  calendarFilterPilates: "Pilates",
  calendarNoClasses: "Aucun cours prévu ce jour",
  classBookBtn: "Réserver",
  classBookingConfirmed: "Réservation confirmée",
  classBookingCancel: "Annuler ma réservation",
  classFull: "Complet",
  classAlreadyBooked: "Vous avez déjà réservé",
  bookingsTitle: "Mes réservations",
  bookingsEmpty: "Aucune réservation pour le moment",
  bookingsForfaitsTitle: "Mes forfaits",
  bookingsForfaitsEmpty: "Aucun forfait actif",
  profileTitle: "Mon compte",
  profileLogout: "Se déconnecter",
  tabCalendar: "Calendrier",
  tabBookings: "Réservations",
  tabProfile: "Compte",
  tabAdmin: "Gestion",
};

const CACHE_KEY = "__harmonia_theme_v3";

type CachedTheme = {
  business_name?: string;
  business_tagline?: string;
  browser_title?: string;
  colors?: Partial<typeof themeConfig.colors>;
  images?: Partial<typeof themeConfig.images> & { faviconUrl?: string; appIconUrl?: string };
  texts?: Partial<typeof defaultTexts>;
};

function loadCache(): CachedTheme {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const cached = loadCache();

// ---------- Merge cache over static defaults ----------
export const colors = {
  ...themeConfig.colors,
  ...(cached.colors || {}),
} as typeof themeConfig.colors;

export const images = {
  ...themeConfig.images,
  ...(cached.images || {}),
} as typeof themeConfig.images & { faviconUrl?: string; appIconUrl?: string };

export const business = {
  name: cached.business_name || themeConfig.business.name,
  tagline: cached.business_tagline || themeConfig.business.tagline,
};

export const branding = {
  title: cached.browser_title || (themeConfig as any).branding?.title || themeConfig.business.name,
  faviconUrl: (cached.images?.faviconUrl as string) || (themeConfig as any).branding?.faviconUrl || "",
  appIconUrl: (cached.images?.appIconUrl as string) || (themeConfig as any).branding?.appIconUrl || "",
};

export const texts = {
  ...defaultTexts,
  ...(cached.texts || {}),
};

// ---------- Async fetch fresh theme from backend (for next reload) ----------
export async function refreshThemeFromBackend(backendUrl?: string) {
  if (typeof window === "undefined" || !window.localStorage) return;
  const base = backendUrl || (process.env.EXPO_PUBLIC_BACKEND_URL as string | undefined);
  if (!base) return;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/settings/public`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = await res.json();
    const cacheable: CachedTheme = {
      business_name: data.business_name,
      business_tagline: data.business_tagline,
      browser_title: data.browser_title,
      colors: data.colors,
      images: data.images,
      texts: data.texts,
    };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cacheable));
    // Mutate exported objects so anything that reads them later (JSX rendering,
    // not already-created StyleSheet objects) sees the fresh values.
    Object.assign(colors, data.colors || {});
    Object.assign(images, data.images || {});
    business.name = data.business_name || business.name;
    business.tagline = data.business_tagline || business.tagline;
    branding.title = data.browser_title || branding.title;
    branding.faviconUrl = data.images?.faviconUrl || branding.faviconUrl;
    branding.appIconUrl = data.images?.appIconUrl || branding.appIconUrl;
    Object.assign(texts, data.texts || {});
  } catch {
    // ignore network errors, use cached/default values
  }
}

// ---------- Static design tokens ----------
export const theme = themeConfig;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  huge: 36,
};

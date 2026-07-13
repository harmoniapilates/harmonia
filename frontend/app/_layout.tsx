import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, Platform, StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider } from "@/src/context/auth";
import { branding, colors } from "@/src/theme";
import InstallPrompt from "@/src/components/InstallPrompt";

LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

// Web-only bootstrap: inject the PWA manifest / iOS meta tags, register the
// service worker (needed for the Chrome install prompt) and fire an early
// warm-up ping to wake the free-tier backend. This runs as early as the JS
// bundle is parsed because `app.json` uses `web.output: "single"` and the
// static HTML template can't be customised via `+html.tsx` in that mode.
if (Platform.OS === "web" && typeof window !== "undefined" && typeof document !== "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const base =
      (typeof process !== "undefined" && (process.env as any)?.EXPO_BASE_URL) ||
      "/fr/app";
    const normBase = base.endsWith("/") ? base.slice(0, -1) : base;

    const ensureLink = (rel: string, href: string, extra?: Record<string, string>) => {
      const selector = `link[rel="${rel}"]` + (extra?.sizes ? `[sizes="${extra.sizes}"]` : "");
      if (document.head.querySelector(selector)) return;
      const link = document.createElement("link");
      link.rel = rel;
      link.href = href;
      if (extra) Object.entries(extra).forEach(([k, v]) => link.setAttribute(k, v));
      document.head.appendChild(link);
    };
    const replaceLink = (rel: string, href: string) => {
      document.head.querySelectorAll(`link[rel="${rel}"]`).forEach((el) => el.remove());
      const link = document.createElement("link");
      link.rel = rel;
      link.href = href;
      document.head.appendChild(link);
    };
    const ensureMeta = (name: string, content: string) => {
      if (document.head.querySelector(`meta[name="${name}"]`)) return;
      const meta = document.createElement("meta");
      meta.name = name;
      meta.content = content;
      document.head.appendChild(meta);
    };

    // Custom browser tab title (from theme.config.json)
    if (branding?.title) {
      document.title = branding.title;
    }

    // Custom favicon override (from theme.config.json → branding.faviconUrl)
    if (branding?.faviconUrl) {
      replaceLink("icon", branding.faviconUrl);
      replaceLink("shortcut icon", branding.faviconUrl);
    }

    // PWA manifest + iOS meta tags
    if (branding?.appIconUrl) {
      // Build a dynamic manifest that uses the custom app icon URL so the
      // PWA install prompt shows the owner's branding instead of the default.
      const dynamicManifest = {
        name: (branding as any).title || "Harmonia",
        short_name: (branding as any).title || "Harmonia",
        start_url: `${normBase}/`,
        scope: `${normBase}/`,
        display: "standalone",
        background_color: "#FDFBF7",
        theme_color: "#000000",
        icons: [
          { src: branding.appIconUrl, sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: branding.appIconUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      };
      const dataUri =
        "data:application/manifest+json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(dynamicManifest));
      replaceLink("manifest", dataUri);
      // Apple touch icon uses the same custom image
      document.head.querySelectorAll('link[rel="apple-touch-icon"]').forEach((el) => el.remove());
      const apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      apple.setAttribute("sizes", "192x192");
      apple.href = branding.appIconUrl;
      document.head.appendChild(apple);
    } else {
      ensureLink("manifest", `${normBase}/manifest.webmanifest`);
      ensureLink("apple-touch-icon", `${normBase}/icon-192.png`, { sizes: "192x192" });
    }
    ensureMeta("apple-mobile-web-app-capable", "yes");
    ensureMeta("apple-mobile-web-app-status-bar-style", "default");
    ensureMeta("apple-mobile-web-app-title", (branding as any)?.title || "Harmonia");
    ensureMeta("theme-color", "#000000");
    ensureMeta("mobile-web-app-capable", "yes");

    // Capture the install prompt event as early as possible so InstallPrompt
    // can display it even if it fires before React mounts.
    (window as any).__harmoniaInstallPrompt = null;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      (window as any).__harmoniaInstallPrompt = e;
      window.dispatchEvent(new Event("__harmoniaInstallReady"));
    });
    window.addEventListener("appinstalled", () => {
      (window as any).__harmoniaInstallPrompt = null;
    });

    // Register the service worker (required for the Chrome install prompt).
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register(`${normBase}/sw.js`).catch(() => {});
      });
    }

    // Warm-up ping: wake Render free-tier before the user reaches the login form.
    const backend = (process.env as any)?.EXPO_PUBLIC_BACKEND_URL as string | undefined;
    if (backend) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 8000);
      fetch(backend.replace(/\/$/, "") + "/api/", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => {});
    }
  } catch {
    // ignore
  }
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
        <InstallPrompt />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

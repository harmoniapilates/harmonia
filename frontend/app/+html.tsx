// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#7FA15D" />

        {/* PWA manifest (installable app) */}
        <link rel="manifest" href="/manifest.webmanifest" />

        {/* iOS "Add to Home Screen" support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Harmonia" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />

        {/*
          Disable body scrolling on web to make ScrollView components work correctly.
          If you want to enable scrolling, remove `ScrollViewStyleReset` and
          set `overflow: auto` on the body style below.
        */}
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body > div:first-child { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }
            `,
          }}
        />

        {/*
          Register the service worker (required for the Chrome/Android install prompt)
          and fire an early warm-up ping to the backend so the free-tier server
          starts booting before the user reaches the login screen.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function () {
                    navigator.serviceWorker.register('./sw.js').catch(function () {});
                  });
                }
                // Capture the install prompt event before React mounts, otherwise
                // it may fire too early and get lost.
                window.__harmoniaInstallPrompt = null;
                window.addEventListener('beforeinstallprompt', function (e) {
                  e.preventDefault();
                  window.__harmoniaInstallPrompt = e;
                  window.dispatchEvent(new Event('__harmoniaInstallReady'));
                });
                window.addEventListener('appinstalled', function () {
                  window.__harmoniaInstallPrompt = null;
                });
                try {
                  var backend = "${process.env.EXPO_PUBLIC_BACKEND_URL || ""}";
                  if (backend) {
                    // Fire-and-forget warm-up: wakes Render free-tier before the
                    // user submits credentials. Short timeout so it never blocks.
                    var ctrl = new AbortController();
                    setTimeout(function () { ctrl.abort(); }, 8000);
                    fetch(backend.replace(/\\/$/, "") + "/api/", {
                      method: "GET",
                      cache: "no-store",
                      signal: ctrl.signal,
                    }).catch(function () {});
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </body>
    </html>
  );
}

# Personalizzare l'icona dell'app (favicon e icona installazione)

Ci sono **due modi** per cambiare l'icona che vedi nella scheda del browser e
quella che appare quando l'utente installa l'app sul telefono.

---

## 🟢 Metodo rapido — via `theme.config.json` (senza ricompilare gli asset)

Nel file `frontend/theme.config.json` c'è la sezione `branding`:

```json
"branding": {
  "title": "Harmonia — Réservation",
  "faviconUrl": "",
  "appIconUrl": ""
}
```

- **`title`**: il titolo mostrato nella scheda del browser (accanto al favicon).
- **`faviconUrl`**: incolla qui l'URL PUBBLICO di un'immagine PNG (es. tuo sito, imgur, Cloudinary).
  Verrà usata come favicon del browser al posto di quella di default.
  Esempio: `"faviconUrl": "https://www.serenabollino.com/fr/app/mia-icona.png"`
- **`appIconUrl`**: URL PUBBLICO di un'immagine PNG **quadrata almeno 512×512**.
  Verrà usata come icona dell'app quando l'utente la installa sul telefono
  (banner "Installer l'application") e come apple-touch-icon.

Dopo la modifica, ricompila il frontend (StackBlitz → `npx expo export --platform web --output-dir dist`)
e ricarica su Aruba via FileZilla.

> ⚠️ Deve essere un URL **HTTPS pubblicamente accessibile**, non un file locale.

---

## 🟡 Metodo tradizionale — sostituire i PNG (branding pulito)

Se preferisci hostare le icone insieme all'app, sostituisci **tutti** questi file
con i tuoi (mantieni gli stessi nomi e dimensioni):

| File | Dimensione | Uso |
|------|-----------|-----|
| `frontend/assets/images/favicon.png` | 48×48 o 64×64 | Favicon browser |
| `frontend/assets/images/icon.png` | 1024×1024 | Icona iOS/Android nativa |
| `frontend/assets/images/adaptive-icon.png` | 1024×1024 | Icona Android adaptive |
| `frontend/assets/images/splash-image.png` | 1284×2778 (o simile) | Splash screen |
| `frontend/public/icon-192.png` | 192×192 | PWA install (Chrome/Android) |
| `frontend/public/icon-512.png` | 512×512 | PWA install (Chrome/Android) |

Dopo la sostituzione, ricompila e ricarica come sopra.

---

## 🔧 Precedenza

Se metti un URL in `branding.faviconUrl` o `branding.appIconUrl`, questo
**sovrascrive a runtime** i PNG fisici. Utile per fare A/B rapidi senza
ricompilare gli asset (comunque devi ricompilare il bundle JS).

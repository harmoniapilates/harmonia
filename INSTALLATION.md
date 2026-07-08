# 🌿 Guida semplicissima – Solo trascina file, niente Git

Questa guida è per **totale principianti**. Usi solo il tuo browser web e FileZilla. Nessun comando da terminale, nessuna riga di codice, nessun Git.

---

## ⏱️ Tempo: 45 minuti (una volta sola)
## 💰 Costi: 0€ oltre al tuo hosting Aruba
## 📱 I clienti installano l'app da un pulsante nel browser (no App Store)

---

## 📥 PASSO 0 – Scaricare il codice della tua app

1. Nell'interfaccia Emergent (dove stiamo scrivendo ora), naviga fino al file `wellness-app.zip` che ho preparato
2. Clicca il pulsante di **download** (di solito è un'icona ⬇️ o "Download" nel menu contestuale)
3. Salva il file sul tuo computer
4. **Fai doppio click sul file ZIP** per aprirlo → vedrai una cartella `wellness-app-package/`
5. **Estraila** sul Desktop (tasto destro → "Estrai qui" o "Extract")

Adesso hai una cartella con dentro:
- `backend/` (il cervello dell'app)
- `frontend/` (l'interfaccia grafica)
- `INSTALLATION.md` (questa guida)

✅ **Fatto!** Il codice è sul tuo computer.

---

## 🟢 PASSO 1 – Creare il database gratuito (5 minuti)

Il database salva le prenotazioni e i clienti.

1. Vai su 👉 <https://www.mongodb.com/cloud/atlas/register>
2. Registrati con la tua email → clicca il link di conferma nell'email che ricevi
3. Ti chiede "What describes you?" → scegli qualunque risposta
4. Ti chiede "What is your goal?" → qualunque
5. Ti chiede "Preferred language?" → **Python**
6. Clicca **Finish**
7. Nella schermata "Deploy your database":
   - Piano: **M0 (FREE)** — è quello a sinistra, deve essere gratuito
   - Provider: **AWS**
   - Region: **Frankfurt** (o quella più vicina a te)
   - Cluster name: lascialo come è (es. `Cluster0`)
8. Clicca **"Create Deployment"** in basso a destra

### Ora ti chiede di creare un utente
9. **Username**: `admin`
10. **Password**: clicca **"Autogenerate Secure Password"** → poi clicca **"Copy"** → **incolla la password su un foglio Note del tuo PC**, la userai fra 3 minuti
11. Clicca **"Create Database User"**

### Ti chiede da dove ci si può connettere
12. Clicca **"Add a Different IP Address"**
13. Nel campo IP scrivi esattamente questo: `0.0.0.0/0`
14. Descrizione: `render`
15. Clicca **"Add Entry"**
16. Clicca **"Finish and Close"** → **"Go to Overview"**

### Prendi la stringa di collegamento
17. Nella dashboard, clicca il pulsante **"Connect"** sul tuo cluster
18. Scegli **"Drivers"**
19. Vedrai una riga tipo:
   ```
   mongodb+srv://admin:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
   ```
20. **Copia questa riga** in un altro foglio Note sul tuo PC
21. **Sostituisci `<password>`** (comprese le parentesi angolari) con la password che avevi salvato al punto 10

Esempio finale:
```
mongodb+srv://admin:X7yN2pQ8wR@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```

✅ **Passo 1 fatto!** Ti sei creato un database gratuito.

---

## 🟢 PASSO 2 – Caricare il codice su GitLab (10 minuti)

⚠️ Ti prometto che è **facilissimo**: solo trascinamento file nel browser. Nessun comando.

Ci serve GitLab (gratuito, alternativa europea a GitHub) come "ponte" per far arrivare il codice a Render.

### 2.1 Registrati su GitLab
1. Vai su 👉 <https://gitlab.com/users/sign_up>
2. Compila email, password, nome utente
3. Conferma l'email

### 2.2 Crea un progetto
4. Dopo il login, clicca **"Create new project"** (in alto a destra)
5. Scegli **"Create blank project"**
6. Compila:
   - **Project name**: `wellness-app`
   - **Visibility Level**: **Private** (solo tu)
   - **Initialize repository with a README**: ✅ ATTIVATO
7. Clicca **"Create project"**

### 2.3 Carica i file col mouse (drag & drop!)
8. Nella pagina del progetto, clicca **"+"** (in alto vicino al nome del progetto)
9. Clicca **"Upload file"**
10. **Ora la parte magica**: apri sul tuo computer la cartella `wellness-app-package/` che hai estratto al Passo 0
11. Seleziona **tutti i file e cartelle** dentro (Ctrl+A su Windows, Cmd+A su Mac)
12. Trascinali dentro la finestra di GitLab
13. In basso, dove chiede "Commit message", scrivi: `Codice iniziale`
14. Clicca **"Upload file"**
15. Aspetta 30 secondi che carichi

Perfetto! Il codice è online su GitLab. Non hai scritto neanche una riga di comando.

✅ **Passo 2 fatto!** Il codice è online.

---

## 🟢 PASSO 3 – Mettere online il "cervello" su Render (10 minuti)

Il cervello (backend) fa tutti i calcoli. Lo ospita **Render.com**, gratis.

1. Vai su 👉 <https://render.com>
2. Clicca **"Get Started for Free"**
3. Clicca **"GitLab"** e accedi con il tuo account GitLab (crea la connessione, autorizza)
4. Nel dashboard Render, clicca **"+ New"** (in alto) → **"Web Service"**
5. Nella lista dei repository, scegli `wellness-app` → clicca **"Connect"**
6. Compila i campi così:

| Campo | Valore da inserire |
|---|---|
| **Name** | `wellness-api` |
| **Region** | Frankfurt |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | **Free** ⭐ (lo trovi scorrendo in basso) |

7. Scorri in basso fino a **"Environment Variables"** e clicca **"Add Environment Variable"** per ogni riga:

| Key (nome) | Value (valore) |
|---|---|
| `MONGO_URL` | La stringa MongoDB dal Passo 1 (con la password già dentro) |
| `DB_NAME` | `wellness_booking` |
| `JWT_SECRET` | Una lunga stringa a caso → generala qui: <https://1password.com/password-generator/> (scegli "Random Password", 40+ caratteri, copia) |
| `ADMIN_CODE` | Un codice segreto SOLO PER TE, es. `MIOSTUDIO2026` |

8. Clicca il pulsante **"Deploy Web Service"** in fondo
9. Aspetta 3-5 minuti. Vedi scorrere del testo verde/bianco. Alla fine appare 🟢 **"Live"**.
10. **Copia l'URL** che appare sotto il nome del servizio, sarà tipo:
    ```
    https://wellness-api.onrender.com
    ```
    Salvalo nel tuo foglio Note.

### Verifica che funziona
Apri quell'URL nel browser aggiungendo `/api/` alla fine, cioè:
`https://wellness-api.onrender.com/api/`

Devi vedere: `{"message":"Wellness Booking API","status":"ok"}`

✅ **Passo 3 fatto!** Il cervello è online.

---

## 🟢 PASSO 4 – Evitare che il cervello si addormenti (2 minuti)

Render gratuito addormenta il servizio dopo 15 min di pausa. **UptimeRobot** lo tiene sveglio pizzicandolo ogni 5 min.

1. Vai su 👉 <https://uptimerobot.com/signUp>
2. Registrati (email + password, no carta di credito)
3. Conferma l'email
4. Nel dashboard clicca **"+ Add New Monitor"** (in alto a sinistra)
5. Compila:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: `Wellness keep-alive`
   - **URL**: `https://wellness-api.onrender.com/api/` (con `/api/` alla fine!)
   - **Monitoring Interval**: 5 minutes
6. Clicca **"Create Monitor"**
7. Dopo 5 minuti, controlla che il pallino sia verde 🟢

✅ **Passo 4 fatto!** Il cervello resta sempre acceso.

---

## 🟢 PASSO 5 – Personalizzare colori, nome, immagini (5 minuti)

Sul tuo computer:
1. Apri la cartella `wellness-app-package/frontend/`
2. Trova il file `theme.config.json`
3. Aprilo con **Blocco Note** (Windows) o **TextEdit** (Mac)
4. Modifica i valori dopo i due punti. **NON toccare** le virgolette `"` né le parentesi `{ }`:

```json
{
  "business": {
    "name": "IL MIO STUDIO YOGA",
    "tagline": "IL MIO SLOGAN"
  },
  "colors": {
    "primary": "#7FA15D",
    "secondary": "#E2725B",
    ...
  },
  "images": {
    "loginHero": "https://miosito.it/img/copertina.jpg",
    ...
  }
}
```

5. Salva il file (Ctrl+S / Cmd+S)

**Consigli**:
- **Colori**: vai su <https://coolors.co/generate>, genera una palette, prendi i codici `#XXXXXX` e mettili al posto di quelli attuali
- **Immagini**: caricale prima sul tuo hosting Aruba (via FTP), poi metti gli URL. Oppure usa foto gratis di Unsplash.
- **Non cancellare** nessun campo, modifica solo i valori

✅ **Passo 5 fatto!** L'app avrà i tuoi colori.

---

## 🟢 PASSO 6 – Ricaricare il codice modificato su GitLab (2 min)

Il tuo `theme.config.json` è cambiato → devi caricarlo di nuovo su GitLab così Render costruirà l'app aggiornata.

1. Vai sul tuo progetto GitLab → naviga fino a `frontend/theme.config.json`
2. Clicca **Edit** (icona matita) → **"Edit single file"**
3. Cancella tutto il contenuto e incolla il tuo file aggiornato (Ctrl+A → Ctrl+V)
4. In basso, **Commit message**: `Personalizzazione tema`
5. Clicca **"Commit changes"**

**⚠️ IMPORTANTE**: modifica anche il file `frontend/.env`:
6. Nel repository GitLab, apri `frontend/.env` → Edit
7. Sostituisci tutto il contenuto con:
   ```
   EXPO_PUBLIC_BACKEND_URL=https://wellness-api.onrender.com
   ```
   (usa l'URL Render del Passo 3)
8. Commit changes

✅ **Passo 6 fatto!** Il codice è aggiornato.

---

## 🟢 PASSO 7 – Costruire l'app pronta per Aruba (5 minuti)

Per costruire i file da caricare su Aruba, il modo più semplice è usare **StackBlitz** direttamente nel browser (nessuna installazione locale).

1. Vai su 👉 <https://stackblitz.com/> e clicca **"Sign in with GitLab"**
2. Autorizza l'accesso
3. Nella barra in alto scrivi il nome del tuo repository → cerca e apri `wellness-app`
4. StackBlitz apre l'editor. Aspetta 30 secondi che carichi tutto.
5. In basso apri il terminale (icona `>_` o tasto Ctrl+`)
6. Scrivi questi due comandi (uno alla volta):
   ```
   cd frontend
   npx expo export --platform web --output-dir dist
   ```
7. Aspetta ~2 minuti (finisce quando vedi il prompt tornare)
8. Sulla sinistra vedi apparire una nuova cartella **`frontend/dist/`**
9. Clicca col tasto destro su `dist` → **"Download"** → viene generato uno ZIP

10. Sul tuo PC, scompatta lo ZIP → hai una cartella `dist/` piena di file (index.html, assets, ecc.)

> **In alternativa**, se StackBlitz ti sembra complicato: chiedimi di farlo io direttamente da qui e ti do il pacchetto già pronto da caricare. Ma StackBlitz ti dà controllo completo per rifarlo ogni volta che modifichi qualcosa.

✅ **Passo 7 fatto!** Hai i file finali da mettere su Aruba.

---

## 🟢 PASSO 8 – Caricare l'app su Aruba con FileZilla (5 min)

1. Scarica FileZilla da 👉 <https://filezilla-project.org/> → Client → Windows/Mac
2. Aprilo
3. In alto: **File → Site Manager → New Site**
4. Inserisci le credenziali FTP (le trovi nel tuo pannello Aruba):
   - **Host**: es. `ftp.tuosito.it`
   - **Utente e Password**: quelli forniti da Aruba
5. Clicca **"Connect"**
6. Sul lato destro (server Aruba), vai in `httpdocs/` (o `public_html/`, dipende dal tuo piano)
7. Clicca col tasto destro sullo spazio bianco → **"Create Directory"** → chiamala `reservation`
8. Fai doppio click su `reservation` per entrarci
9. Sul lato sinistro (il tuo PC), naviga fino alla cartella `dist/` scompattata al Passo 7
10. Seleziona **tutti i file dentro `dist/`** (Ctrl+A o Cmd+A)
11. Trascinali sul lato destro. Aspetta il caricamento (~1 minuto)

### File magico per far funzionare l'app
12. Sul tuo PC, crea un nuovo file con Blocco Note
13. Copia dentro esattamente questo:
   ```
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /reservation/
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /reservation/index.html [L]
   </IfModule>
   ```
14. Salva col nome esatto **`.htaccess`** (comincia con un punto!). Se Windows ti dice "manca nome file", metti "Salva con nome" e scegli "Tutti i file (*.*)" nel selettore tipo file
15. Trascinalo dentro `reservation/` su FileZilla

✅ **Passo 8 fatto!** L'app è online.

---

## 🎉 PASSO 9 – Prova l'app!

1. Sul tuo telefono (o computer), apri il browser
2. Vai a: `https://tuosito.it/reservation/` (usa il tuo dominio)
3. Vedi la schermata di login. **Dopo 2 secondi appare in basso il banner "Installez l'application"** 🎉
4. Clicca **"S'inscrire"** in fondo
5. Compila:
   - **Nom**: il tuo nome
   - **Email**: tua email
   - **Password**: minimo 6 caratteri
   - Attiva lo switch **"Je suis le propriétaire"** ⚠️ importante
   - **Code Propriétaire**: il codice segreto che avevi messo in `ADMIN_CODE` al Passo 3 (es. `MIOSTUDIO2026`)
6. **Crea il conto** → sei dentro come proprietario!

### Prova ad installare l'app sul telefono
- **Su Android Chrome**: appare il banner **"Installez"** → tap → conferma → l'app compare tra le tue app 🎊
- **Su iPhone Safari**: appare il banner → tap → il modal ti mostra 3 passi (Condividi → Sur l'écran d'accueil → Ajouter)

---

# 🛠️ Come modificare l'app in futuro

Ogni volta che vuoi cambiare colori, nome, o codice:

1. Modifica il file su GitLab (Edit → Commit)
2. Se hai modificato il **backend** → Render ridispiega automaticamente (2 min)
3. Se hai modificato il **frontend** → rifai i Passi 7 e 8 (StackBlitz build + FileZilla upload)

---

# 🆘 Se non funziona

## L'app carica ma resta bianca
- Il file `.htaccess` è dentro `reservation/` su Aruba?
- Il file `frontend/.env` conteneva l'URL Render corretto quando hai fatto il build in StackBlitz?

## Errore "Network error" al login
- Apri `https://wellness-api.onrender.com/api/` nel browser → deve rispondere JSON
- Se non risponde: guarda i log di Render (dashboard → tuo servizio → "Logs")
- UptimeRobot deve essere verde 🟢

## Ho perso il codice proprietario
- Dashboard Render → tuo servizio → tab **"Environment"** → modifica `ADMIN_CODE` → **"Save Changes"** (ridispiega in 1 min)

## Il banner "Installer" non appare
- Aspetta 2-3 secondi dopo il caricamento
- Se lo avevi già chiuso in passato, riappare dopo 7 giorni
- Su iPhone deve essere aperto in **Safari** (non Chrome iOS)

## Ho un problema che non è in questa lista
Scrivimi qui indicando:
- Numero del passo dove sei bloccato
- Cosa vedi sullo schermo (fai uno screenshot se puoi)
Ti guido io fino alla fine 🌿

---

# 📱 Come i tuoi clienti installeranno l'app

Nessuna spiegazione da dare loro. Appena aprono il tuo sito dal telefono:

**Android Chrome**: banner in basso "Installez l'application" → tap **Installer** → l'app si aggiunge alla schermata Home come una qualsiasi altra app (Instagram, WhatsApp…)

**iPhone Safari**: stesso banner → tap **Installer** → si apre un modal con 3 istruzioni visive → seguono e installano in 5 secondi

**Nessun App Store né Play Store**. Zero attese di approvazione. Zero account developer da pagare. Zero manutenzione periodica.

---

# 💰 Costi mensili aggiuntivi

| Servizio | Cosa fa | Costo |
|---|---|---|
| Aruba Hosting | Ospita i file dell'app | Quello che paghi già |
| MongoDB Atlas | Salva prenotazioni e clienti | **0€** per sempre |
| Render.com | Fa girare il cervello dell'app | **0€** per sempre |
| UptimeRobot | Tiene sveglio il cervello | **0€** per sempre |
| GitLab | Deposita il codice | **0€** per sempre |
| **TOTALE aggiunto** | | **0€ / mese** |

Con 500 prenotazioni al mese sei ampiamente entro i limiti gratuiti di tutti i servizi.

Buon lavoro! 🌿🧘‍♀️

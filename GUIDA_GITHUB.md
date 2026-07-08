# 📤 Mini-guida: caricare Harmonia su GitHub (5 minuti, tutto nel browser)

Nessun comando da terminale, nessun software da installare. Solo trascinamento file.

---

## 1️⃣ Scarica lo ZIP da Emergent

Nell'interfaccia Emergent, apri il file `harmonia.zip` (2 MB) e clicca il tasto **Download**.  
Sul tuo PC, fai doppio click sul file per **estrarlo** (o tasto destro → "Estrai qui" su Windows, "Apri" su Mac).

Ora hai una cartella `harmonia-package/` sul tuo PC con dentro:
- `backend/`
- `frontend/`
- `INSTALLATION.md`

---

## 2️⃣ Crea un account GitHub (se non ce l'hai)

Vai su 👉 <https://github.com/signup>  
Inserisci email, password, username. Segui la procedura (2 minuti). Conferma via email.

---

## 3️⃣ Crea un nuovo repository

1. Una volta loggato su GitHub, vai su 👉 <https://github.com/new>
2. Compila:
   - **Repository name**: `harmonia`
   - **Description** (opzionale): `App prenotazione corsi Yoga, Pilates, Massaggi`
   - **Visibility**: seleziona **Private** ✅ (solo tu lo vedi)
   - **Initialize this repository with**: ✅ ATTIVA "Add a README file"
3. Clicca il pulsante verde **"Create repository"** in basso

---

## 4️⃣ Carica i file (drag & drop!)

Ora sei sulla pagina del tuo repository vuoto.

1. Guarda la scritta blu al centro: **"uploading an existing file"** → **cliccaci sopra**
2. Si apre una pagina con un riquadro tratteggiato che dice "Drag files here to add them to your repository"
3. **Apri sul tuo PC** la cartella `harmonia-package/` estratta al Passo 1
4. **Seleziona tutti gli elementi dentro** (Ctrl+A su Windows, Cmd+A su Mac): `backend`, `frontend`, `INSTALLATION.md`
5. **Trascinali** dentro il riquadro tratteggiato del browser GitHub
6. Aspetta che tutti i file appaiano in lista (~30 secondi, dipende dalla connessione)
7. Scorri in basso, nella sezione **"Commit changes"**:
   - **Commit message**: `Codice iniziale Harmonia`
   - Lascia selezionato "Commit directly to the main branch"
8. Clicca il pulsante verde **"Commit changes"**

Attendi ~1 minuto che GitHub processi l'upload.

---

## 5️⃣ Verifica

Torna alla pagina principale del repository (clicca **"harmonia"** in alto a sinistra).

Devi vedere in lista:
- 📁 `backend/`
- 📁 `frontend/`
- 📄 `INSTALLATION.md`
- 📄 `README.md`

✅ **Fatto!** Il codice è su GitHub.

---

## ➡️ E adesso?

Torna alla guida principale `INSTALLATION.md` e continua dal **Passo 3 (Render.com)**.

Quando Render ti chiede di connettere una fonte Git, scegli **"GitHub"** (non GitLab, dato che hai usato GitHub). Il resto della procedura è identica.

---

## ❌ Se il drag & drop non funziona
- Alcuni browser Windows hanno problemi con l'upload di cartelle → usa Google Chrome
- File troppo grandi (>100 MB) → non è il nostro caso (il repo è 2 MB), ma se succede escludi la cartella `node_modules` (non dovrebbe essere nello zip)
- L'upload si blocca a metà → aggiorna la pagina e riprova con meno file per volta

## 🆘 Ho ancora problemi
Fammi uno screenshot della pagina GitHub dove sei bloccato e ti dico esattamente cosa cliccare.

Buon caricamento 🌿

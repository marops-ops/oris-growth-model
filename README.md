# Oris Dental – Vekstmodell

Interaktiv vekstmodell bygget i React + Recharts. Deployes til Vercel via GitHub.

---

## Deploy til Vercel (én gang)

### Steg 1 – Legg prosjektet på GitHub

```bash
# I prosjektmappen:
git init
git add .
git commit -m "Initial: Oris vekstmodell"

# Opprett et nytt privat repo på github.com, deretter:
git remote add origin https://github.com/DITT_BRUKERNAVN/oris-growth-model.git
git push -u origin main
```

### Steg 2 – Koble til Vercel

1. Gå til [vercel.com](https://vercel.com) → logg inn med GitHub
2. Klikk **"Add New Project"**
3. Velg repoet `oris-growth-model`
4. Vercel oppdager Next.js automatisk – klikk bare **Deploy**
5. Etter ~60 sekunder er appen live på en URL som `oris-growth-model.vercel.app`

### Steg 3 – Oppdateringer fremover

Hver gang du pusher til `main`-branchen deployes appen automatisk:

```bash
git add .
git commit -m "Oppdatert modell"
git push
```

---

## Lokal utvikling

```bash
npm install
npm run dev
# Åpne http://localhost:3000
```

---

## Prosjektstruktur

```
oris-growth-model/
├── pages/
│   ├── _app.jsx          # App-wrapper med fonts og global CSS
│   └── index.jsx         # Selve vekstmodellen (React-komponent)
├── styles/
│   └── globals.css       # Minimal CSS-reset
├── next.config.js
├── vercel.json
└── package.json
```

---

Utviklet av Amidays AS for Oris Dental · Mai 2026

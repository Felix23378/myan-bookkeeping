# မြန်မာ Bookkeeping Assistant

A Burmese-language AI-powered bookkeeping Progressive Web App (PWA) for small business owners in Myanmar.

**Live Demo:** _Coming soon_

---

## What is this?

Most small business owners in Myanmar — vendors, tailors, retailers, online shops — manage finances by memory or notebook. Existing accounting software is too complex and in English.

This app lets owners **type or speak in Burmese**, and AI automatically records and organizes their income and expenses into a profit/loss report.

---

## Features

- 💬 **Chat-first UI** — Talk to the AI like messaging a friend
- 🎤 **Voice input** — Speak in Burmese, AI understands
- 🤖 **Gemini AI** — Parses natural language into structured records
- 📊 **Dashboard** — Income, Expenses, Net Profit/Loss with charts
- 📱 **PWA** — Install on any phone like a native app
- 🔒 **Privacy-first** — All data stored locally on-device
- 🔑 **BYOK** — Bring your own free Gemini API key
- ✈️ **Offline support** — Queue messages, sync when back online

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Styling | Vanilla CSS (mobile-first) |
| Auth | Supabase (email + password) |
| AI | Gemini API (`gemini-3.1-flash-lite-preview`) |
| Storage | Browser localStorage |
| PWA | vite-plugin-pwa + Workbox |
| Deploy | Vercel |

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/myan-bookkeeping.git
cd myan-bookkeeping
npm install --legacy-peer-deps
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → Create new project
2. **Authentication → Providers → Email** → Enable
3. **Project Settings → API** → Copy `Project URL` and `anon public` key

### 3. Get a Free Gemini API Key

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with Google → Create API Key → Copy it

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> The Gemini API key is entered by the user inside the app — it's never stored in your server.

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deploy to Vercel

```bash
npx vercel --prod
```

Add these environment variables in the Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then add your `*.vercel.app` domain to **Supabase → Authentication → URL Configuration → Redirect URLs**.

---

## Project Structure

```
src/
├── services/
│   ├── supabase.ts     # Supabase client
│   ├── gemini.ts       # Gemini AI parsing + prompts
│   └── storage.ts      # localStorage helpers
├── context/
│   └── AppContext.tsx  # Global state
├── hooks/
│   ├── useChat.ts      # Chat + AI integration
│   └── useOfflineSync.ts
├── components/
│   ├── Auth/           # Login / Signup
│   ├── Onboarding/     # API key setup guide
│   ├── Chat/           # Main chat interface
│   ├── Dashboard/      # Reports & charts
│   ├── Settings/       # Preferences
│   └── Navigation/     # Bottom tab bar
├── App.tsx
└── index.css           # Design system
```

---

## Target Users

Vendors · Tailors · Small Retailers · Online Shop Owners · Food Stalls · Hair Salons · Mechanics

---

## License

MIT

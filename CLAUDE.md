# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Burmese-language AI-powered bookkeeping PWA for small business owners in Myanmar. Users type or speak in Burmese; Google Gemini parses their input into structured income/expense records. All user data lives in browser localStorage — there is no backend database.

## Commands

```bash
npm install --legacy-peer-deps   # Required flag — peer dep conflicts exist
npm run dev:all                  # Start both Vite (port 5173) + Express proxy (port 3001)
npm run dev                      # Frontend only
npm run dev:server               # Express API proxy only
npm run build                    # tsc -b && vite build
npm run lint                     # ESLint
```

No test suite exists in this project.

## Environment Setup

Copy `.env.example` to `.env` and fill in:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

The Gemini API key is **not** stored in `.env` — users enter it in the app's Settings screen. It is sent from the browser via `X-API-Key` header to the Express proxy at `/api/gemini`.

## Architecture

### Two-Process Setup
The Vite dev proxy (`vite.config.ts`) forwards `/api/*` → `http://localhost:3001`. In production (Vercel), `api/index.js` runs as serverless functions. The Express backend is a pure proxy — it has no database.

### Data Flow: AI Parsing
1. User sends chat message → `useChat.ts` calls `parseTransactionFromText()` (or `parseTransactionFromAudio()` for voice)
2. `src/services/gemini.ts` sends a structured prompt to `/api/gemini` with the user's message, transaction history, currency, and product inventory as context
3. Gemini returns structured JSON: `{ transactions[], inventoryActions[], replyMessage, needsClarification }`
4. `useChat.ts` either commits transactions directly or enters a confirmation flow if `needsClarification` is true
5. Confirmed transactions are saved to localStorage via `src/services/storage.ts`

### State Management
- Global state lives in `src/context/AppContext.tsx` using `useReducer` — user, transactions, products, stock movements, online status, active tab
- localStorage keys are namespaced by userId: `mba_transactions_${userId}`, `mba_products_${userId}`, etc.
- Offline queue: messages are saved to localStorage when offline and processed by `src/hooks/useOfflineSync.ts` when connectivity is restored

### API Proxy (`api/index.js`)
- `POST /api/gemini` — forwards to Google Generative API with a 5-model fallback chain on 503/429 errors. Model order: `gemini-2.5-flash-lite-preview-06-17` → `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-2.0-flash-lite` → `gemini-1.5-flash`
- `/* /api/supabase` — proxies Supabase auth requests, injecting the anon key server-side
- JSON body limit is 10MB to handle base64-encoded audio blobs

### Key Source Directories
- `src/services/` — all external integrations: `gemini.ts` (AI + system prompt), `storage.ts` (localStorage), `supabase.ts` (auth client), `records.ts` (fuzzy product matching, inventory business logic)
- `src/hooks/` — `useChat.ts` (main chat state machine), `useOfflineSync.ts`
- `src/context/AppContext.tsx` — global reducer + provider
- `src/components/` — feature folders: `Chat/`, `Dashboard/`, `Inventory/`, `Settings/`, `Auth/`, `Navigation/`, `Onboarding/`

### Inventory & Fuzzy Matching
`src/services/records.ts` implements char-overlap fuzzy matching (55% threshold) to map Gemini's extracted product names to the user's actual product inventory. When a sale is confirmed, it auto-creates both a stock_out movement and an income transaction.

### Internationalization
UI supports Burmese (`my`) and English (`en`). Language preference is stored in localStorage. The Gemini system prompt in `src/services/gemini.ts` includes extensive Burmese number word tables (တစ်=1, နှစ်=2, etc.) and category labels.

## Deployment

Deployed to Vercel. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel dashboard. After deploy, add the `*.vercel.app` domain to Supabase → Authentication → URL Configuration → Redirect URLs.

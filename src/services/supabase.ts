// Supabase Client
// ============================================================
// SETUP INSTRUCTIONS:
// 1. Go to https://supabase.com and create a new project
// 2. Go to Project Settings → API
// 3. Copy the "Project URL" and "anon public" key
// 4. Paste them into your .env file as shown below:
//    VITE_SUPABASE_URL=https://your-project.supabase.co
//    VITE_SUPABASE_ANON_KEY=your-anon-key
// 5. In Supabase dashboard: Authentication → Providers → Email → Enable
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars missing — check your .env file');
}

// Point to the local Express proxy for API requests in dev.
// In production, Vercel will rewrite /api/(.*) to the express app.
const proxyUrl = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.host}/api/supabase`
  : 'http://localhost:3001/api/supabase';

export const supabase = createClient(
  proxyUrl,
  supabaseAnonKey || 'placeholder'
);

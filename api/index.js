// Express.js Serverless Backend — TLS-terminating proxy
// =====================================================
// All external API calls from the frontend go through here.
// The browser NEVER calls third-party APIs directly.
//
// Vercel: every request to /api/* is routed to this handler.
// Local:  runs on port 3001 and Vite proxies /api/* here.

import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();

// ── Middleware ────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' })); // audio blobs can be large

// ── Health check ─────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Gemini proxy ─────────────────────────────────────
// Terminates the TLS connection to Google's API on behalf
// of the frontend, keeping the user's Gemini key out of
// browser-visible CORS preflight headers in production.
app.post('/api/gemini', async (req, res) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || !apiKey.startsWith('AIza')) {
    return res.status(400).json({ error: 'Missing or invalid API key' });
  }

  const { model = 'gemini-3.1-flash-lite-preview', contents } = req.body;
  if (!contents) {
    return res.status(400).json({ error: 'Missing contents' });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      }
    );

    const data = await geminiRes.json();
    return res.status(geminiRes.status).json(data);
  } catch (err) {
    console.error('[Gemini proxy error]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── Supabase auth proxy ──────────────────────────────
// Proxies auth requests to Supabase so the frontend
// doesn't need to connect to Supabase directly.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

app.use('/api/supabase', async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Supabase not configured on server' });
  }

  // targetUrl is just based on originalUrl which has the full path
  // Since we use app.use('/api/supabase'), req.url is the path *after* the mount point
  // however req.originalUrl is the full /api/supabase/rest/v1/...
  const supabasePath = req.originalUrl.replace('/api/supabase', '');
  const targetUrl = `${SUPABASE_URL}${supabasePath}`;

  try {
    // Forward all headers except host
    const forwardHeaders = { ...req.headers };
    delete forwardHeaders.host;
    // Ensure the anon key is present
    forwardHeaders['apikey'] = SUPABASE_ANON_KEY;
    if (!forwardHeaders['authorization']) {
      forwardHeaders['authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
    }

    const proxyRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const data = await proxyRes.text();

    // Forward response headers we care about
    const contentType = proxyRes.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    return res.status(proxyRes.status).send(data);
  } catch (err) {
    console.error('[Supabase proxy error]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── Catch-all for unknown /api routes ────────────────
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Local dev server (not used on Vercel) ────────────
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.API_PORT || 3001;
  app.listen(PORT, () => {
    console.log(`⚡ API server running on http://localhost:${PORT}`);
  });
}

export default app;

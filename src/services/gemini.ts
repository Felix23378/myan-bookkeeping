import type { Transaction } from './storage';

export interface ParsedTransaction {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
  confidence: 'high' | 'low';
}

export interface GeminiResponse {
  transactions: ParsedTransaction[];
  replyMessage: string;
  needsClarification: boolean;
}

const DEFAULT_CATEGORIES = [
  // Income
  'ရောင်းရငွေ', 'ဝန်ဆောင်မှုခ', 'လစာ', 'အတိုးရငွေ', 'အခြားဝင်ငွေ',
  // Expense
  'ကုန်ပစ္စည်းဝယ်ခ', 'အငှားခ', 'ပို့ဆောင်ရေး', 'ရုံးစရိတ်',
  'အစားအသောက်', 'ဈေးဝယ်', 'ခရီးစရိတ်', 'ကျန်းမာရေး', 'ပညာရေး',
  'ဖုန်း/အင်တာနက်', 'မီး/ရေ', 'အဝတ်အထည်', 'ဖျော်ဖြေရေး', 'အခြားကုန်ကျ'
];

const MODEL = 'gemini-3.1-flash-lite-preview';

// Use proxy in production (Vercel), direct in local dev
const PROXY_URL = '/api/gemini';

const SYSTEM_PROMPT = `You are a helpful Burmese bookkeeping assistant for people in Myanmar.
Your job is to parse natural language Burmese or mixed Burmese-English messages about income and expenses.
Users may record BOTH business and personal transactions — do NOT assume everything is business-related.

IMPORTANT RULES:
1. Extract ALL financial transactions from the user's message
2. Myanmar currency: 1 သိန်း = 100,000 ကျပ်, 1 ထောင် = 1,000, K or ကျပ် = kyat
3. Burmese number words: တစ်=1, နှစ်=2, သုံး=3, လေး=4, ငါး=5, ခြောက်=6, ခုနစ်=7, ရှစ်=8, ကိုး=9, ဆယ်=10
4. Compound numbers: ဆယ်ငါး=15, နှစ်ဆယ်=20, သုံးဆယ်=30, ငါးဆယ်=50 (all in thousands when context implies)
5. Dates: ဒီနေ့=today, မနေ့=yesterday, နောက်တစ်နေ့=tomorrow
6. If type is ambiguous, ask for clarification
7. Default date = today if not specified
8. Available categories: ${DEFAULT_CATEGORIES.join(', ')}
9. CRITICAL: Use the user's EXACT description for the "description" field. Do NOT invent business-sounding names or rephrase what the user said. For example, if user says "Kpay ထုတ်ခ" keep it as "Kpay ထုတ်ခ", do NOT change it to "ငွေထုတ်ဝန်ဆောင်ခ" or a business name. Keep descriptions simple and faithful to the user's words.
10. Choose the most appropriate category from the list. If none fit well, use "အခြားဝင်ငွေ" or "အခြားကုန်ကျ".

Respond ONLY with valid JSON in this exact format:
{
  "transactions": [
    {
      "type": "income" or "expense",
      "amount": NUMBER_IN_KYAT,
      "description": "use user's own words as-is",
      "category": "one of the available categories",
      "date": "YYYY-MM-DD",
      "confidence": "high" or "low"
    }
  ],
  "replyMessage": "friendly confirmation in Burmese (use ✅ for success, ❓ for clarification needed)",
  "needsClarification": false or true
}

If the message is NOT about income/expenses (e.g., greeting, question about balance), set transactions to [] and write a helpful reply in replyMessage.`;

// ─── Core proxy call ─────────────────────────────────────────────────────────

async function callGemini(apiKey: string, contents: object[]): Promise<string> {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({ model: MODEL, contents }),
  });

  const data = await res.json() as any;

  if (!res.ok) {
    const msg = data?.error?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text.trim();
}

// ─── Text parsing ─────────────────────────────────────────────────────────────

export const parseTransactionFromText = async (
  apiKey: string,
  userMessage: string,
  existingTransactions: Transaction[] = []
): Promise<GeminiResponse> => {
  const today = new Date().toISOString().split('T')[0];
  const contextNote = `Today is ${today}.`;

  const recentTxSummary = existingTransactions.slice(-5).map(t =>
    `${t.date}: ${t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()} ကျပ် (${t.description})`
  ).join('\n');

  const contents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: 'OK, I will parse Burmese bookkeeping messages and return JSON only.' }] },
    {
      role: 'user', parts: [{
        text: `${contextNote}\n${recentTxSummary ? `Recent:\n${recentTxSummary}\n` : ''}User: "${userMessage}"\n\nReturn JSON only.`
      }]
    },
  ];

  const text = await callGemini(apiKey, contents);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response from Gemini');
  return JSON.parse(jsonMatch[0]) as GeminiResponse;
};

// ─── Audio parsing ────────────────────────────────────────────────────────────

export const parseTransactionFromAudio = async (
  apiKey: string,
  audioBlob: Blob,
  _existingTransactions: Transaction[] = []
): Promise<GeminiResponse> => {
  const today = new Date().toISOString().split('T')[0];

  const arrayBuffer = await audioBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  const base64Audio = btoa(binary);

  const contents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: 'OK.' }] },
    {
      role: 'user', parts: [
        { text: `Today is ${today}. The user sent a voice message in Burmese. Transcribe and extract transactions. Return JSON only.` },
        { inlineData: { mimeType: audioBlob.type || 'audio/webm', data: base64Audio } },
      ]
    },
  ];

  const text = await callGemini(apiKey, contents);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response from Gemini');
  return JSON.parse(jsonMatch[0]) as GeminiResponse;
};

// ─── Dashboard summary ────────────────────────────────────────────────────────

export const generateDashboardSummary = async (
  apiKey: string,
  transactions: Transaction[],
  period: 'today' | 'week' | 'month'
): Promise<string> => {
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = income - expense;
  const periodName = period === 'today' ? 'ဒီနေ့' : period === 'week' ? 'ဒီအပတ်' : 'ဒီလ';

  const contents = [{
    role: 'user', parts: [{
      text: `A user in Myanmar has these ${periodName} financial statistics (may include both business and personal transactions):
- Income: ${income.toLocaleString()} kyat
- Expenses: ${expense.toLocaleString()} kyat
- Net: ${profit.toLocaleString()} kyat (${profit >= 0 ? 'profit' : 'loss'})

Write a brief, encouraging 2-3 sentence summary in Burmese. Be warm and supportive. Do not assume it is only business income/expenses.`
    }]
  }];

  return await callGemini(apiKey, contents);
};

// ─── Key validation ───────────────────────────────────────────────────────────

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  const cleanKey = apiKey.replace(/\s/g, '');
  if (!cleanKey.startsWith('AIza') || cleanKey.length < 30) return false;

  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': cleanKey },
      body: JSON.stringify({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
      }),
    });
    const data = await res.json() as any;
    const errMsg: string = data?.error?.message || '';
    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) return false;
    return res.ok || !errMsg.includes('API_KEY_INVALID');
  } catch {
    // Network error — don't block the user, let them try
    return true;
  }
};

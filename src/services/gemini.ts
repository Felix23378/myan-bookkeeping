import { CURRENCIES, type CurrencyCode } from './storage';
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

function buildSystemPrompt(currencyCode: CurrencyCode = 'MMK'): string {
  const cur = CURRENCIES[currencyCode];
  const currencyNote = currencyCode === 'MMK'
    ? `The user's currency is Myanmar Kyat (MMK/ကျပ်). 1 သိန်း = 100,000 ကျပ်, 1 ထောင် = 1,000, K or ကျပ် = kyat.`
    : `The user's currency is ${cur.name} (${cur.code}/${cur.nameMy}). Amounts are in ${cur.code}. Use "${cur.nameMy}" as the currency unit in replies.`;

  return `You are a helpful Burmese bookkeeping assistant for people in Myanmar.
You have TWO jobs:
1. Parse and record new income/expense transactions from user messages
2. Answer questions about the user's existing financial data (e.g. "how much did I spend this month?", "what category costs the most?", "ဒီအပတ် ဘယ်လောက်သုံးလဲ")

Users may record BOTH business and personal transactions — do NOT assume everything is business-related.

${currencyNote}

IMPORTANT RULES FOR RECORDING TRANSACTIONS:
1. Extract ALL financial transactions from the user's message
2. Burmese number words: တစ်=1, နှစ်=2, သုံး=3, လေး=4, ငါး=5, ခြောက်=6, ခုနစ်=7, ရှစ်=8, ကိုး=9, ဆယ်=10
3. Compound numbers: ဆယ်ငါး=15, နှစ်ဆယ်=20, သုံးဆယ်=30, ငါးဆယ်=50 (all in thousands when context implies)
4. Dates: ဒီနေ့=today, မနေ့=yesterday, နောက်တစ်နေ့=tomorrow
5. If type is ambiguous, ask for clarification
6. Default date = today if not specified
7. Available categories: ${DEFAULT_CATEGORIES.join(', ')}
8. CRITICAL: Use the user's EXACT description for the "description" field. Do NOT invent business-sounding names or rephrase what the user said.
9. Choose the most appropriate category from the list. If none fit well, use "အခြားဝင်ငွေ" or "အခြားကုန်ကျ".
10. The amount field must be a plain number in ${cur.code}. Do NOT convert currencies.

IMPORTANT RULES FOR ANSWERING DATA QUESTIONS:
- You will be provided with the user's FULL transaction history as context
- When the user asks about their data (e.g. totals, categories, comparisons, trends), analyze the provided transactions and give a clear, helpful answer in Burmese
- Use ${cur.nameMy} as the currency unit
- Include specific numbers and breakdowns when relevant
- For time-based questions: ဒီနေ့=today, ဒီအပတ်=this week, ဒီလ=this month, etc.

Respond ONLY with valid JSON in this exact format:
{
  "transactions": [
    {
      "type": "income" or "expense",
      "amount": NUMBER_IN_${cur.code},
      "description": "use user's own words as-is",
      "category": "one of the available categories",
      "date": "YYYY-MM-DD",
      "confidence": "high" or "low"
    }
  ],
  "replyMessage": "friendly reply in Burmese using ${cur.nameMy} as currency unit",
  "needsClarification": false or true
}

When the user is ASKING A QUESTION (not recording a transaction), set transactions to [] and put your analytical answer in replyMessage.
When the user is RECORDING income/expenses, extract them into transactions and confirm in replyMessage.
For greetings or general chat, set transactions to [] and write a helpful reply.`;
}

// ─── Transaction context builder ──────────────────────────────────────────────

function buildTransactionContext(transactions: Transaction[], currencyCode: CurrencyCode): string {
  if (transactions.length === 0) return 'No transactions recorded yet.';

  const cur = CURRENCIES[currencyCode];

  // Group by date
  const byDate: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    if (!byDate[tx.date]) byDate[tx.date] = [];
    byDate[tx.date].push(tx);
  }

  const sortedDates = Object.keys(byDate).sort();

  // Build summary lines
  const lines: string[] = [];
  let totalIncome = 0;
  let totalExpense = 0;

  for (const date of sortedDates) {
    const txs = byDate[date];
    for (const tx of txs) {
      const sign = tx.type === 'income' ? '+' : '-';
      lines.push(`${tx.date} | ${tx.type} | ${sign}${tx.amount.toLocaleString()} ${cur.nameMy} | ${tx.category} | ${tx.description}`);
      if (tx.type === 'income') totalIncome += tx.amount;
      else totalExpense += tx.amount;
    }
  }

  // Category breakdown
  const catTotals: Record<string, { income: number; expense: number }> = {};
  for (const tx of transactions) {
    if (!catTotals[tx.category]) catTotals[tx.category] = { income: 0, expense: 0 };
    if (tx.type === 'income') catTotals[tx.category].income += tx.amount;
    else catTotals[tx.category].expense += tx.amount;
  }

  const catSummary = Object.entries(catTotals)
    .map(([cat, v]) => {
      const parts: string[] = [];
      if (v.income > 0) parts.push(`+${v.income.toLocaleString()}`);
      if (v.expense > 0) parts.push(`-${v.expense.toLocaleString()}`);
      return `${cat}: ${parts.join(', ')} ${cur.nameMy}`;
    })
    .join('\n');

  return `=== ALL TRANSACTIONS (${transactions.length} total) ===
Total income: +${totalIncome.toLocaleString()} ${cur.nameMy}
Total expense: -${totalExpense.toLocaleString()} ${cur.nameMy}
Net: ${(totalIncome - totalExpense).toLocaleString()} ${cur.nameMy}
Date range: ${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}

--- By Category ---
${catSummary}

--- Detail ---
${lines.join('\n')}`;
}

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
  existingTransactions: Transaction[] = [],
  currencyCode: CurrencyCode = 'MMK'
): Promise<GeminiResponse> => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const contextNote = `Today is ${today} (${dayOfWeek}).`;

  const txContext = buildTransactionContext(existingTransactions, currencyCode);

  const contents = [
    { role: 'user', parts: [{ text: buildSystemPrompt(currencyCode) }] },
    { role: 'model', parts: [{ text: 'OK, I will parse bookkeeping messages and answer data questions. I will return JSON only.' }] },
    {
      role: 'user', parts: [{
        text: `${contextNote}\n\n${txContext}\n\nUser message: "${userMessage}"\n\nReturn JSON only.`
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
  _existingTransactions: Transaction[] = [],
  currencyCode: CurrencyCode = 'MMK'
): Promise<GeminiResponse> => {
  const today = new Date().toISOString().split('T')[0];

  const arrayBuffer = await audioBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  const base64Audio = btoa(binary);

  const contents = [
    { role: 'user', parts: [{ text: buildSystemPrompt(currencyCode) }] },
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
  period: 'today' | 'week' | 'month',
  currencyCode: CurrencyCode = 'MMK'
): Promise<string> => {
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = income - expense;
  const periodName = period === 'today' ? 'ဒီနေ့' : period === 'week' ? 'ဒီအပတ်' : 'ဒီလ';
  const cur = CURRENCIES[currencyCode];

  const contents = [{
    role: 'user', parts: [{
      text: `A user in Myanmar has these ${periodName} financial statistics (may include both business and personal transactions):
- Income: ${income.toLocaleString()} ${cur.name}
- Expenses: ${expense.toLocaleString()} ${cur.name}
- Net: ${profit.toLocaleString()} ${cur.name} (${profit >= 0 ? 'profit' : 'loss'})

Write a brief, encouraging 2-3 sentence summary in Burmese. Use "${cur.nameMy}" as the currency unit. Be warm and supportive. Do not assume it is only business income/expenses.`
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

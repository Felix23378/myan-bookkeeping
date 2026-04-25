import { CURRENCIES, type CurrencyCode, type Product } from './storage';
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
  inventoryActions: ParsedInventoryAction[];
  replyMessage: string;
  needsClarification: boolean;
}

export type ParsedInventoryAction =
  | { kind: 'stock_in'; productName: string; qty: number; costPrice?: number; reason?: string; date: string }
  | { kind: 'stock_out'; productName: string; qty: number; reason?: string; date: string }
  | { kind: 'sale'; productName: string; qty: number; date: string }
  | { kind: 'income'; amount: number; description: string; category: string; date: string; confidence: 'high' | 'low' }
  | { kind: 'expense'; amount: number; description: string; category: string; date: string; confidence: 'high' | 'low' };

const DEFAULT_CATEGORIES = [
  // Income
  'ရောင်းရငွေ', 'ဝန်ဆောင်မှုခ', 'လစာ', 'အတိုးရငွေ', 'အခြားဝင်ငွေ',
  // Expense
  'ကုန်ပစ္စည်းဝယ်ခ', 'အငှားခ', 'ပို့ဆောင်ရေး', 'ရုံးစရိတ်',
  'အစားအသောက်', 'ဈေးဝယ်', 'ခရီးစရိတ်', 'ကျန်းမာရေး', 'ပညာရေး',
  'ဖုန်း/အင်တာနက်', 'မီး/ရေ', 'အဝတ်အထည်', 'ဖျော်ဖြေရေး', 'အခြားကုန်ကျ'
];

const MODEL_PRIMARY = 'gemini-3.1-flash-lite-preview';
const MODEL_BACKUP  = 'gemini-3-flash-preview';

// Use proxy in production (Vercel), direct in local dev
const PROXY_URL = '/api/gemini';

function buildSystemPrompt(currencyCode: CurrencyCode = 'MMK', products: Product[] = []): string {
  const cur = CURRENCIES[currencyCode];
  const currencyNote = currencyCode === 'MMK'
    ? `The user's currency is Myanmar Kyat (MMK/ကျပ်). 1 သိန်း = 100,000 ကျပ်, 1 ထောင် = 1,000, K or ကျပ် = kyat.`
    : `The user's currency is ${cur.name} (${cur.code}/${cur.nameMy}). Amounts are in ${cur.code}. Use "${cur.nameMy}" as the currency unit in replies.`;

  const hasProducts = products.length > 0;
  const productListText = hasProducts
    ? `\nPRODUCT INVENTORY:\n${products.map(p => `- "${p.name}" (လက်ကျန်: ${p.currentQty} ${p.unitLabel}, ရောင်းဈေး: ${p.sellingPrice})`).join('\n')}`
    : '';

  const inventoryInstructions = hasProducts ? `
3. INVENTORY COMMANDS — when user mentions a product from the list above, use inventoryActions:
   - Restocking/buying stock: kind="stock_in", include costPrice if the user mentions a purchase price (total cost)
   - Selling a product: kind="sale" (system auto-deducts stock and records income)
   - Removing stock (lost/damaged): kind="stock_out"
   - Match productName exactly to a product in the list (fuzzy match allowed)
   - Regular income/expense NOT related to products: kind="income" or kind="expense" inside inventoryActions
   - When using inventoryActions, set transactions to []
` : '';

  const inventoryJsonExample = hasProducts ? `
When recording INVENTORY actions, use this format:
{
  "transactions": [],
  "inventoryActions": [
    { "kind": "stock_in", "productName": "product name", "qty": 10, "costPrice": 5000, "date": "YYYY-MM-DD" },
    { "kind": "sale", "productName": "product name", "qty": 3, "date": "YYYY-MM-DD" },
    { "kind": "stock_out", "productName": "product name", "qty": 1, "reason": "ပျက်စီး", "date": "YYYY-MM-DD" },
    { "kind": "income", "amount": 10000, "description": "...", "category": "...", "date": "YYYY-MM-DD", "confidence": "high" },
    { "kind": "expense", "amount": 5000, "description": "...", "category": "...", "date": "YYYY-MM-DD", "confidence": "high" }
  ],
  "replyMessage": "...",
  "needsClarification": false
}
` : '';

  return `You are a helpful Burmese bookkeeping assistant for people in Myanmar.
You have THREE jobs:
1. Parse and record new income/expense transactions from user messages
2. Answer questions about the user's existing financial data
3. Handle inventory stock movements (stock in, sales, stock out)

Users may record BOTH business and personal transactions — do NOT assume everything is business-related.

${currencyNote}
${productListText}

IMPORTANT RULES:
1. Extract ALL financial transactions from the user's message
2. Burmese number words: တစ်=1, နှစ်=2, သုံး=3, လေး=4, ငါး=5, ခြောက်=6, ခုနစ်=7, ရှစ်=8, ကိုး=9, ဆယ်=10
3. Compound numbers: ဆယ်ငါး=15, နှစ်ဆယ်=20, သုံးဆယ်=30, ငါးဆယ်=50 (all in thousands when context implies)
4. Dates: ဒီနေ့=today, မနေ့=yesterday, နောက်တစ်နေ့=tomorrow. Default date = today.
5. Available categories: ${DEFAULT_CATEGORIES.join(', ')}
6. CRITICAL: Use the user's EXACT description. Do NOT rephrase.
7. The amount field must be a plain number in ${cur.code}. Do NOT convert currencies.
${inventoryInstructions}
IMPORTANT RULES FOR ANSWERING DATA QUESTIONS:
- Analyze provided transaction history and answer clearly in Burmese
- Use ${cur.nameMy} as the currency unit
- For time-based questions: ဒီနေ့=today, ဒီအပတ်=this week, ဒီလ=this month

Respond ONLY with valid JSON. Default format (no inventory):
{
  "transactions": [
    {
      "type": "income" or "expense",
      "amount": NUMBER_IN_${cur.code},
      "description": "user's own words",
      "category": "one of the available categories",
      "date": "YYYY-MM-DD",
      "confidence": "high" or "low"
    }
  ],
  "inventoryActions": [],
  "replyMessage": "friendly reply in Burmese",
  "needsClarification": false
}
${inventoryJsonExample}
When ASKING A QUESTION: set transactions and inventoryActions to [], put answer in replyMessage.
For greetings: set both to [] and write a helpful reply.`;
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

async function callGeminiWithModel(apiKey: string, model: string, contents: object[]): Promise<string> {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({ model, contents }),
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

async function callGemini(apiKey: string, contents: object[]): Promise<string> {
  try {
    return await callGeminiWithModel(apiKey, MODEL_PRIMARY, contents);
  } catch (err: any) {
    const msg: string = err?.message || '';
    // Fall back to backup model on overload / quota / server errors
    const isOverload = msg.includes('503') || msg.includes('overloaded') || msg.includes('UNAVAILABLE')
      || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429');
    if (isOverload) {
      return await callGeminiWithModel(apiKey, MODEL_BACKUP, contents);
    }
    throw err;
  }
}

// ─── Text parsing ─────────────────────────────────────────────────────────────

export const parseTransactionFromText = async (
  apiKey: string,
  userMessage: string,
  existingTransactions: Transaction[] = [],
  currencyCode: CurrencyCode = 'MMK',
  products: Product[] = []
): Promise<GeminiResponse> => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const contextNote = `Today is ${today} (${dayOfWeek}).`;

  const txContext = buildTransactionContext(existingTransactions, currencyCode);

  const contents = [
    { role: 'user', parts: [{ text: buildSystemPrompt(currencyCode, products) }] },
    { role: 'model', parts: [{ text: 'OK, I will parse bookkeeping and inventory messages. I will return JSON only.' }] },
    {
      role: 'user', parts: [{
        text: `${contextNote}\n\n${txContext}\n\nUser message: "${userMessage}"\n\nReturn JSON only.`
      }]
    },
  ];

  const text = await callGemini(apiKey, contents);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response from Gemini');
  const parsed = JSON.parse(jsonMatch[0]) as GeminiResponse;
  if (!parsed.inventoryActions) parsed.inventoryActions = [];
  return parsed;
};

// ─── Audio parsing ────────────────────────────────────────────────────────────

export const parseTransactionFromAudio = async (
  apiKey: string,
  audioBlob: Blob,
  _existingTransactions: Transaction[] = [],
  currencyCode: CurrencyCode = 'MMK',
  products: Product[] = []
): Promise<GeminiResponse> => {
  const today = new Date().toISOString().split('T')[0];

  const arrayBuffer = await audioBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  const base64Audio = btoa(binary);

  const contents = [
    { role: 'user', parts: [{ text: buildSystemPrompt(currencyCode, products) }] },
    { role: 'model', parts: [{ text: 'OK.' }] },
    {
      role: 'user', parts: [
        { text: `Today is ${today}. The user sent a voice message in Burmese. Transcribe and extract transactions or inventory actions. Return JSON only.` },
        { inlineData: { mimeType: audioBlob.type || 'audio/webm', data: base64Audio } },
      ]
    },
  ];

  const text = await callGemini(apiKey, contents);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response from Gemini');
  const parsed = JSON.parse(jsonMatch[0]) as GeminiResponse;
  if (!parsed.inventoryActions) parsed.inventoryActions = [];
  return parsed;
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

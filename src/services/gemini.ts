import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
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
  'ရောင်းရငွေ', 'ဝန်ဆောင်မှုခ', 'အခြားဝင်ငွေ',
  'ကုန်ပစ္စည်းဝယ်ခ', 'အငှားခ', 'ပို့ဆောင်ရေး', 'ရုံးစရိတ်', 'အစားအသောက်', 'အခြားကုန်ကျ'
];

const SYSTEM_PROMPT = `You are a helpful Burmese bookkeeping assistant for small business owners in Myanmar.
Your job is to parse natural language Burmese or mixed Burmese-English messages about income and expenses.

IMPORTANT RULES:
1. Extract ALL financial transactions from the user's message
2. Myanmar currency: 1 သိန်း = 100,000 ကျပ်, 1 ထောင် = 1,000, K or ကျပ် = kyat
3. Burmese number words: တစ်=1, နှစ်=2, သုံး=3, လေး=4, ငါး=5, ခြောက်=6, ခုနစ်=7, ရှစ်=8, ကိုး=9, ဆယ်=10
4. Compound numbers: ဆယ်ငါး=15, နှစ်ဆယ်=20, သုံးဆယ်=30, ငါးဆယ်=50 (all in thousands when context implies)
5. Dates: ဒီနေ့=today, မနေ့=yesterday, နောက်တစ်နေ့=tomorrow
6. If type is ambiguous, ask for clarification
7. Default date = today if not specified
8. Available categories: ${DEFAULT_CATEGORIES.join(', ')}

Respond ONLY with valid JSON in this exact format:
{
  "transactions": [
    {
      "type": "income" or "expense",
      "amount": NUMBER_IN_KYAT,
      "description": "brief description in Burmese",
      "category": "one of the available categories",
      "date": "YYYY-MM-DD",
      "confidence": "high" or "low"
    }
  ],
  "replyMessage": "friendly confirmation in Burmese (use ✅ for success, ❓ for clarification needed)",
  "needsClarification": false or true
}

If the message is NOT about income/expenses (e.g., greeting, question about balance), set transactions to [] and write a helpful reply in replyMessage.`;

export const parseTransactionFromText = async (
  apiKey: string,
  userMessage: string,
  existingTransactions: Transaction[] = []
): Promise<GeminiResponse> => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

  const today = new Date().toISOString().split('T')[0];
  const contextNote = `Today is ${today}.`;

  // Summarize recent transactions for context
  const recentTxSummary = existingTransactions.slice(-5).map(t =>
    `${t.date}: ${t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()} ကျပ် (${t.description})`
  ).join('\n');

  const userPrompt = `${contextNote}
${recentTxSummary ? `Recent transactions:\n${recentTxSummary}\n` : ''}
User message: "${userMessage}"

Parse this and return JSON only.`;

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: userPrompt }
  ]);

  const text = result.response.text().trim();

  // Extract JSON block robustly
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response from Gemini');

  const parsed = JSON.parse(jsonMatch[0]) as GeminiResponse;
  return parsed;
};

export const parseTransactionFromAudio = async (
  apiKey: string,
  audioBlob: Blob,
  _existingTransactions: Transaction[] = []
): Promise<GeminiResponse> => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

  const today = new Date().toISOString().split('T')[0];

  // Convert audio blob to base64
  const arrayBuffer = await audioBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  const base64Audio = btoa(binary);

  const audioPart: Part = {
    inlineData: { mimeType: audioBlob.type || 'audio/webm', data: base64Audio }
  };

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: `Today is ${today}. The user sent a voice message in Burmese. Transcribe it, then extract transactions. Return JSON only.` },
    audioPart,
  ]);

  const text = result.response.text().trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response from Gemini');

  return JSON.parse(jsonMatch[0]) as GeminiResponse;
};

export const generateDashboardSummary = async (
  apiKey: string,
  transactions: Transaction[],
  period: 'today' | 'week' | 'month'
): Promise<string> => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = income - expense;

  const periodName = period === 'today' ? 'ဒီနေ့' : period === 'week' ? 'ဒီအပတ်' : 'ဒီလ';

  const prompt = `A small business in Myanmar has these ${periodName} statistics:
- Income: ${income.toLocaleString()} kyat
- Expenses: ${expense.toLocaleString()} kyat  
- Net: ${profit.toLocaleString()} kyat (${profit >= 0 ? 'profit' : 'loss'})

Write a brief, encouraging 2-3 sentence summary in Burmese. Be warm and supportive. If profitable, say something positive. If at a loss, give gentle advice. Keep it simple.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
    await model.generateContent('Hi');
    return true;
  } catch {
    return false;
  }
};

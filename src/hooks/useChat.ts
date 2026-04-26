import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { parseTransactionFromText, parseTransactionFromAudio } from '../services/gemini';
import { processParsedAction, fuzzyMatchProduct } from '../services/records';
import {
  saveTransaction,
  enqueueOffline,
  type Product,
  type Transaction,
} from '../services/storage';

function generateId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface PendingConfirmation {
  product: Product;
  qty: number;
  date: string;
  source: 'chat' | 'voice';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  pendingConfirm?: PendingConfirmation;
  confirmed?: boolean;
}

export function useChat() {
  const { state, dispatch } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'မင်္ဂလာပါ! 👋 ကျွန်တော်က သင့်ရဲ့ bookkeeping assistant ပါ။\n\nဒီနေ့ ဘာရောင်းရသလဲ၊ ဘာဝယ်ရသလဲ ပြောပြပါ — ကျွန်တော် မှတ်ပေးမယ်။\n\nဥပမာ: "ဒီနေ့ ငါးသောင်း ရတယ်"',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMsg]);
    return newMsg;
  }, []);

  // Called when user taps Yes/No on a confirmation bubble
  const confirmSale = useCallback((messageId: string, confirmed: boolean) => {
    if (!state.user) return;

    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, confirmed } : m
    ));

    const msg = messages.find(m => m.id === messageId);
    if (!msg?.pendingConfirm) return;

    if (!confirmed) {
      addMessage({ role: 'assistant', content: 'မှတ်တမ်း ပယ်ဖျက်လိုက်ပါပြီ ✗' });
      return;
    }

    const { product, qty, date, source } = msg.pendingConfirm;
    const result = processParsedAction({
      action: { kind: 'sale', productName: product.name, qty, date },
      userId: state.user.id,
      products: state.products,
      dispatch,
      source,
    });

    if (result.ok) {
      addMessage({
        role: 'assistant',
        content: `${product.name} ${qty} ${product.unitLabel} ရောင်းမှတ်တမ်း သိမ်းဆည်းပြီးပါပြီ ✓`,
      });
    } else {
      addMessage({ role: 'assistant', content: result.message });
    }
  }, [messages, state.user, state.products, dispatch, addMessage]);

  const sendMessage = useCallback(async (userInput: string, audioBlob?: Blob) => {
    if (!state.user || !state.apiKey) return;

    addMessage({ role: 'user', content: audioBlob ? '🎤 ' + userInput : userInput });
    setIsLoading(true);

    if (!state.isOnline) {
      enqueueOffline({ id: generateId(), message: userInput, timestamp: new Date().toISOString() });
      addMessage({
        role: 'assistant',
        content: '📴 အင်တာနက် မရှိပါ။ Message ကို queue လုပ်ထားပြီ — အင်တာနက် ပြန်ရရင် process လုပ်ပေးမယ်။'
      });
      setIsLoading(false);
      return;
    }

    try {
      const source = audioBlob ? 'voice' : 'chat';
      const response = audioBlob
        ? await parseTransactionFromAudio(state.apiKey, audioBlob, state.transactions, state.prefs.currency, state.products)
        : await parseTransactionFromText(state.apiKey, userInput, state.transactions, state.prefs.currency, state.products);

      // Handle inventory actions
      if (response.inventoryActions && response.inventoryActions.length > 0) {
        let currentProducts = state.products;
        for (const action of response.inventoryActions) {

          // Block stock_in — direct to manual
          if (action.kind === 'stock_in') {
            addMessage({
              role: 'assistant',
              content: 'ကုန်ပစ္စည်း ထပ်ဖြည့်ရန် Inventory tab မှ လုပ်ဆောင်ပါ။',
            });
            continue;
          }

          // Sale action — fuzzy match then ask for confirmation
          if (action.kind === 'sale') {
            const matched = fuzzyMatchProduct(currentProducts, action.productName);
            if (!matched) {
              addMessage({
                role: 'assistant',
                content: `"${action.productName}" ကုန်ပစ္စည်း database မှာ မတွေ့ပါ။ Inventory tab မှာ ကုန်ပစ္စည်းအရင်ထည့်ပါ။`,
              });
              continue;
            }
            addMessage({
              role: 'assistant',
              content: `${matched.name} ${action.qty} ${matched.unitLabel} ရောင်းသည်မှန်ပါသလား?`,
              pendingConfirm: { product: matched, qty: action.qty, date: action.date, source },
            });
            continue;
          }

          // Income — fuzzy match description to products
          if (action.kind === 'income') {
            const matched = fuzzyMatchProduct(currentProducts, action.description);
            if (matched) {
              const inferredQty = Math.max(1, Math.round(action.amount / matched.sellingPrice));
              addMessage({
                role: 'assistant',
                content: `${matched.name} ${inferredQty} ${matched.unitLabel} (${matched.sellingPrice.toLocaleString()} × ${inferredQty} = ${action.amount.toLocaleString()} ကျပ်) ရောင်းသည်မှန်ပါသလား?`,
                pendingConfirm: { product: matched, qty: inferredQty, date: action.date, source },
              });
              continue;
            }
            // No product match — save as regular income
            const tx: Transaction = {
              id: generateId(), userId: state.user.id,
              type: 'income', amount: action.amount,
              description: action.description, category: action.category,
              date: action.date, createdAt: new Date().toISOString(), source,
            };
            saveTransaction(state.user.id, tx);
            dispatch({ type: 'ADD_TRANSACTION', payload: tx });
            continue;
          }

          // All other actions (stock_out, expense) — process normally
          const result = processParsedAction({
            action, userId: state.user.id, products: currentProducts, dispatch, source,
          });
          if (result.ok) currentProducts = result.products;
          else addMessage({ role: 'assistant', content: result.message });
        }
      }

      // Regular transactions (no inventory context)
      for (const parsed of response.transactions) {
        if (parsed.type === 'income') {
          const matched = fuzzyMatchProduct(state.products, parsed.description);
          if (matched) {
            const inferredQty = Math.max(1, Math.round(parsed.amount / matched.sellingPrice));
            addMessage({
              role: 'assistant',
              content: `${matched.name} ${inferredQty} ${matched.unitLabel} (${matched.sellingPrice.toLocaleString()} × ${inferredQty} = ${parsed.amount.toLocaleString()} ကျပ်) ရောင်းသည်မှန်ပါသလား?`,
              pendingConfirm: { product: matched, qty: inferredQty, date: parsed.date, source },
            });
            continue;
          }
        }
        const tx: Transaction = {
          id: generateId(), userId: state.user.id,
          type: parsed.type, amount: parsed.amount,
          description: parsed.description, category: parsed.category,
          date: parsed.date, createdAt: new Date().toISOString(), source,
        };
        saveTransaction(state.user.id, tx);
        dispatch({ type: 'ADD_TRANSACTION', payload: tx });
      }

      addMessage({ role: 'assistant', content: response.replyMessage });
    } catch (err: any) {
      const msg: string = err?.message || err?.toString() || '';
      const isKeyError = msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || msg.includes('PERMISSION_DENIED');
      const isModelError = msg.includes('not found') || msg.includes('404') || msg.includes('is not supported');
      addMessage({
        role: 'assistant',
        content: isKeyError
          ? '❌ API Key မှားနေပါတယ်။ Settings မှာ သွားပြင်ပါ။'
          : isModelError
            ? '❌ Gemini model ကို access မရပါ။ API Key ၏ quota သို့မဟုတ် model access စစ်ဆေးပါ။'
            : `❌ Error: ${msg || 'မသိသောပြဿနာ'}`
      });
    } finally {
      setIsLoading(false);
    }
  }, [state.user, state.apiKey, state.isOnline, state.transactions, state.products, state.prefs.currency, addMessage, dispatch]);

  return { messages, sendMessage, isLoading, confirmSale };
}

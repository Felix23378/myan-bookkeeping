import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { parseTransactionFromText, parseTransactionFromAudio } from '../services/gemini';
import {
  saveTransaction,
  enqueueOffline,
  type Transaction
} from '../services/storage';
function generateId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
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

  const sendMessage = useCallback(async (userInput: string, audioBlob?: Blob) => {
    if (!state.user || !state.apiKey) return;

    addMessage({ role: 'user', content: audioBlob ? '🎤 ' + userInput : userInput });
    setIsLoading(true);

    // Offline: queue the message
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
      const response = audioBlob
        ? await parseTransactionFromAudio(state.apiKey, audioBlob, state.transactions, state.prefs.currency)
        : await parseTransactionFromText(state.apiKey, userInput, state.transactions, state.prefs.currency);

      // Save each extracted transaction
      for (const parsed of response.transactions) {
        const tx: Transaction = {
          id: generateId(),
          userId: state.user.id,
          type: parsed.type,
          amount: parsed.amount,
          description: parsed.description,
          category: parsed.category,
          date: parsed.date,
          createdAt: new Date().toISOString(),
          source: audioBlob ? 'voice' : 'chat',
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
  }, [state.user, state.apiKey, state.isOnline, state.transactions, state.prefs.currency, addMessage, dispatch]);

  return { messages, sendMessage, isLoading };
}

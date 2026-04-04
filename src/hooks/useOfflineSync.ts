import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getOfflineQueue, dequeueOfflineItem, saveTransaction, type Transaction } from '../services/storage';
import { parseTransactionFromText } from '../services/gemini';

function generateId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useOfflineSync() {
  const { state, dispatch } = useApp();

  useEffect(() => {
    if (!state.isOnline || !state.user || !state.apiKey) return;

    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    const processQueue = async () => {
      for (const item of queue) {
        try {
          const response = await parseTransactionFromText(state.apiKey!, item.message, state.transactions);
          for (const parsed of response.transactions) {
            const tx: Transaction = {
              id: generateId(),
              userId: state.user!.id,
              type: parsed.type,
              amount: parsed.amount,
              description: parsed.description,
              category: parsed.category,
              date: parsed.date,
              createdAt: new Date().toISOString(),
              source: 'chat',
            };
            saveTransaction(state.user!.id, tx);
            dispatch({ type: 'ADD_TRANSACTION', payload: tx });
          }
          dequeueOfflineItem(item.id);
        } catch {
          // Leave in queue if processing fails
        }
      }
    };

    processQueue();
  }, [state.isOnline]);
}

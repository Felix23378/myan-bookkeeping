import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { getApiKey, getUserPrefs, getTransactions, getProducts, getStockMovements, type Transaction, type UserPrefs, type Product, type StockMovement } from '../services/storage';

// ---- State ----
interface AppState {
  user: User | null;
  authLoading: boolean;
  apiKey: string | null;
  prefs: UserPrefs;
  transactions: Transaction[];
  products: Product[];
  stockMovements: StockMovement[];
  isOnline: boolean;
  activeTab: 'chat' | 'dashboard' | 'inventory' | 'settings';
}

// ---- Actions ----
type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'SET_API_KEY'; payload: string | null }
  | { type: 'SET_PREFS'; payload: Partial<UserPrefs> }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'SET_STOCK_MOVEMENTS'; payload: StockMovement[] }
  | { type: 'ADD_STOCK_MOVEMENT'; payload: StockMovement }
  | { type: 'DELETE_STOCK_MOVEMENT'; payload: string }
  | { type: 'SET_ONLINE'; payload: boolean }
  | { type: 'SET_TAB'; payload: AppState['activeTab'] };

// ---- Reducer ----
function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER': return { ...state, user: action.payload };
    case 'SET_AUTH_LOADING': return { ...state, authLoading: action.payload };
    case 'SET_API_KEY': return { ...state, apiKey: action.payload };
    case 'SET_PREFS': return { ...state, prefs: { ...state.prefs, ...action.payload } };
    case 'SET_TRANSACTIONS': return { ...state, transactions: action.payload };
    case 'ADD_TRANSACTION': return { ...state, transactions: [action.payload, ...state.transactions] };
    case 'UPDATE_TRANSACTION': return {
      ...state,
      transactions: state.transactions.map(t => t.id === action.payload.id ? action.payload : t)
    };
    case 'DELETE_TRANSACTION': return {
      ...state,
      transactions: state.transactions.filter(t => t.id !== action.payload)
    };
    case 'SET_PRODUCTS': return { ...state, products: action.payload };
    case 'ADD_PRODUCT': return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT': return {
      ...state,
      products: state.products.map(p => p.id === action.payload.id ? action.payload : p)
    };
    case 'DELETE_PRODUCT': return { ...state, products: state.products.filter(p => p.id !== action.payload) };
    case 'SET_STOCK_MOVEMENTS': return { ...state, stockMovements: action.payload };
    case 'ADD_STOCK_MOVEMENT': return { ...state, stockMovements: [action.payload, ...state.stockMovements] };
    case 'DELETE_STOCK_MOVEMENT': return { ...state, stockMovements: state.stockMovements.filter(m => m.id !== action.payload) };
    case 'SET_ONLINE': return { ...state, isOnline: action.payload };
    case 'SET_TAB': return { ...state, activeTab: action.payload };
    default: return state;
  }
}

// ---- Context ----
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const initialState: AppState = {
    user: null,
    authLoading: true,
    apiKey: null,
    prefs: getUserPrefs(),
    transactions: [],
    products: [],
    stockMovements: [],
    isOnline: navigator.onLine,
    activeTab: 'chat',
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  // Supabase auth state listener
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      dispatch({ type: 'SET_USER', payload: user });
      dispatch({ type: 'SET_AUTH_LOADING', payload: false });
      if (user) {
        dispatch({ type: 'SET_API_KEY', payload: getApiKey() });
        dispatch({ type: 'SET_TRANSACTIONS', payload: getTransactions(user.id) });
        dispatch({ type: 'SET_PRODUCTS', payload: getProducts(user.id) });
        dispatch({ type: 'SET_STOCK_MOVEMENTS', payload: getStockMovements(user.id) });
      }
    });

    // Listen for auth changes (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      dispatch({ type: 'SET_USER', payload: user });
      dispatch({ type: 'SET_AUTH_LOADING', payload: false });
      if (user) {
        dispatch({ type: 'SET_API_KEY', payload: getApiKey() });
        dispatch({ type: 'SET_TRANSACTIONS', payload: getTransactions(user.id) });
        dispatch({ type: 'SET_PRODUCTS', payload: getProducts(user.id) });
        dispatch({ type: 'SET_STOCK_MOVEMENTS', payload: getStockMovements(user.id) });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Online/offline listener
  useEffect(() => {
    const setOnline = () => dispatch({ type: 'SET_ONLINE', payload: true });
    const setOffline = () => dispatch({ type: 'SET_ONLINE', payload: false });
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  // Theme application
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.prefs.theme);
  }, [state.prefs.theme]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

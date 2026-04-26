import type { Dispatch } from 'react';
import type { ParsedInventoryAction } from './gemini';
import {
  saveProduct,
  saveStockMovement,
  saveTransaction,
  type Product,
  type StockMovement,
  type Transaction
} from './storage';

type AppDispatch = Dispatch<
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'ADD_STOCK_MOVEMENT'; payload: StockMovement }
>;

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeProductName(value: string): string {
  return value.trim().toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ');
}

export function findProductByName(products: Product[], productName: string): Product | undefined {
  const normalized = normalizeProductName(productName);
  return products.find(product => normalizeProductName(product.name) === normalized);
}

function charOverlapScore(a: string, b: string): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let overlap = 0;
  for (const c of setA) { if (setB.has(c)) overlap++; }
  return (2 * overlap) / (setA.size + setB.size);
}

export function fuzzyMatchProduct(products: Product[], text: string): Product | null {
  const normText = normalizeProductName(text);
  if (!normText || products.length === 0) return null;

  let best: Product | null = null;
  let bestScore = 0;

  for (const product of products) {
    const normName = normalizeProductName(product.name);
    if (!normName) continue;

    let score = 0;
    if (normText.includes(normName) || normName.includes(normText)) {
      score = 1.0;
    } else {
      score = charOverlapScore(normName, normText);
    }

    if (score > bestScore) { bestScore = score; best = product; }
  }

  return bestScore >= 0.55 ? best : null;
}

export function createProductRecord(userId: string, input: {
  name: string;
  unitLabel: string;
  currentQty: number;
  sellingPrice: number;
}): Product {
  const now = new Date().toISOString();
  return {
    id: generateId('product'),
    userId,
    name: input.name.trim(),
    unitLabel: input.unitLabel.trim(),
    currentQty: input.currentQty,
    sellingPrice: input.sellingPrice,
    createdAt: now,
    updatedAt: now,
  };
}

export function persistNewProduct(userId: string, product: Product, dispatch: AppDispatch): void {
  saveProduct(userId, product);
  dispatch({ type: 'ADD_PRODUCT', payload: product });
}

function createMovement(
  userId: string,
  product: Product,
  type: StockMovement['type'],
  qty: number,
  date: string,
  note: string,
  source: StockMovement['source'],
  unitPriceSnapshot?: number
): StockMovement {
  return {
    id: generateId('stock'),
    userId,
    productId: product.id,
    type,
    qty,
    unitPriceSnapshot,
    note,
    date,
    createdAt: new Date().toISOString(),
    source,
  };
}

function createIncomeTransaction(
  userId: string,
  product: Product,
  qty: number,
  date: string,
  source: Transaction['source']
): Transaction {
  return {
    id: generateId('tx'),
    userId,
    type: 'income',
    amount: qty * product.sellingPrice,
    description: `${product.name} ${qty} ${product.unitLabel} ရောင်းရ`,
    category: 'ရောင်းရငွေ',
    date,
    createdAt: new Date().toISOString(),
    source,
  };
}

function createExpenseTransaction(
  userId: string,
  productName: string,
  unitLabel: string,
  qty: number,
  totalCost: number,
  date: string,
  source: Transaction['source']
): Transaction {
  return {
    id: generateId('tx'),
    userId,
    type: 'expense',
    amount: totalCost,
    description: `${productName} ${qty} ${unitLabel} ဝယ်`,
    category: 'ကုန်ပစ္စည်းဝယ်ခ',
    date,
    createdAt: new Date().toISOString(),
    source,
  };
}

function updateProductQty(userId: string, product: Product, nextQty: number, dispatch: AppDispatch): Product {
  const updated: Product = {
    ...product,
    currentQty: nextQty,
    updatedAt: new Date().toISOString(),
  };
  saveProduct(userId, updated);
  dispatch({ type: 'UPDATE_PRODUCT', payload: updated });
  return updated;
}

type ActionSuccess = { ok: true; products: Product[] };
type ActionFailure = { ok: false; message: string };

function replaceProduct(products: Product[], updated: Product): Product[] {
  return products.map(product => product.id === updated.id ? updated : product);
}

export function processParsedAction(params: {
  action: ParsedInventoryAction;
  userId: string;
  products: Product[];
  dispatch: AppDispatch;
  source: 'chat' | 'voice';
}): ActionSuccess | ActionFailure {
  const { action, userId, products, dispatch, source } = params;

  if (action.kind === 'income' || action.kind === 'expense') {
    if (!action.amount || !action.description || !action.category) {
      return { ok: false, message: 'ငွေစာရင်းအချက်အလက် မပြည့်စုံပါ။' };
    }

    const tx: Transaction = {
      id: generateId('tx'),
      userId,
      type: action.kind,
      amount: action.amount,
      description: action.description,
      category: action.category,
      date: action.date,
      createdAt: new Date().toISOString(),
      source,
    };
    saveTransaction(userId, tx);
    dispatch({ type: 'ADD_TRANSACTION', payload: tx });
    return { ok: true, products };
  }

  if (!action.productName || !action.qty) {
    return { ok: false, message: 'ကုန်ပစ္စည်းနာမည် သို့မဟုတ် အရေအတွက် မပြည့်စုံပါ။' };
  }

  const product = findProductByName(products, action.productName);
  if (!product) {
    return { ok: false, message: `"${action.productName}" ဆိုတဲ့ ကုန်ပစ္စည်း မရှိသေးပါ။ Product အရင်ဖန်တီးပေးပါ။` };
  }

  if (action.kind === 'stock_in') {
    const updatedProduct = updateProductQty(userId, product, product.currentQty + action.qty, dispatch);
    const movement = createMovement(userId, product, 'stock_in', action.qty, action.date, action.reason || 'Chat stock in', source);
    saveStockMovement(userId, movement);
    dispatch({ type: 'ADD_STOCK_MOVEMENT', payload: movement });
    if (action.costPrice) {
      const expenseTx = createExpenseTransaction(userId, product.name, product.unitLabel, action.qty, action.costPrice, action.date, source);
      saveTransaction(userId, expenseTx);
      dispatch({ type: 'ADD_TRANSACTION', payload: expenseTx });
    }
    return { ok: true, products: replaceProduct(products, updatedProduct) };
  }

  if (product.currentQty < action.qty) {
    return { ok: false, message: `${product.name} လက်ကျန် ${product.currentQty} ${product.unitLabel} ပဲရှိလို့ ${action.qty} ${product.unitLabel} မလျှော့နိုင်ပါ။` };
  }

  if (action.kind === 'stock_out') {
    const updatedProduct = updateProductQty(userId, product, product.currentQty - action.qty, dispatch);
    const movement = createMovement(
      userId,
      product,
      'stock_out',
      action.qty,
      action.date,
      action.reason || 'Chat stock out',
      source
    );
    saveStockMovement(userId, movement);
    dispatch({ type: 'ADD_STOCK_MOVEMENT', payload: movement });
    return { ok: true, products: replaceProduct(products, updatedProduct) };
  }

  const updatedProduct = updateProductQty(userId, product, product.currentQty - action.qty, dispatch);
  const saleMovement = createMovement(
    userId,
    product,
    'sale',
    action.qty,
    action.date,
    `Sold ${action.qty} ${product.unitLabel}`,
    source,
    product.sellingPrice
  );
  saveStockMovement(userId, saleMovement);
  dispatch({ type: 'ADD_STOCK_MOVEMENT', payload: saleMovement });

  const incomeTx = createIncomeTransaction(userId, product, action.qty, action.date, source);
  saveTransaction(userId, incomeTx);
  dispatch({ type: 'ADD_TRANSACTION', payload: incomeTx });

  return { ok: true, products: replaceProduct(products, updatedProduct) };
}

export function createManualStockMovement(params: {
  userId: string;
  product: Product;
  qty: number;
  type: 'stock_in' | 'stock_out' | 'sale';
  date: string;
  note: string;
  totalCost?: number;
  dispatch: AppDispatch;
}): { ok: true } | { ok: false; message: string } {
  const { userId, product, qty, type, date, note, totalCost, dispatch } = params;
  if (qty <= 0) return { ok: false, message: 'အရေအတွက် မှန်ကန်စွာ ထည့်ပါ။' };
  if ((type === 'stock_out' || type === 'sale') && product.currentQty < qty) {
    return { ok: false, message: `${product.name} လက်ကျန်မလုံလောက်ပါ။` };
  }

  const nextQty = type === 'stock_in' ? product.currentQty + qty : product.currentQty - qty;
  updateProductQty(userId, product, nextQty, dispatch);
  const movement = createMovement(
    userId,
    product,
    type,
    qty,
    date,
    note,
    'manual',
    type === 'sale' ? product.sellingPrice : undefined
  );
  saveStockMovement(userId, movement);
  dispatch({ type: 'ADD_STOCK_MOVEMENT', payload: movement });

  if (type === 'sale') {
    const incomeTx = createIncomeTransaction(userId, product, qty, date, 'manual');
    saveTransaction(userId, incomeTx);
    dispatch({ type: 'ADD_TRANSACTION', payload: incomeTx });
  } else if (type === 'stock_in' && totalCost && totalCost > 0) {
    const expenseTx = createExpenseTransaction(userId, product.name, product.unitLabel, qty, totalCost, date, 'manual');
    saveTransaction(userId, expenseTx);
    dispatch({ type: 'ADD_TRANSACTION', payload: expenseTx });
  }

  return { ok: true };
}

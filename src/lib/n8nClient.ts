// src/lib/n8nClient.ts
/* ---------- Paths / ENV ---------- */
const BASE = String(import.meta.env.VITE_N8N_BASE_URL || 'http://localhost:5701').replace(/\/$/, '');
const P_START    = String(import.meta.env.VITE_N8N_PAYMENT_START    || '/webhook/payment-test/start');
const P_PROGRESS = String(import.meta.env.VITE_N8N_PAYMENT_PROGRESS || '/webhook/payment-test/progress');
const P_EVENTS   = String(import.meta.env.VITE_N8N_EVENTS           || '/webhook/payment-test/events');
const BASIC_RAW  = String(import.meta.env.VITE_N8N_BASIC || ''); // "user:pass"
const P_TEST_CARDS = String(import.meta.env.VITE_N8N_TEST_CARDS     || '/webhook/query/get-cards');
import type { RunData, RunStep } from '@/types/n8n';






/* ---------- Headers ---------- */
function buildHeaders(extra?: HeadersInit): HeadersInit {
  const auth = BASIC_RAW ? { Authorization: 'Basic ' + btoa(BASIC_RAW) } : {};
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...auth,
    ...(extra || {}),
  };
}

/* ---------- Low-level fetch helpers ---------- */
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'omit',
    headers: buildHeaders(init?.headers),
    ...init,
  });
  if (!res.ok) {
    let msg = '';
    try { msg = await res.text(); } catch {}
    throw new Error(`HTTP ${res.status} ${res.statusText} @ ${path}\n${msg}`);
  }
  return res.json() as Promise<T>;
}

async function getJSON<T>(path: string, query?: Record<string, any>, signal?: AbortSignal): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString(), { method: 'GET', headers: buildHeaders(), signal, credentials: 'omit' });
  if (!res.ok) {
    let msg = '';
    try { msg = await res.text(); } catch {}
    throw new Error(`HTTP ${res.status} ${res.statusText} @ GET ${path}\n${msg}`);
  }
  return res.json() as Promise<T>;
}


/** UI -> n8n start payload */
export type StartPayload = {
  // environment + channel
  env?: 'stb' | 'prp';
  channelId?: string;

  // optional segment (biz X kullanıyoruz)
  segment?: string;

  // application
  application: {
    applicationName: string;
    applicationPassword: string;
    secureCode: string;
    transactionId: string;
    transactionDateTime: string;
  };

  // user (header'da kullanılıyor)
  userId?: string;
  userName?: string;

  // payment toggles
  payment: {
    paymentType?: 'creditcard' | 'debitcard' | 'prepaidcard';
    threeDOperation: boolean;
    installmentNumber: number;
    options: {
      includeMsisdnInOrderID: boolean;
      checkCBBLForMsisdn: boolean;
      checkCBBLForCard: boolean;
      checkFraudStatus: boolean;
    };
    /** 3D seçiliyse opsiyonel */
    threeDSessionID?: string;
  };

  // ürün satırı (n8n Prepare Payment Data buradan okuyor)
  products: Array<{ amount: number | string; msisdn: string }>;

  // kart seçimi
  cardSelectionMode: 'automatic' | 'manual';
  manualCards?: Array<{
    ccno: string;
    e_month: string;
    e_year: string;
    cvv: string;
    bank_code?: string;
  }>;
  cardCount?: number;

  // ileride gerekirse
  runMode?: 'payment-only' | 'all';
};

export type N8nStartResponse = { runKey: string };

/* -------- long-poll /events types -------- */
export type N8nEventItem = {
  seq: number;
  time: string;
  name: string;
  status: 'running' | 'success' | 'error' | string;
  message?: string;
  request?: any;
  response?: any;
};

export type N8nEventsResponse = {
  runKey: string;
  status: 'running' | 'completed' | 'error';
  nextCursor: number;
  events: N8nEventItem[];
  endTime?: string | null;
};

/* ---------- API ---------- */
export async function startPayment(body: StartPayload, signal?: AbortSignal) {
  return req<N8nStartResponse>(P_START, { method: 'POST', body: JSON.stringify(body), signal });
}

export async function getProgress(runKey: string) {
  return getJSON<RunData>(P_PROGRESS, { runKey });
}

export async function longPollEvents(runKey: string, cursor = 0, waitSec = 25, signal?: AbortSignal) {
  return getJSON<N8nEventsResponse>(P_EVENTS, { runKey, cursor, waitSec }, signal);
}



export type TestCardRow = {
  bank_code: string;
  ccno: string;          // backend maskesiz dönerse UI'da maskeleyebiliriz
  e_month: string;
  e_year: string;
  status: 0 | 1;
  id?: number;
};

export async function listTestCards(signal?: AbortSignal) {
  const out = await getJSON<any>(P_TEST_CARDS, undefined, signal);
  return Array.isArray(out) ? out
       : Array.isArray(out?.items) ? out.items
       : Array.isArray(out?.data)  ? out.data
       : [];
}
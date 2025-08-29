// src/lib/n8nClient.ts
export type RunData = {
  status: 'running' | 'completed' | 'error';
  startTime?: string;
  endTime?: string|null;
  steps: Array<{
    time: string;
    name: string;
    status: 'running'|'success'|'error';
    message: string;
    request?: any;
    response?: any;
  }>;
  result?: any;
};

const BASE      = import.meta.env.VITE_N8N_BASE_URL ?? 'http://localhost:5701';
const P_START   = import.meta.env.VITE_N8N_PAYMENT_START ?? '/webhook/payment-test/start';
const P_PROGRESS= import.meta.env.VITE_N8N_PAYMENT_PROGRESS ?? '/webhook/payment-test/progress';
const P_PREVIEW = import.meta.env.VITE_N8N_CARD_PREVIEW ?? '/webhook/payment-test/card-preview';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export type StartPayload = {
  scenario?: 'token'|'payment'|'cancel'|'refund'|'full-suite';
  env?: string;          // STB vb. (n8n tarafında segment/ortam olarak kullanılabilir)
  channelId?: string;

  application: {
    applicationName: string;
    applicationPassword: string;
    secureCode: string;
    transactionId: string;
    transactionDateTime: string;
  };

  payment: {
    amount: number;
    msisdn: string;
    threeDOperation: boolean;
    installmentNumber: number;
    options: {
      includeMsisdnInOrderID: boolean;
      checkCBBLForMsisdn: boolean;
      checkCBBLForCard: boolean;
      checkFraudStatus: boolean;
    };
  };

  cardSelectionMode: 'automatic' | 'manual';
  manualCards?: Array<{
    ccno: string;
    e_month: string;
    e_year: string;
    cvv: string;
    bank_code?: string;
  }>;
  cardCount?: number;
  runKey?: string;
};

export async function startPayment(body: StartPayload) {
  return req<{ runKey: string }>(P_START, { method: 'POST', body: JSON.stringify(body) });
}

export async function getProgress(runKey: string) {
  const q = encodeURIComponent(runKey);
  return req<RunData>(`${P_PROGRESS}?runKey=${q}`);
}



export async function getCardPreview(params: { mode: 'automatic'|'manual'; manualCards?: any[] }) {
  const res = await fetch('/api/card-preview', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(params) });
  if (!res.ok) throw new Error('preview failed');
  return await res.json(); // [{id, bank, pan, exp, mode}]
}

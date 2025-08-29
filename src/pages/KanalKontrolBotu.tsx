// src/pages/KanalKontrolBotu.tsx
import React, { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { IndeterminateBar, SolidProgress } from "@/components/ProgressBar";
import CodeBlock from "@/components/CodeBlock";
import { useProgress } from "@/hooks/useProgress";
import { startPayment, type StartPayload } from "@/lib/n8nClient";
import StepPayment, { normalizeMsisdn, type PaymentState } from "@/components/wizard/StepPayment";
import { loadRuns, saveRun, type SavedRun } from "@/lib/runsStore";

/* ---------- small helpers ---------- */
function rand(n: number) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('').replace(/^0/, '1');
}
function nowStamp() {
  const d = new Date(); const z = (x: number) => (x < 10 ? '0' + x : '' + x);
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`;
}

/* ---------- types ---------- */
type ScenarioKey = "token" | "payment" | "cancel" | "refund" | "all";
type AppState = {
  applicationName: string;
  applicationPassword: string;
  secureCode: string;
  transactionId: string;
  transactionDateTime: string;
};

/* ---------- highlight extraction ---------- */
type Keyset = "TOKEN" | "HASHDATA" | "SESSIONID" | "PAYMENTID" | "ORDERID";
type Highlights = Partial<Record<Keyset, string[]>>;

function collectHighlights(steps: Array<{ request?: any; response?: any }>): Highlights {
  const H: Highlights = {};
  const push = (k: Keyset, v?: string | null) => {
    if (!v) return;
    if (!H[k]) H[k] = [];
    if (!H[k]!.includes(v)) H[k]!.push(v);
  };
  for (const s of steps) {
    const req = (s.request ?? {}) as any;
    const res = (s.response ?? {}) as any;

    push("TOKEN", res.cardToken ?? req.token ?? res.token);
    push("HASHDATA", req.hashData ?? res.hashData);
    push("SESSIONID", req.threeDSessionID ?? res.threeDSessionID ?? req.sessionId ?? res.sessionId);
    push("PAYMENTID", res.paymentId ?? req.paymentId);
    push("ORDERID", res.orderId ?? req.orderId ?? res.orderID);
  }
  return H;
}

/* ---------- category mapping (senaryoya göre) ---------- */
type CatKey = "Akış" | "Hash" | "Token" | "Ödeme" | "İptal" | "İade" | "Diğer";
function categorize(name = ""): CatKey {
  const n = name.toLowerCase();
  if (/hash/.test(n)) return "Hash";
  if (/token/.test(n)) return "Token";
  if (/pay|ödeme/.test(n)) return "Ödeme";
  if (/cancel|iptal/.test(n)) return "İptal";
  if (/refund|iade/.test(n)) return "İade";
  if (/başlat|start|akış/.test(n)) return "Akış";
  return "Diğer";
}

function groupByCategory<T extends { name?: string }>(arr: T[]) {
  const m = new Map<CatKey, T[]>();
  for (const it of arr) {
    const cat = categorize(it.name ?? "");
    m.set(cat, [...(m.get(cat) ?? []), it]);
  }
  return Array.from(m.entries());
}

/* =================================================================== */
export default function KanalKontrolBotu() {
  // Wizard modal
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1 as 1 | 2 | 3 | 4 | 5 | 6);

  // Step 1 — senaryo
  const [scenarios, setScenarios] = useState<ScenarioKey[]>(["payment"]);

  // Step 2 — ortam & kanal
  const [env, setEnv] = useState<"STB" | "PRP">("STB");
  const [channelId, setChannelId] = useState("999134");

  // Step 3 — application (DEFAULT BOŞ!)
  const [app, setApp] = useState<AppState>({
    applicationName: "",
    applicationPassword: "",
    secureCode: "",
    transactionId: "",
    transactionDateTime: "",
  });

  // Step 4 — kart/test
  const [mode, setMode] = useState<"automatic" | "manual">("automatic");
  const [cardCount, setCardCount] = useState<number>(10);
  const [manualCards, setManualCards] = useState<
    Array<{ ccno: string; e_month: string; e_year: string; cvv: string; bank_code?: string }>
  >([]);

  // Step 5 — ödeme
  const [payment, setPayment] = useState<PaymentState>({
    userId: "",
    userName: "",
    threeDOperation: false,
    installmentNumber: 0,
    amount: 10,
    msisdn: "5303589836",
    paymentType: "CREDITCARD",
    options: {
      includeMsisdnInOrderID: false,
      checkCBBLForMsisdn: true,
      checkCBBLForCard: true,
      checkFraudStatus: false,
    },
  });

  // Çalıştırma / progress
  const [runKey, setRunKey] = useState<string | null>(null);
  const { data: prog, error: progErr } = useProgress(runKey, 25);
  const steps = prog?.steps ?? [];
  const running = prog?.status === "running";

  // Geçmiş
  const [history, setHistory] = useState<SavedRun[]>(() => loadRuns());

  // payload
  const payload = useMemo<StartPayload>(() => ({
    env: env.toLowerCase() as 'stb' | 'prp',
    channelId,
    segment: "X",
    application: { ...app },
    userId: payment.userId,
    userName: payment.userName,
    payment: {
      paymentType: payment.paymentType.toLowerCase() as "creditcard" | "debitcard" | "prepaidcard",
      threeDOperation: payment.threeDOperation,
      installmentNumber: payment.installmentNumber,
      options: { ...payment.options },
    },
    products: [{ amount: payment.amount, msisdn: normalizeMsisdn(payment.msisdn) }],
    cardSelectionMode: mode,
    ...(mode === "manual"
      ? { manualCards: manualCards }
      : { cardCount }),
    runMode: "payment-only",
  }), [env, channelId, app, payment, mode, manualCards, cardCount]);

  async function onStart() {
    if (!(scenarios.includes("payment") || scenarios.includes("all"))) {
      alert("Şimdilik yalnızca Ödeme senaryosu tetiklenebiliyor.");
      return;
    }
    try {
      const res = await startPayment(payload);
      setRunKey(res.runKey);
      setWizardOpen(false);
    } catch (e) {
      alert("Start error: " + (e as Error).message);
    }
  }

  // Run bittiğinde history’e kaydet
  useEffect(() => {
    if (!runKey) return;
    if (prog?.status && prog.status !== 'running') {
      saveRun({
        runKey,
        savedAt: new Date().toISOString(),
        data: {
          status: prog.status,
          startTime: prog.startTime,
          endTime: prog.endTime,
          steps: prog.steps,
          result: (prog as any).result,
          params: (prog as any).params,
        },
      });
      setHistory(loadRuns());
    }
  }, [prog?.status, runKey]);

  // kategoriler + highlight’lar
  const grouped = useMemo(() => groupByCategory(steps), [steps]);
  const allHighlights = useMemo(() => collectHighlights(steps), [steps]);

  return (
    <div className="space-y-6">
      {/* Üst kart */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-base-100">Kanal Kontrol Botu</h1>
            <p className="max-w-3xl text-sm leading-6 text-base-300">
              Adımlar canlı; tamamlanınca rapor içinde kategori bazlı tüm request/response blokları görünür.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-base-700 px-2 py-1 text-xs text-base-300">
              Seçilen Channel ID: <strong className="ml-1 text-base-100">{channelId}</strong>
            </span>
            <button className="btn" onClick={() => { setStep(1); setWizardOpen(true); }}>
              Sihirbazı Aç
            </button>
          </div>
        </div>
      </div>

      {/* Progress Panel — Adımlar */}
      {runKey && (
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-base-400">
              Run Key: <code className="rounded bg-base-800 px-1 text-base-100">{runKey}</code>
            </div>
            <div className="w-56">{running ? <IndeterminateBar /> : <SolidProgress value={100} />}</div>
          </div>
          {progErr && <div className="mt-2 text-sm text-red-400">Hata: {progErr}</div>}

          <div className="mt-4">
            <div className="mb-2 font-medium">Adımlar</div>
            <ul className="max-h-80 space-y-2 overflow-auto">
              {steps.map((s, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${
                      s.status === "success" ? "bg-emerald-500" : s.status === "error" ? "bg-red-500" : "bg-amber-500"
                    }`} />
                    <span className="font-medium">{s.name}</span>
                    {s.message ? <span className="text-base-400">— {s.message}</span> : null}
                  </div>
                  <div className="ml-4 text-xs text-base-500">{new Date(s.time).toLocaleString()}</div>
                </li>
              ))}
              {!steps.length && <li className="text-sm text-base-500">Henüz step oluşmadı…</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Rapor — kategori + highlight + TÜM request/response */}
      {runKey && (
        <div className="card p-6">
          <div className="mb-2 font-medium">Rapor</div>

          {/* KOŞU DEVAM EDİYOR */}
          {running && (
            <div className="mb-3 rounded-xl border border-base-800 bg-base-900 p-4 text-sm text-base-400">
              Koşu sürüyor… Rapor hazır olduğunda burada görünecek.
            </div>
          )}

          {/* Global highlight (tüm akış) */}
          <HighlightBar title="Öne Çıkanlar (Tüm Akış)" data={allHighlights} />

          {/* Kategoriler */}
          <div className="mt-4 space-y-3">
            {grouped.map(([cat, arr]) => {
              const hs = collectHighlights(arr);
              const last = arr[arr.length - 1] as any;
              const dot =
                last?.status === "success" ? "bg-emerald-500" : last?.status === "error" ? "bg-red-500" : "bg-amber-500";
              return (
                <details key={cat} className="rounded-xl border border-base-800 bg-base-900 p-3" open>
                  <summary className="flex cursor-pointer list-none items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    <span className="font-medium">{cat}</span>
                    <span className="ml-2 rounded bg-base-800 px-2 py-0.5 text-xs text-base-400">{arr.length} step</span>
                  </summary>

                  {/* kategori highlight */}
                  <div className="mt-3">
                    <HighlightBar title="Öne Çıkanlar (Kategori)" data={hs} />
                  </div>

                  {/* tüm request/response’lar */}
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {arr.map((s, i) => (
                      <div key={i} className="space-y-2 rounded-xl border border-base-800 bg-base-900 p-3">
                        <div className="text-sm font-medium">{s.name}</div>
                        {s.message && <div className="text-xs text-base-400">{s.message}</div>}
                        {s.request !== undefined && (
                          <div>
                            <div className="mb-1 text-[11px] text-base-500">REQUEST</div>
                            <CodeBlock value={s.request} />
                          </div>
                        )}
                        {s.response !== undefined && (
                          <div>
                            <div className="mb-1 text-[11px] text-base-500">RESPONSE</div>
                            <CodeBlock value={s.response} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
            {!grouped.length && (
              <div className="rounded-xl border border-base-800 bg-base-900 p-3 text-sm text-base-400">
                Kategori bulunamadı.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Son 5 Koşu */}
      {history.length > 0 && (
        <div className="card p-6">
          <div className="mb-2 font-medium">Son 5 Koşu</div>
          <div className="space-y-3">
            {history.map((h) => {
              const g = groupByCategory(h.data.steps);
              const hi = collectHighlights(h.data.steps);
              return (
                <details key={h.runKey} className="rounded-xl border border-base-800 bg-base-900 p-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      h.data.status === 'completed' ? 'bg-emerald-500' : h.data.status === 'error' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    <span className="font-medium">{h.runKey}</span>
                    <span className="ml-2 text-xs text-base-400">{new Date(h.savedAt).toLocaleString()}</span>
                  </summary>
                  <div className="mt-3">
                    <HighlightBar title="Öne Çıkanlar" data={hi} />
                  </div>
                  <div className="mt-3 space-y-2">
                    {g.map(([cat, arr]) => (
                      <details key={cat} className="rounded-xl border border-base-800 bg-base-900 p-3">
                        <summary className="cursor-pointer list-none font-medium">{cat}</summary>
                        <div className="mt-2 grid gap-3 md:grid-cols-2">
                          {arr.map((s, i) => (
                            <div key={i} className="space-y-2 rounded-xl border border-base-800 bg-base-900 p-3">
                              <div className="text-sm font-medium">{s.name}</div>
                              {s.request && (<><div className="mb-1 text-[11px] text-base-500">REQUEST</div><CodeBlock value={s.request} /></>)}
                              {s.response && (<><div className="mb-1 text-[11px] text-base-500">RESPONSE</div><CodeBlock value={s.response} /></>)}
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}

      {/* Wizard */}
      <Modal open={wizardOpen} onClose={() => setWizardOpen(false)} title={`Wizard — ${STEP_LABELS[step - 1]}`}>
        <StepBar step={step} labels={STEP_LABELS} />

        {/* Step 1 — Senaryo */}
        {step === 1 && (
          <section className="space-y-3">
            <div className="text-sm text-base-300">Çalıştırılacak senaryoyu seçin.</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {(["token", "payment", "cancel", "refund", "all"] as ScenarioKey[]).map((k) => (
                <label
                  key={k}
                  className={`group flex cursor-pointer items-center justify-between rounded-xl border p-3 ${
                    scenarios.includes(k)
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-base-800 bg-base-900 hover:border-base-700"
                  }`}
                >
                  <span className="text-sm">{SCENARIOS[k].label}</span>
                  <input
                    type="checkbox"
                    checked={scenarios.includes(k)}
                    onChange={(e) => toggleScenario(k, e.target.checked, scenarios, setScenarios, k === "all")}
                  />
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button className="btn-outline" onClick={() => setWizardOpen(false)}>Geri</button>
              <button className="btn" onClick={() => setStep(2)}>İleri</button>
            </div>
          </section>
        )}

        {/* Step 2 — Ortam & Kanal */}
        {step === 2 && (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <div className="mb-1 text-sm">Ortam</div>
                <select className="input" value={env} onChange={(e) => setEnv(e.target.value as any)}>
                  <option value="STB">STB</option>
                  <option value="PRP">PRP</option>
                </select>
              </label>
              <Field label="Channel ID" value={channelId} onChange={setChannelId} />
            </div>
            <div className="text-xs text-base-400">Seçilen Channel ID’ler:
              <span className="ml-2 rounded-full border border-base-700 px-2 py-0.5"> {channelId} </span>
            </div>
            <div className="mt-6 flex justify-between">
              <button className="btn-outline" onClick={() => setStep(1)}>Geri</button>
              <button className="btn" onClick={() => setStep(3)}>İleri</button>
            </div>
          </section>
        )}

        {/* Step 3 — Application (default boş, preset doldurur) */}
        {step === 3 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-base-400">Hazır Application:</span>
              <button
                className="chip"
                onClick={() => setApp({
                  applicationName: "PAYCELLTEST",
                  applicationPassword: "",
                  secureCode: "",
                  transactionId: "",
                  transactionDateTime: "",
                })}
              >PAYCELLTEST</button>
              <button
                className="chip"
                onClick={() => setApp({
                  applicationName: "SENSAT",
                  applicationPassword: "H0287TA5K30P8DSJ",
                  secureCode: "H0287TA5K30P8DSJ",
                  transactionId: "00812142049000018727",
                  transactionDateTime: "20210812142051000",
                })}
              >SENSAT</button>
              <button className="chip" onClick={() => setApp({
                applicationName: "", applicationPassword: "", secureCode: "", transactionId: "", transactionDateTime: "",
              })}>Temizle</button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="applicationName" value={app.applicationName} onChange={(v) => setApp((a) => ({ ...a, applicationName: v }))} />
              <Field label="applicationPassword" value={app.applicationPassword} onChange={(v) => setApp((a) => ({ ...a, applicationPassword: v }))} />
              <Field label="secureCode" value={app.secureCode} onChange={(v) => setApp((a) => ({ ...a, secureCode: v }))} />
              <Field label="transactionId" value={app.transactionId} onChange={(v) => setApp((a) => ({ ...a, transactionId: v }))} />
              <Field label="transactionDateTime" value={app.transactionDateTime} onChange={(v) => setApp((a) => ({ ...a, transactionDateTime: v }))} />
            </div>

            <div className="mt-6 flex justify-between">
              <button className="btn-outline" onClick={() => setStep(2)}>Geri</button>
              <button className="btn" onClick={() => setStep(4)}>İleri</button>
            </div>
          </section>
        )}

        {/* Step 4 — Kart/Test */}
        {step === 4 && (
          <section className="space-y-4">
            <div className="grid items-end gap-3 md:grid-cols-3">
              <Field label="Kart Adedi" type="number" value={String(cardCount)} onChange={(v) => setCardCount(Number(v) || 0)} />
              <label className="flex items-center gap-2">
                <input type="radio" checked={mode === "automatic"} onChange={() => setMode("automatic")} />
                <span>Automatic (DB’den 10)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={mode === "manual"} onChange={() => setMode("manual")} />
                <span>Manual</span>
              </label>
            </div>

            {mode === "manual" && (
              <>
                <div className="mt-2 flex items-center justify-between">
                  <div className="font-medium">Kartlar</div>
                  <button
                    className="btn-outline"
                    onClick={() =>
                      setManualCards((cs) => [
                        ...cs,
                        { ccno: "", e_month: "", e_year: "", cvv: "" },
                      ])
                    }
                  >Kart Ekle</button>
                </div>

                <div className="max-h-72 space-y-3 overflow-auto">
                  {manualCards.map((c, idx) => (
                    <div key={idx} className="grid items-end gap-2 md:grid-cols-5">
                      <Field label="CC No" value={c.ccno} onChange={(v) => setManualCards((cs) => cs.map((x, i) => (i === idx ? { ...x, ccno: v } : x)))} />
                      <Field label="Ay" value={c.e_month} onChange={(v) => setManualCards((cs) => cs.map((x, i) => (i === idx ? { ...x, e_month: v } : x)))} />
                      <Field label="Yıl" value={c.e_year} onChange={(v) => setManualCards((cs) => cs.map((x, i) => (i === idx ? { ...x, e_year: v } : x)))} />
                      <Field label="CVV" value={c.cvv} onChange={(v) => setManualCards((cs) => cs.map((x, i) => (i === idx ? { ...x, cvv: v } : x)))} />
                      <div className="flex items-end">
                        <button className="h-10 rounded-xl border border-base-700 px-3 text-sm hover:bg-base-900" onClick={() => setManualCards((cs) => cs.filter((_, i) => i !== idx))}>Sil</button>
                      </div>
                    </div>
                  ))}
                  {manualCards.length === 0 && <div className="text-sm text-base-400">Henüz kart eklenmedi.</div>}
                </div>
              </>
            )}

            <div className="mt-6 flex justify-between">
              <button className="btn-outline" onClick={() => setStep(3)}>Geri</button>
              <button className="btn" onClick={() => setStep(5)}>İleri</button>
            </div>
          </section>
        )}

        {/* Step 5 — Ödeme */}
        {step === 5 && (
          <section className="space-y-4">
            <StepPayment value={payment} onChange={setPayment} />
            <div className="mt-6 flex justify-between">
              <button className="btn-outline" onClick={() => setStep(4)}>Geri</button>
              <button className="btn" onClick={() => setStep(6)}>İleri</button>
            </div>
          </section>
        )}

        {/* Step 6 — Özet */}
        {step === 6 && (
          <section className="space-y-4">
            <div className="card p-4">
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <Summary label="SENARYO" value={scenarios.includes("all") ? "full-suite" : scenarios.join(", ")} />
                <Summary label="ORTAM" value={env} />
                <Summary label="CHANNEL ID" value={channelId} />
                <Summary label="APPLICATIONNAME" value={app.applicationName || "-"} />
                <Summary label="TRANSACTIONID" value={app.transactionId || "-"} />
                <Summary label="TRANSACTIONDATETIME" value={app.transactionDateTime || "-"} />
                <Summary label="KART ADEDİ" value={String(mode === "manual" ? manualCards.length : cardCount)} />
                <Summary label="MSISDN" value={normalizeMsisdn(payment.msisdn)} />
                <Summary label="TUTAR" value={String(payment.amount)} />
                <Summary label="3D" value={String(payment.threeDOperation)} />
                <Summary label="TAKSİT" value={String(payment.installmentNumber)} />
                <Summary label="USER" value={`${payment.userName || '-'} (${payment.userId || '-'})`} />
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button className="btn-outline" onClick={() => setStep(5)}>Geri</button>
              <button className="btn" onClick={onStart}>Botu Çalıştır</button>
            </div>
          </section>
        )}
      </Modal>
    </div>
  );
}

/* ---------- small UI ---------- */
const STEP_LABELS = [
  "Senaryo Seçimi",
  "Ortam & Kanal",
  "Application Bilgileri",
  "Kart/Test Verisi",
  "Ödeme Bilgileri",
  "Özet & Çalıştır",
] as const;

const SCENARIOS: Record<ScenarioKey, { label: string }> = {
  token: { label: "Token Alma" },
  payment: { label: "3Dsiz Peşin Satış" },
  cancel: { label: "İptal" },
  refund: { label: "İade" },
  all: { label: "Hepsi" },
};

function StepBar({ step, labels }: { step: number; labels: readonly string[] }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {labels.map((l, i) => {
        const active = step === i + 1;
        return (
          <span
            key={l}
            className={`pill ${active ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" : "bg-base-900 text-base-400 ring-base-800"}`}
          >
            {`${i + 1}. ${l}`}
          </span>
        );
      })}
    </div>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; type?: "text" | "number"; placeholder?: string; }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm">{props.label}</div>
      <input className="input" value={props.value} onChange={(e) => props.onChange(e.target.value)} type={props.type ?? "text"} placeholder={props.placeholder} />
    </label>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-base-800 bg-transparent px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-base-500">{label}</div>
      <div className="mt-1 break-all text-sm text-base-100">{value}</div>
    </div>
  );
}
function toggleScenario(key: ScenarioKey, checked: boolean, list: ScenarioKey[], setList: (l: ScenarioKey[]) => void, isAll = false) {
  if (isAll || key === "all") return setList(checked ? ["all"] : []);
  const next = new Set(list.filter((s) => s !== "all"));
  checked ? next.add(key) : next.delete(key);
  setList([...next]);
}

function HighlightBar({ title, data }: { title: string; data: Highlights }) {
  const entries = Object.entries(data) as [Keyset, string[]][];
  if (!entries.length) return null;
  return (
    <div>
      <div className="mb-1 text-xs text-base-400">{title}</div>
      <div className="flex flex-wrap gap-2">
        {entries.map(([k, arr]) =>
          arr.map((v, i) => (
            <span key={`${k}-${i}-${v}`} className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
              {k}: <span className="ml-1 text-emerald-200">{v}</span>
            </span>
          )),
        )}
      </div>
    </div>
  );
}

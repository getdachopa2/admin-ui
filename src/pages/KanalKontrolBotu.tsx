import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { IndeterminateBar, SolidProgress } from "@/components/ProgressBar";
import CodeBlock from "@/components/CodeBlock";
import { useProgress } from "@/hooks/useProgress";
import { startPayment, type StartPayload } from "@/lib/n8nClient";
import StepPayment, { normalizeMsisdn, type PaymentState } from "@/components/wizard/StepPayment";

/* ---------- helpers ---------- */
function randDigits(n: number) {
  let s = "";
  while (s.length < n) s += Math.floor(Math.random() * 10);
  if (s[0] === "0") s = "1" + s.slice(1);
  return s.slice(0, n);
}
function nowStamp() {
  const d = new Date();
  const p = (x: number) => (x < 10 ? `0${x}` : `${x}`);
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/* ---------- presets ---------- */
const PRESET = {
  applicationName: "SENSAT",
  applicationPassword: "H0287TA5K30P8DSJ",
  secureCode: "H0287TA5K30P8DSJ",
  transactionId: "00812142049000018727",
  transactionDateTime: "20210812142051000",
} as const;

/* ---------- types ---------- */
type ScenarioKey = "token" | "payment" | "cancel" | "refund" | "all";
type AppState = {
  applicationName: string;
  applicationPassword: string;
  secureCode: string;
  transactionId: string;
  transactionDateTime: string;
};

/* =================================================================== */
export default function KanalKontrolBotu() {
  // Wizard modal
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1 as 1 | 2 | 3 | 4 | 5 | 6);

  // Step 1 — senaryo
  const [scenarios, setScenarios] = useState<ScenarioKey[]>(["payment"]);

  // Step 2 — ortam & kanal
  const [env, setEnv] = useState<"STB" | "PRD">("STB");
  const [channelId, setChannelId] = useState("999134");

  // Step 3 — application
  const [app, setApp] = useState<AppState>({
    applicationName: PRESET.applicationName,
    applicationPassword: PRESET.applicationPassword,
    secureCode: PRESET.secureCode,
    transactionId: randDigits(19),
    transactionDateTime: nowStamp(),
  });

  // Step 4 — kart/test
  const [mode, setMode] = useState<"automatic" | "manual">("automatic");
  const [cardCount, setCardCount] = useState<number>(10);
  const [bankCode, setBankCode] = useState("");
  const [manualCards, setManualCards] = useState<
    Array<{ ccno: string; e_month: string; e_year: string; cvv: string; bank_code?: string }>
  >([]);
  const addCard = () =>
    setManualCards((cs) => [...cs, { ccno: "", e_month: "", e_year: "", cvv: "", bank_code: bankCode || undefined }]);
  const updCard = (i: number, k: keyof (typeof manualCards)[number], v: string) =>
    setManualCards((cs) => cs.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)));
  const delCard = (i: number) => setManualCards((cs) => cs.filter((_, idx) => idx !== i));

  // Step 5 — ödeme bilgileri
  const [payment, setPayment] = useState<PaymentState>({
    userId: "",
    userName: "",
    threeDOperation: false,
    threeDSessionID: "",
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
  const { data: prog, error: progErr } = useProgress(runKey, 1200);
  const steps = prog?.steps ?? [];
  const lastStep = steps[steps.length - 1];
  const running = prog?.status === "running";

  // n8n payload (payment adımıyla senkron)
  const payload = useMemo<StartPayload>(
    () => ({
      application: { ...app },
      payment: {
        amount: payment.amount,
        msisdn: normalizeMsisdn(payment.msisdn),
        threeDOperation: payment.threeDOperation,
        installmentNumber: payment.installmentNumber,
        paymentType: payment.paymentType,
        ...(payment.threeDOperation ? { threeDSessionID: payment.threeDSessionID } : {}),
        userId: payment.userId,
        userName: payment.userName,
        options: { ...payment.options },
      } as any, // n8nClient tarafındaki tip kısıtına takılmamak için
      cardSelectionMode: mode,
      manualCards: mode === "manual" ? manualCards : undefined,
      channelId,
      segment: env,
    }),
    [app, payment, mode, manualCards, channelId, env],
  );

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

  return (
    <div className="space-y-6">
      {/* Üst kart */}
      <div className="card p-6">
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-base-100">Kanal Kontrol Botu</h1>
        <p className="max-w-3xl text-sm leading-6 text-base-300">
          Token / ödeme / iptal / iade akışlarını sihirbazla tetikle. Adımlar canlı raporlanır; tamamlanınca
          request/response blokları görünür.
        </p>
        <div className="mt-4">
          <button
            className="btn"
            onClick={() => {
              setStep(1);
              setWizardOpen(true);
            }}
          >
            Sihirbazı Aç
          </button>
        </div>
      </div>

      {/* Progress Panel */}
      {runKey && (
        <div className="card p-6">
          <div className="text-sm text-base-400">
            Run Key: <code className="rounded bg-base-800 px-1 text-base-100">{runKey}</code>
          </div>
          <div className="mt-3">{running ? <IndeterminateBar /> : <SolidProgress value={100} />}</div>
          {progErr && <div className="mt-2 text-sm text-red-400">Hata: {progErr}</div>}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="card p-4">
              <div className="mb-2 font-medium">Adımlar</div>
              <ul className="max-h-72 space-y-2 overflow-auto">
                {steps.map((s, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          s.status === "success"
                            ? "bg-emerald-500"
                            : s.status === "error"
                            ? "bg-red-500"
                            : "bg-amber-500"
                        }`}
                      />
                      <span className="font-medium">{s.name}</span>
                      <span className="text-base-400">— {s.message}</span>
                    </div>
                    <div className="ml-4 text-xs text-base-500">{new Date(s.time).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-4">
              <div className="mb-2 font-medium">Son İstek / Yanıt</div>
              {lastStep ? (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-xs text-base-500">REQUEST</div>
                    <CodeBlock value={lastStep.request ?? payload} lang="json" />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-base-500">RESPONSE</div>
                    <CodeBlock
                      value={typeof lastStep.response === "string" ? lastStep.response : lastStep.response ?? {}}
                      lang={
                        typeof lastStep.response === "string" &&
                        (lastStep.response as string).trim().startsWith("<")
                          ? "xml"
                          : "json"
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-base-500">Henüz step oluşmadı.</div>
              )}
            </div>
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
                  title={SCENARIOS[k].tip}
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
              <button className="btn-outline" onClick={() => setWizardOpen(false)}>
                Geri
              </button>
              <button className="btn" onClick={() => setStep(2)}>
                İleri
              </button>
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
                  <option value="PRD">PRD</option>
                </select>
              </label>

              <Field label="Channel ID" value={channelId} onChange={setChannelId} />
            </div>

            <div className="mt-6 flex justify-between">
              <button className="btn-outline" onClick={() => setStep(1)}>
                Geri
              </button>
              <button className="btn" onClick={() => setStep(3)}>
                İleri
              </button>
            </div>
          </section>
        )}

        {/* Step 3 — Application Bilgileri */}
        {step === 3 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-base-400">Hazır Application:</span>
              <button
                className={`chip ${
                  app.applicationName === "PAYCELLTEST" ? "border-emerald-500 bg-emerald-500/15 text-emerald-300" : ""
                }`}
                onClick={() =>
                  setApp({
                    ...PRESET,
                    applicationName: "PAYCELLTEST",
                    applicationPassword: "",
                    secureCode: "",
                    transactionId: "",
                    transactionDateTime: "",
                  })
                }
              >
                PAYCELLTEST
              </button>
              <button
                className={`chip ${
                  app.applicationName === "SENSAT" ? "border-emerald-500 bg-emerald-500/15 text-emerald-300" : ""
                }`}
                onClick={() => setApp({ ...PRESET })}
              >
                SENSAT
              </button>
              <button
                className="chip"
                onClick={() =>
                  setApp({
                    applicationName: "",
                    applicationPassword: "",
                    secureCode: "",
                    transactionId: "",
                    transactionDateTime: "",
                  })
                }
              >
                Temizle
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="applicationName"
                value={app.applicationName}
                onChange={(v) => setApp((a) => ({ ...a, applicationName: v }))}
              />
              <Field
                label="applicationPassword"
                value={app.applicationPassword}
                onChange={(v) => setApp((a) => ({ ...a, applicationPassword: v }))}
              />
              <Field label="secureCode" value={app.secureCode} onChange={(v) => setApp((a) => ({ ...a, secureCode: v }))} />
              <Field
                label="transactionId"
                value={app.transactionId}
                onChange={(v) => setApp((a) => ({ ...a, transactionId: v }))}
              />
              <Field
                label="transactionDateTime"
                value={app.transactionDateTime}
                onChange={(v) => setApp((a) => ({ ...a, transactionDateTime: v }))}
              />
            </div>

            <div className="mt-6 flex justify-between">
              <button className="btn-outline" onClick={() => setStep(2)}>
                Geri
              </button>
              <button className="btn" onClick={() => setStep(4)}>
                İleri
              </button>
            </div>
          </section>
        )}

        {/* Step 4 — Kart/Test Verisi */}
        {step === 4 && (
          <section className="space-y-4">
            <div className="grid items-end gap-3 md:grid-cols-3">
              <Field
                label="Kart Adedi"
                type="number"
                value={String(cardCount)}
                onChange={(v) => setCardCount(Number(v) || 0)}
              />
              <label className="flex items-center gap-2">
                <input type="radio" checked={mode === "automatic"} onChange={() => setMode("automatic")} />
                <span>Automatic (DB'den random aktif 10 kart)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={mode === "manual"} onChange={() => setMode("manual")} />
                <span>Manual (kartları siz ekleyin)</span>
              </label>
            </div>

            {mode === "manual" && (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Banka Kodu (ops.)" value={bankCode} onChange={setBankCode} placeholder="e.g. 62" />
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="font-medium">Kartlar</div>
                  <button className="btn-outline" onClick={addCard}>
                    Kart Ekle
                  </button>
                </div>

                <div className="max-h-72 space-y-3 overflow-auto">
                  {manualCards.map((c, idx) => (
                    <div key={idx} className="grid items-end gap-2 md:grid-cols-5">
                      <Field label="CC No" value={c.ccno} onChange={(v) => updCard(idx, "ccno", v)} />
                      <Field label="Ay" value={c.e_month} onChange={(v) => updCard(idx, "e_month", v)} />
                      <Field label="Yıl" value={c.e_year} onChange={(v) => updCard(idx, "e_year", v)} />
                      <Field label="CVV" value={c.cvv} onChange={(v) => updCard(idx, "cvv", v)} />
                      <div className="flex items-end gap-2">
                        <Field label="Banka" value={c.bank_code || ""} onChange={(v) => updCard(idx, "bank_code", v)} />
                        <button
                          className="h-10 rounded-xl border border-base-700 px-3 text-sm hover:bg-base-900"
                          onClick={() => delCard(idx)}
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                  {manualCards.length === 0 && (
                    <div className="text-sm text-base-400">Henüz kart eklenmedi.</div>
                  )}
                </div>
              </>
            )}

            <div className="mt-6 flex justify-between">
              <button className="btn-outline" onClick={() => setStep(3)}>
                Geri
              </button>
              <button className="btn" onClick={() => setStep(5)}>
                İleri
              </button>
            </div>
          </section>
        )}

        {/* Step 5 — Ödeme Bilgileri */}
        {step === 5 && (
          <section className="space-y-4">
            <StepPayment value={payment} onChange={setPayment} />
            <div className="mt-6 flex justify-between">
              <button className="btn-outline" onClick={() => setStep(4)}>
                Geri
              </button>
              <button className="btn" onClick={() => setStep(6)}>
                İleri
              </button>
            </div>
          </section>
        )}

        {/* Step 6 — Özet & Çalıştır */}
        {step === 6 && (
          <section className="space-y-4">
            <div className="card p-4">
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <Summary label="SENARYO" value={scenarios.includes("all") ? "full-suite" : scenarios.join(", ")} />
                <Summary label="ORTAM" value={env} />
                <Summary label="CHANNEL ID" value={channelId} />
                <Summary label="APPLICATIONNAME" value={app.applicationName} />
                <Summary label="TRANSACTIONID" value={app.transactionId} />
                <Summary label="TRANSACTIONDATETIME" value={app.transactionDateTime} />
                <Summary label="KART ADEDİ" value={String(mode === "manual" ? manualCards.length : cardCount)} />
                <Summary label="MSISDN" value={normalizeMsisdn(payment.msisdn)} />
                <Summary label="TUTAR" value={String(payment.amount)} />
                <Summary label="3D" value={String(payment.threeDOperation)} />
                <Summary label="TAKSİT" value={String(payment.installmentNumber)} />
                <Summary label="USER" value={`${payment.userName} (${payment.userId || "-"})`} />
              </div>
              <div className="mt-3 rounded border border-base-800 px-3 py-2 text-xs text-base-400">
                Çalıştırma Modu bilgisi: Kuyruk modunda sonuç arka planda takip edilir (polling).
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button className="btn-outline" onClick={() => setStep(5)}>
                Geri
              </button>
              <button className="btn" onClick={onStart}>
                Botu Çalıştır
              </button>
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

const SCENARIOS: Record<ScenarioKey, { label: string; tip: string }> = {
  token: { label: "Token Alma", tip: "Kart için token üretilir (ödeme yapılmaz)." },
  payment: { label: "3Dsiz Peşin Satış", tip: "Token ile ödeme yapılır (PAYMENT flow)." },
  cancel: { label: "İptal", tip: "Var olan bir paymentId için CANCEL SOAP çağrısı." },
  refund: { label: "İade", tip: "Var olan bir paymentId için REFUND SOAP çağrısı." },
  all: { label: "Hepsi", tip: "Full suite: token + payment (+ iptal/iade ileride). Şimdilik ödeme tetiklenir." },
};

function StepBar({ step, labels }: { step: number; labels: readonly string[] }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {labels.map((l, i) => {
        const active = step === i + 1;
        return (
          <span
            key={l}
            className={`pill ${
              active ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" : "bg-base-900 text-base-400 ring-base-800"
            }`}
          >
            {`${i + 1}. ${l}`}
          </span>
        );
      })}
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm">{props.label}</div>
      <input
        className="input"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        type={props.type ?? "text"}
        placeholder={props.placeholder}
      />
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

function toggleScenario(
  key: ScenarioKey,
  checked: boolean,
  list: ScenarioKey[],
  setList: (l: ScenarioKey[]) => void,
  isAll = false,
) {
  if (isAll || key === "all") return setList(checked ? ["all"] : []);
  const next = new Set(list.filter((s) => s !== "all"));
  checked ? next.add(key) : next.delete(key);
  setList([...next]);
}

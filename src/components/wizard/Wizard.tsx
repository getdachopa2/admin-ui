// src/components/wizard/Wizard.tsx
import { useMemo, useState, type ReactNode } from "react";
import StepCards from "./StepCards";
import StepSummary from "./StepSummary";
import StepPayment, { normalizeMsisdn, type PaymentState } from "./StepPayment";

/* -------------------------------------------------------
   Types & utils
------------------------------------------------------- */
type Scenario = "token" | "payment" | "cancel" | "refund" | "full-suite";
type ManualCard = { pan: string; month: string; year: string; cvv: string; bank?: string };

const luhnOk = (num: string) => {
  const s = num.replace(/\s+/g, "");
  if (!/^\d+$/.test(s)) return false;
  let sum = 0, dbl = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = parseInt(s[i], 10);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return sum % 10 === 0;
};

const makeRunKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);

/* -------------------------------------------------------
   Step meta
------------------------------------------------------- */
const StepTitles = [
  "Senaryo Seçimi",
  "Ortam & Kanal",
  "Application Bilgileri",
  "Kart/Test Verisi",
  "Ödeme Bilgileri",
  "Özet & Çalıştır",
] as const;

/* -------------------------------------------------------
   Component
------------------------------------------------------- */
export default function Wizard({
  onClose,
  onRun,
  queueMode,
  setQueueMode,
}: {
  onClose: () => void;
  onRun: (payload: any, queueMode: boolean) => Promise<void> | void;
  queueMode: boolean;
  setQueueMode: (v: boolean) => void;
}) {
  const [step, setStep] = useState(0);

  // Step 0 — Senaryo
  const [scenario, setScenario] = useState<Scenario>("payment");

  // Step 1 — Ortam & Kanal
  const [env, setEnv] = useState("STB");
  const [channelId, setChannelId] = useState("999134");

  // Step 2 — Application
  const [applicationName, setApplicationName] = useState("");
  const [applicationPassword, setApplicationPassword] = useState("");
  const [secureCode, setSecureCode] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [transactionDateTime, setTransactionDateTime] = useState("");
  const [activePreset, setActivePreset] = useState<"PAYCELLTEST" | "SENSAT" | null>(null);

  const applyPreset = (key: "PAYCELLTEST" | "SENSAT") => {
    setActivePreset(key);
    if (key === "SENSAT") {
      setApplicationName("SENSAT");
      setApplicationPassword("H0287TA5K30P8DSJ");
      setSecureCode("H0287TA5K30P8DSJ");
      setTransactionId("00812142049000018727");
      setTransactionDateTime("20210812142051000");
    } else {
      setApplicationName("PAYCELLTEST");
      setApplicationPassword("");
      setSecureCode("");
      setTransactionId("");
      setTransactionDateTime("");
    }
  };
  const clearPreset = () => {
    setActivePreset(null);
    setApplicationName("");
    setApplicationPassword("");
    setSecureCode("");
    setTransactionId("");
    setTransactionDateTime("");
  };

  // Step 3 — Kart/Test
  const [manualMode, setManualMode] = useState(false);
  const [manualCards, setManualCards] = useState<ManualCard[]>([{ pan: "", month: "", year: "", cvv: "" }]);
  const addCard = () => setManualCards((s) => [...s, { pan: "", month: "", year: "", cvv: "" }]);
  const removeCard = (i: number) => setManualCards((s) => s.filter((_, idx) => idx !== i));
  const updateCard = (i: number, k: keyof ManualCard, v: string) =>
    setManualCards((s) => s.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)));

  // Step 4 — Ödeme Bilgileri
  const [payment, setPayment] = useState<PaymentState>({
    amount: 10,
    installmentNumber: 0,
    msisdn: "",
    threeDOperation: false,
    userId: "",
    userName: "",
    paymentType: "CREDITCARD",
    options: {
      includeMsisdnInOrderID: false,
      checkCBBLForMsisdn: true,
      checkCBBLForCard: true,
      checkFraudStatus: false,
    },
  });

  // validation
  const manualValid =
    !manualMode ||
    (manualCards.length > 0 &&
      manualCards.every(
        (c) =>
          luhnOk(c.pan) &&
          /^\d{2}$/.test(c.month) &&
          /^\d{2,4}$/.test(c.year) &&
          /^\d{3,4}$/.test(c.cvv),
      ));

  const paymentValid = useMemo(() => {
    const okAmount = Number.isFinite(payment.amount) && payment.amount >= 1;
    const okInst = Number.isInteger(payment.installmentNumber) && payment.installmentNumber >= 0 && payment.installmentNumber <= 12;
    const msisdn10 = normalizeMsisdn(payment.msisdn);
    const okMsisdn = /^\d{10}$/.test(msisdn10) && msisdn10.startsWith("5");
    const okUser = !!payment.userId && !!payment.userName;
    return okAmount && okInst && okMsisdn && okUser;
  }, [payment]);

  const canNext = useMemo(() => {
    if (step === 0) return !!scenario;
    if (step === 1) return !!env && !!channelId; // 👈 kanal id zorunlu
    if (step === 2) return !!applicationName && !!applicationPassword && !!secureCode && !!transactionId && !!transactionDateTime;
    if (step === 3) return manualValid;
    if (step === 4) return paymentValid;
    return true;
  }, [
    step,
    scenario,
    env,
    channelId,
    applicationName,
    applicationPassword,
    secureCode,
    transactionId,
    transactionDateTime,
    manualValid,
    paymentValid,
  ]);

  /* -------------------------------------------------------
     Preview table + payload
  ------------------------------------------------------- */
  const tableData = useMemo(() => {
    if (manualMode && manualCards.length) {
      return manualCards.map((c, i) => ({
        id: i + 1,
        bank: c.bank || "-",
        pan: maskTail(c.pan),
        exp: `${c.month}/${c.year}`,
        mode: "MANUAL" as const,
      }));
    }
    return [
      { id: 101, bank: "134", pan: "•••• 5520", exp: "08/27", mode: "AUTO" as const },
      { id: 102, bank: "046", pan: "•••• 7742", exp: "03/28", mode: "AUTO" as const },
      { id: 103, bank: "064", pan: "•••• 8890", exp: "11/26", mode: "AUTO" as const },
    ];
  }, [manualMode, manualCards]);

  const buildPayload = () => {
    const payload: any = {
      step:
        scenario === "token"
          ? "token"
          : scenario === "payment"
          ? "payment"
          : scenario === "cancel"
          ? "cancel"
          : scenario === "refund"
          ? "refund"
          : "payment",
      env,
      channelId, // 👈 tekrar eklendi
      queue: queueMode,
      runKey: makeRunKey(),
      application: {
        applicationName,
        applicationPassword,
        secureCode,
        transactionId,
        transactionDateTime,
      },
      cardSelectionMode: manualMode ? "manual" : "automatic",
      cardCount: manualMode ? manualCards.length : 10,
      payment: {
        userId: payment.userId,
        userName: payment.userName,
        threeDOperation: payment.threeDOperation,
        installmentNumber: payment.installmentNumber,
        products: [{ amount: payment.amount, msisdn: normalizeMsisdn(payment.msisdn) }],
        paymentType: "CREDITCARD",
        options: { ...payment.options },
      },
    };

    if (manualMode) {
      payload.manualCards = manualCards.map((c) => ({
        pan: c.pan.replace(/\s+/g, ""),
        expMonth: c.month,
        expYear: c.year,
        cvv: c.cvv,
        bank: c.bank || undefined,
      }));
    }
    return payload;
  };

  /* -------------------------------------------------------
     Render
  ------------------------------------------------------- */
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 p-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-400">Kanal Kontrol Botu</div>
            <div className="text-lg font-semibold">Wizard — {StepTitles[step]}</div>
          </div>
          <button className="rounded-lg px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-800" onClick={onClose}>
            Kapat
          </button>
        </div>

        {/* Step pills */}
        <div className="grid grid-cols-6 gap-2 border-b border-neutral-800 p-3">
          {StepTitles.map((t, i) => (
            <div
              key={t}
              className={`rounded-xl px-3 py-2 text-center text-xs ring-1 ${
                i === step ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" : "bg-neutral-900 text-neutral-400 ring-neutral-800"
              }`}
            >
              {i + 1}. {t}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Step 0 — Senaryo */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-neutral-300">Çalıştırılacak senaryoyu seçin.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { key: "token", label: "Token Alma" },
                  { key: "payment", label: "3Dsiz Peşin Satış" },
                  { key: "cancel", label: "İptal" },
                  { key: "refund", label: "İade" },
                  { key: "full-suite", label: "Hepsi" },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${
                      scenario === (key as Scenario) ? "border-emerald-500/50 bg-emerald-500/10" : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
                    }`}
                  >
                    <span className="text-sm">{label}</span>
                    <input type="radio" name="scenario" value={key} checked={scenario === (key as Scenario)} onChange={() => setScenario(key as Scenario)} />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — Ortam & Kanal */}
          {step === 1 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Ortam">
                <select value={env} onChange={(e) => setEnv(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-sm">
                  <option value="STB">STB</option>
                  <option value="PRP" disabled>PRP (yakında)</option>
                </select>
              </Field>
              <Clearable label="Channel ID" value={channelId} onChange={setChannelId} />
            </div>
          )}

          {/* Step 2 — Application */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-neutral-400">Hazır Application:</span>
                <Chip active={activePreset === "PAYCELLTEST"} onClick={() => applyPreset("PAYCELLTEST")}>PAYCELLTEST</Chip>
                <Chip active={activePreset === "SENSAT"} onClick={() => applyPreset("SENSAT")}>SENSAT</Chip>
                <button type="button" onClick={clearPreset} className="ml-2 rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800">
                  Temizle
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Clearable label="applicationName" value={applicationName} onChange={(v) => { setActivePreset(null); setApplicationName(v); }} placeholder="örn. SENSAT" />
                <Clearable label="applicationPassword" value={applicationPassword} onChange={(v) => { setActivePreset(null); setApplicationPassword(v); }} placeholder="örn. H0287…" />
                <Clearable label="secureCode" value={secureCode} onChange={(v) => { setActivePreset(null); setSecureCode(v); }} placeholder="örn. H0287…" />
                <Clearable label="transactionId" value={transactionId} onChange={(v) => { setActivePreset(null); setTransactionId(v); }} placeholder="örn. 0081…" />
                <div className="sm:col-span-2">
                  <Clearable label="transactionDateTime" value={transactionDateTime} onChange={(v) => { setActivePreset(null); setTransactionDateTime(v); }} placeholder="örn. 20210812142051000" />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Kart/Test Verisi */}
          {step === 3 && (
            <StepCards
              manualMode={manualMode}
              setManualMode={setManualMode}
              manualCards={manualCards}
              addCard={addCard}
              removeCard={removeCard}
              updateCard={updateCard}
              manualValid={manualValid}
            />
          )}

          {/* Step 4 — Ödeme Bilgileri */}
          {step === 4 && <StepPayment value={payment} onChange={setPayment} />}

          {/* Step 5 — Özet */}
          {step === 5 && (
            <StepSummary
              fields={{
                Senaryo: scenario,
                Ortam: env,
                // Channel ID özet ekranda gösterilmeyecek (istenmedi)
                applicationName,
                transactionId,
                transactionDateTime,
                "Çalıştırma": "Kuyruk (polling)",
                "Kart Adedi": manualMode ? String(manualCards.length) : "10",
                Tutar: String(payment.amount),
                Taksit: String(payment.installmentNumber),
                "3D": payment.threeDOperation ? "Açık" : "Kapalı",
                MSISDN: normalizeMsisdn(payment.msisdn).replace(/^(\d{3})(\d{3})(\d{2})(\d{2})$/, "5** *** ** **") || "-",
                User: `${payment.userId} • ${payment.userName}`,
              }}
              flags={{
                "CBBL-MSISDN": payment.options.checkCBBLForMsisdn,
                "CBBL-CARD": payment.options.checkCBBLForCard,
                Fraud: payment.options.checkFraudStatus,
                "Msisdn→OrderID": payment.options.includeMsisdnInOrderID,
              }}
              tableData={tableData}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-800 p-4">
          <button className="rounded-xl px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Geri
          </button>
          {step < StepTitles.length - 1 ? (
            <button
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${canNext ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-neutral-800 text-neutral-500"}`}
              disabled={!canNext}
              onClick={() => canNext && setStep((s) => s + 1)}
            >
              İleri
            </button>
          ) : (
            <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500" onClick={() => onRun(buildPayload(), queueMode)}>
              Botu Çalıştır
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   Small UI helpers
------------------------------------------------------- */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Clearable({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <label className="text-xs text-neutral-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 p-2 pr-9 text-sm"
      />
      {!!value && (
        <button type="button" className="absolute right-2 top-[26px] grid h-6 w-6 place-items-center rounded-md text-neutral-400 hover:bg-neutral-800" onClick={() => onChange("")}>
          ×
        </button>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs border ${active ? "border-emerald-500 bg-emerald-500/15 text-emerald-300" : "border-neutral-700 text-neutral-300 hover:bg-neutral-800"}`}
    >
      {children}
    </button>
  );
}

function maskTail(pan: string) {
  const c = pan.replace(/\s+/g, "");
  return c.length < 4 ? "••••" : "•••• " + c.slice(-4);
}

import { useMemo, useState } from 'react';
import StepCards from '@/components/wizard/StepCards';
import StepSummary from '@/components/wizard/StepSummary';
import type { ManualCard, Scenario } from '@/types/n8n';

const StepTitles = [
  'Senaryo Seçimi',
  'Ortam & Kanal',
  'Application Bilgileri',
  'Kart/Test Verisi',
  'Özet & Çalıştır',
] as const;

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
  const [step, setStep] = useState(0 as 0 | 1 | 2 | 3 | 4);

  // Senaryo & ortam
  const [scenario, setScenario] = useState<Scenario>('full-suite');
  const [env, setEnv] = useState('STB');
  const [channelId, setChannelId] = useState('999134');

  // Application
  type AppState = {
    applicationName: string;
    applicationPassword: string;
    secureCode: string;
    transactionId: string;
    transactionDateTime: string;
  };
  const [app, setApp] = useState<AppState>({
    applicationName: '',
    applicationPassword: '',
    secureCode: '',
    transactionId: '',
    transactionDateTime: '',
  });
  const [activePreset, setActivePreset] = useState<'PAYCELLTEST' | 'SENSAT' | null>(null);

  const applyPreset = (key: 'PAYCELLTEST' | 'SENSAT') => {
    setActivePreset(key);
    if (key === 'SENSAT') {
      setApp({
        applicationName: 'SENSAT',
        applicationPassword: 'H0287TA5K30P8DSJ',
        secureCode: 'H0287TA5K30P8DSJ',
        transactionId: '00812142049000018727',
        transactionDateTime: '20210812142051000',
      });
    } else {
      setApp({
        applicationName: 'PAYCELLTEST',
        applicationPassword: '',
        secureCode: '',
        transactionId: '',
        transactionDateTime: '',
      });
    }
  };
  const clearApp = () => {
    setActivePreset(null);
    setApp({ applicationName: '', applicationPassword: '', secureCode: '', transactionId: '', transactionDateTime: '' });
  };

  // Kart/test
  const [manualMode, setManualMode] = useState(false);
  const [manualCards, setManualCards] = useState<ManualCard[]>([{ pan: '', month: '', year: '', cvv: '' }]);
  const addCard = () => setManualCards((s) => [...s, { pan: '', month: '', year: '', cvv: '' }]);
  const removeCard = (i: number) => setManualCards((s) => s.filter((_, idx) => idx !== i));
  const updateCard = (i: number, key: keyof ManualCard, v: string) =>
    setManualCards((s) => s.map((c, idx) => (idx === i ? { ...c, [key]: v } : c)));

  // Validation (manuel kart adımı)
  const manualValid =
    !manualMode ||
    (manualCards.length > 0 &&
      manualCards.every(
        (c) => /^\d{12,19}$/.test(c.pan.replace(/\s+/g, '')) && /^\d{2}$/.test(c.month) && /^\d{2,4}$/.test(c.year) && /^\d{3,4}$/.test(c.cvv),
      ));

  const canNext = useMemo(() => {
    if (step === 0) return !!scenario;
    if (step === 1) return !!env && !!channelId;
    if (step === 2)
      return !!app.applicationName && !!app.applicationPassword && !!app.secureCode && !!app.transactionId && !!app.transactionDateTime;
    if (step === 3) return manualValid;
    return true;
  }, [step, scenario, env, channelId, app, manualValid]);

  const buildPayload = () => {
    const payload: any = {
      application: {
        applicationName: app.applicationName,
        applicationPassword: app.applicationPassword,
        secureCode: app.secureCode,
        transactionId: app.transactionId,
        transactionDateTime: app.transactionDateTime,
      },
      payment: {
        amount: 10,
        msisdn: '5303589836',
        threeDOperation: false,
        installmentNumber: 0,
        options: {
          includeMsisdnInOrderID: false,
          checkCBBLForMsisdn: true,
          checkCBBLForCard: true,
          checkFraudStatus: false,
        },
      },
      cardSelectionMode: manualMode ? 'manual' : 'automatic',
      ...(manualMode ? { manualCards } : {}),
      channelId,
      segment: env,
      step: scenario === 'payment' ? 'payment' : scenario === 'cancel' ? 'cancel' : scenario === 'refund' ? 'refund' : 'token',
      queue: queueMode,
    };
    return payload;
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-[1120px] overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl">
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
        <div className="grid grid-cols-5 gap-2 border-b border-neutral-800 p-3">
          {StepTitles.map((t, i) => (
            <div
              key={t}
              className={`rounded-xl px-3 py-2 text-center text-xs ring-1 ${
                i === step
                  ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                  : 'bg-neutral-900 text-neutral-400 ring-neutral-800'
              }`}
            >
              {i + 1}. {t}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-neutral-300">Çalıştırılacak senaryoyu seçin.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {([
                  { key: 'token', label: 'Token Alma' },
                  { key: 'payment', label: '3Dsiz Peşin Satış' },
                  { key: 'cancel', label: 'İptal' },
                  { key: 'refund', label: 'İade' },
                  { key: 'full-suite', label: 'Hepsi' },
                ] as { key: Scenario; label: string }[]).map(({ key, label }) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${
                      scenario === key ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                    }`}
                  >
                    <span className="text-sm">{label}</span>
                    <input
                      type="radio"
                      name="scenario"
                      value={key}
                      checked={scenario === (key as Scenario)}
                      onChange={() => setScenario(key as Scenario)}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-neutral-400">Ortam</label>
                <select
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-sm"
                >
                  <option value="STB">STB</option>
                  <option value="PRD">PRD</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-400">Channel ID</label>
                <input
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-sm"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-neutral-400">Hazır Application:</span>
                <Chip active={activePreset === 'PAYCELLTEST'} onClick={() => applyPreset('PAYCELLTEST')}>
                  PAYCELLTEST
                </Chip>
                <Chip active={activePreset === 'SENSAT'} onClick={() => applyPreset('SENSAT')}>
                  SENSAT
                </Chip>
                <button
                  type="button"
                  onClick={clearApp}
                  className="ml-2 rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
                >
                  Temizle
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="applicationName" value={app.applicationName} onChange={(v) => setApp((a) => ({ ...a, applicationName: v }))} />
                <Field label="applicationPassword" value={app.applicationPassword} onChange={(v) => setApp((a) => ({ ...a, applicationPassword: v }))} />
                <Field label="secureCode" value={app.secureCode} onChange={(v) => setApp((a) => ({ ...a, secureCode: v }))} />
                <Field label="transactionId" value={app.transactionId} onChange={(v) => setApp((a) => ({ ...a, transactionId: v }))} />
                <div className="sm:col-span-2">
                  <Field
                    label="transactionDateTime"
                    value={app.transactionDateTime}
                    onChange={(v) => setApp((a) => ({ ...a, transactionDateTime: v }))}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <StepCards
              manualMode={manualMode}
              setManualMode={setManualMode}
              manualCards={manualCards}
              addCard={addCard}
              removeCard={removeCard}
              updateCard={updateCard}
            />
          )}

          {step === 4 && (
            <StepSummary
              fields={{
                Senaryo: scenario,
                Ortam: env,
                'Channel ID': channelId,
                applicationName: app.applicationName,
                transactionId: app.transactionId,
                transactionDateTime: app.transactionDateTime,
                Çalıştırma: 'Kuyruk (polling)',
                'Kart Adedi': manualMode ? String(manualCards.length) : '10',
              }}
              manualMode={manualMode}
              manualCards={manualCards}
              fixedCount={10}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-neutral-800 p-4">
          <button
            className="rounded-xl px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
            onClick={() => setStep((s) => Math.max(0, (s as number) - 1) as any)}
            disabled={step === 0}
          >
            Geri
          </button>
          <div className="flex items-center gap-3">
            {step < StepTitles.length - 1 ? (
              <button
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  canNext ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-neutral-800 text-neutral-500'
                }`}
                onClick={() => canNext && setStep((s) => ((s as number) + 1) as any)}
                disabled={!canNext}
              >
                İleri
              </button>
            ) : (
              <button
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                onClick={() => onRun(buildPayload(), queueMode)}
              >
                Botu Çalıştır
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- small UI --- */
function Field({
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
    <label className="block">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 p-2 pr-9 text-sm"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1.5 grid h-7 w-7 place-items-center rounded-md text-neutral-400 hover:bg-neutral-800"
            aria-label={`${label} temizle`}
            title="Temizle"
          >
            ×
          </button>
        )}
      </div>
    </label>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs border ${
        active ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
      }`}
    >
      {children}
    </button>
  );
}

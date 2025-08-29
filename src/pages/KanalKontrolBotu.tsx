import React, { useMemo, useState } from 'react';
import { Wizard } from '@/components/wizard/Wizard';
import { useProgress } from '@/hooks/useProgress';
import { startPayment } from '@/lib/n8nClient';
import CodeBlock from '@/components/CodeBlock';
import { IndeterminateBar, SolidProgress } from '@/components/ProgressBar';

type ScenarioKey = 'token' | 'payment' | 'cancel' | 'refund' | 'all';

export default function KanalKontrolBotu() {
  // wizard
  const [wizardOpen, setWizardOpen] = useState(false);

  // progress
  const [runKey, setRunKey] = useState<string | null>(null);
  const { data: prog, error: progErr } = useProgress(runKey, 1200);
  const steps = prog?.steps ?? [];
  const lastStep = steps[steps.length - 1];
  const running = prog?.status === 'running';

  // sadece bu sayfada CTA
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
        <h1 className="mb-2 text-xl font-semibold tracking-tight">Kanal Kontrol Botu</h1>
        <p className="max-w-3xl text-sm text-neutral-400">
          n8n akışlarını sihirbaz ile tetikle. Adımlar canlı raporlanır; tamamlanınca son request/response blokları
          görünür.
        </p>
        <button
          className="mt-4 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          onClick={() => setWizardOpen(true)}
        >
          Sihirbazı Aç
        </button>
      </div>

      {runKey && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
          <div className="text-sm text-neutral-500">
            Run Key: <code className="rounded bg-neutral-800 px-1 text-neutral-100">{runKey}</code>
          </div>
          <div className="mt-3">{running ? <IndeterminateBar /> : <SolidProgress value={100} />}</div>
          {progErr && <div className="mt-2 text-sm text-red-400">Hata: {progErr}</div>}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="mb-2 font-medium">Adımlar</div>
              <ul className="max-h-72 space-y-2 overflow-auto">
                {steps.map((s, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          s.status === 'success'
                            ? 'bg-emerald-500'
                            : s.status === 'error'
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      <span className="font-medium">{s.name}</span>
                      <span className="text-neutral-400">— {s.message}</span>
                    </div>
                    <div className="ml-4 text-xs text-neutral-500">
                      {new Date(s.time).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="mb-2 font-medium">Son İstek / Yanıt</div>
              {lastStep ? (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-xs text-neutral-500">REQUEST</div>
                    <CodeBlock value={lastStep.request ?? {}} lang="json" />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-neutral-500">RESPONSE</div>
                    <CodeBlock
                      value={
                        typeof lastStep.response === 'string'
                          ? lastStep.response
                          : (lastStep.response ?? {})
                      }
                      lang={
                        typeof lastStep.response === 'string' &&
                        (lastStep.response as string).trim().startsWith('<')
                          ? 'xml'
                          : 'json'
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-neutral-500">Henüz step oluşmadı.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Wizard modal */}
      {wizardOpen && (
        <Wizard
          onClose={() => setWizardOpen(false)}
          onRun={async (payload: any) => {
            try {
              const res = await startPayment(payload as StartPayload);
              setRunKey(res.runKey);
              setWizardOpen(false);
            } catch (e) {
              alert('Start error: ' + (e as Error).message);
            }
          }}
          queueMode={true}
          setQueueMode={() => {}}
        />
      )}
    </div>
  );
}
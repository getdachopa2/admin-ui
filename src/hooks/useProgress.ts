// src/hooks/useProgress.ts
import { useEffect, useRef, useState } from 'react';
import type { RunData, RunStep } from '@/types/n8n';
import { longPollEvents } from '@/lib/n8nClient';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** İçerikten terminal state sezgisi */
const looksTerminal = (steps: RunStep[]) => {
  if (!steps.length) return false;
  const last = steps[steps.length - 1];
  const txt = `${last?.name ?? ''} ${last?.message ?? ''}`.toLowerCase();
  return /final|rapor|report|tamamlan|payment.*success|ödeme.*başar/i.test(txt);
};

export function useProgress(runKey: string | null, waitSec = 25) {
  const [data, setData] = useState<RunData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const cursorRef = useRef(0);

  useEffect(() => {
    if (!runKey) return;

    // başlangıç state
    setData({
      status: 'running',
      startTime: new Date().toISOString(),
      endTime: null,
      steps: [],
    });

    // önceki poll’u iptal et
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    cursorRef.current = 0;

    let cancelled = false;
    let emptyHits = 0; // arka arkaya boş dönüş sayacı (backoff için)

    const loop = async () => {
      while (!cancelled) {
        try {
          const res = await longPollEvents(
            runKey,
            cursorRef.current,
            waitSec,
            abortRef.current!.signal,
          );

          const raw = Array.isArray(res?.events) ? res!.events : [];
          const newSteps: RunStep[] = raw.map((e) => ({
            time: e.time,
            name: e.name,
            status:
              e.status === 'running' || e.status === 'success' || e.status === 'error'
                ? e.status
                : 'running',
            message: e.message,
            request: e.request,
            response: e.response,
          }));

          const nextCursor =
            typeof res?.nextCursor === 'number' ? res!.nextCursor : cursorRef.current;
          const hasNew = newSteps.length > 0 || nextCursor !== cursorRef.current;

          setData((prev) => {
            const steps = [...(prev?.steps ?? []), ...newSteps];
            const terminalByApi =
              res?.status === 'completed' || res?.status === 'error' || !!res?.endTime;
            const terminal = terminalByApi || looksTerminal(steps);

            return {
              status: terminal ? (res?.status ?? 'completed') : (res?.status ?? prev?.status ?? 'running'),
              startTime: prev?.startTime,
              endTime: terminal ? (res?.endTime ?? new Date().toISOString()) : (prev?.endTime ?? null),
              steps,
              result: prev?.result,
              params: (prev as any)?.params,
            };
          });

          cursorRef.current = nextCursor;

          // çıkış koşulu
          if (res?.status === 'completed' || res?.status === 'error' || !!res?.endTime) break;

          // backoff — boş dönüşlerde beklemeyi artır
          if (!hasNew && res?.status === 'running') {
            emptyHits = Math.min(emptyHits + 1, 6); // max ~6 adım
            await sleep(300 * emptyHits); // 300ms → … → 1800ms
          } else {
            emptyHits = 0; // yeni veri geldiyse sıfırla
          }
        } catch (e: any) {
          if (e?.name === 'AbortError') break; // run değişti veya ekran kapandı
          setError(e?.message || String(e));
          break;
        }
      }
    };

    loop();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [runKey, waitSec]);

  return { data, error };
}

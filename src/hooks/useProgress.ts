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

/**
 * waitSec: sunucuya uzun-poll timeout (saniye)
 * minGapMs: İKİ çağrı arası minimum bekleme (ms) – istemci tarafı throttle
 */
export function useProgress(runKey: string | null, waitSec = 25, minGapMs = 2000) {
  const [data, setData] = useState<RunData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const cursorRef = useRef(0);

  // StrictMode / yeniden-mount koruması için epoch
  const loopIdRef = useRef(0);

  useEffect(() => {
    if (!runKey) return;

    // başlangıç state
    setData({
      status: 'running',
      startTime: new Date().toISOString(),
      endTime: null,
      steps: [],
    });
    setError(null);

    // önceki poll’u iptal et
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    cursorRef.current = 0;
    const myLoopId = ++loopIdRef.current;

    let cancelled = false;
    let emptyHits = 0; // arka arkaya boş dönüş sayacı (backoff için)

    const loop = async () => {
      while (!cancelled && loopIdRef.current === myLoopId) {
        const t0 = Date.now();
        try {
          const res = await longPollEvents(
            runKey,
            cursorRef.current,
            waitSec,
            abortRef.current!.signal,
          );

          const raw = Array.isArray(res?.events) ? res.events : [];
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
            typeof res?.nextCursor === 'number' ? res.nextCursor : cursorRef.current;

          const hasNew = newSteps.length > 0 || nextCursor !== cursorRef.current;

          setData((prev) => {
            const steps = [...(prev?.steps ?? []), ...newSteps];
            const terminalByApi =
              res?.status === 'completed' || res?.status === 'error' || !!res?.endTime;
            const terminal = terminalByApi || looksTerminal(steps);

            return {
              status: terminal
                ? (res?.status ?? 'completed')
                : (res?.status ?? prev?.status ?? 'running'),
              startTime: prev?.startTime,
              endTime: terminal
                ? (res?.endTime ?? new Date().toISOString())
                : (prev?.endTime ?? null),
              steps,
              result: prev?.result,
              params: (prev as any)?.params,
            };
          });

          cursorRef.current = nextCursor;

          // çıkış koşulu
          if (res?.status === 'completed' || res?.status === 'error' || !!res?.endTime) break;

          // ---- İstemci-tarafı throttle + backoff ----
          const elapsed = Date.now() - t0;
          const baseGap = Math.max(minGapMs - elapsed, 0);

          // boş dönüşlerde artan bekleme: 500ms → 5s (tavana sabitlenir)
          const backoff = !hasNew ? Math.min(5000, 500 * (emptyHits + 1)) : 0;
          emptyHits = !hasNew ? Math.min(emptyHits + 1, 10) : 0;

          await sleep(baseGap + backoff);
        } catch (e: any) {
          if (e?.name === 'AbortError' || cancelled || loopIdRef.current !== myLoopId) break;
          setError(e?.message || String(e));
          // hatada biraz bekleyip tekrar dene
          await sleep(3000);
        }
      }
    };

    loop();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [runKey, waitSec, minGapMs]);

  return { data, error };
}

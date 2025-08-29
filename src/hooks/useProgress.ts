import { useEffect, useRef, useState } from 'react';
import type { RunData, RunStep } from '@/types/n8n';
import { longPollEvents } from '@/lib/n8nClient';

export function useProgress(runKey: string | null, waitSec = 25) {
  const [data, setData] = useState<RunData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cursorRef = useRef(0);

  useEffect(() => {
    if (!runKey) return;

    setData({
      status: 'running',
      startTime: new Date().toISOString(),
      endTime: null,
      steps: [],
    });

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    cursorRef.current = 0;
    let cancelled = false;

    const loop = async () => {
      while (!cancelled) {
        try {
          const r = await longPollEvents(runKey, cursorRef.current, waitSec, abortRef.current!.signal);

          // ---- DEFANSİF KATMAN ----
          const rawEvents = Array.isArray(r?.events) ? r.events : [];
          const newSteps: RunStep[] = rawEvents.map(e => ({
            time: e.time,
            name: e.name,
            status: (e.status === 'running' || e.status === 'success' || e.status === 'error') ? e.status : 'running',
            message: e.message,
            request: e.request,
            response: e.response,
          }));

          setData(prev => ({
            status: r?.status ?? prev?.status ?? 'running',
            startTime: prev?.startTime,
            endTime: r?.endTime ?? prev?.endTime ?? null,
            steps: [...(prev?.steps ?? []), ...newSteps],
            result: prev?.result,
          }));

          if (typeof r?.nextCursor === 'number') {
            cursorRef.current = r.nextCursor;
          }

          const done = (r?.status === 'completed' || r?.status === 'error');
          if (done) break;
        } catch (e: any) {
          if (e?.name === 'AbortError') break;
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

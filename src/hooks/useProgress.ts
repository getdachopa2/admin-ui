import { useEffect, useRef, useState } from 'react';
import type { RunData } from '@/types/n8n';
import { getProgress } from '@/lib/n8nClient';

export function useProgress(runKey: string | null, intervalMs = 1200) {
  const [data, setData] = useState<RunData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  // stale & timeout guard
  const lastCount = useRef<number>(-1);
  const staleTicks = useRef(0);
  const startedAt = useRef<number | null>(null);
  const MAX_MINUTES = 3;         // <- ihtiyaca göre
  const STALE_LIMIT = 10;        // ~12 sn (10 * 1.2s)

  useEffect(() => {
    if (!runKey) return;
    startedAt.current = Date.now();
    lastCount.current = -1;
    staleTicks.current = 0;

    const stop = () => {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
    };

    const tick = async () => {
      try {
        const d = await getProgress(runKey);
        setData(d);

        // normal bitiş
        if (d.status === 'completed' || d.status === 'error') {
          stop();
          return;
        }

        // stale guard (adım sayısı değişmiyorsa)
        const count = Array.isArray(d.steps) ? d.steps.length : 0;
        if (count === lastCount.current) {
          staleTicks.current += 1;
        } else {
          staleTicks.current = 0;
          lastCount.current = count;
        }
        if (staleTicks.current >= STALE_LIMIT) {
          // koşu fiilen bitti ama status set edilmedi → güvenli sonlandır
          stop();
          setData({
             ...d, status: 'completed', endTime: d.endTime ?? new Date().toISOString() });
          return;
        }

        // max süre guard
        if (startedAt.current && Date.now() - startedAt.current > MAX_MINUTES * 60_000) {
          stop();
          setData({ ...d, status: 'completed', endTime: d.endTime ?? new Date().toISOString() });
          return;
        }
      } catch (e: any) {
        setError(e.message || String(e));
      }
    };

    // start
    stop();
    tick();
    timer.current = window.setInterval(tick, intervalMs);

    return stop;
  }, [runKey, intervalMs]);

  return { data, error };
}

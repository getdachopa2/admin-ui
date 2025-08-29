import { useEffect, useRef, useState } from 'react';
import type { RunData } from '@/types/n8n';
import { getProgress } from '@/lib/n8nClient';

export function useProgress(runKey: string | null, intervalMs = 1200) {
  const [data, setData] = useState<RunData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!runKey) return;
    const tick = async () => {
      try {
        const d = await getProgress(runKey);
        setData(d);
        if (d.status === 'completed' || d.status === 'error') stop();
      } catch (e: any) {
        setError(e.message || String(e));
      }
    };
    const start = () => {
      stop();
      tick();
      timer.current = window.setInterval(tick, intervalMs);
    };
    const stop = () => {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
    };
    start();
    return stop;
  }, [runKey, intervalMs]);

  return { data, error };
}

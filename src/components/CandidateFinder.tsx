// src/components/CandidateFinder.tsx
import { useEffect, useRef, useState, useMemo } from 'react';
import { listCandidates, type CandidateRow } from '@/lib/n8nClient';

export default function CandidateFinder({
  action,
  channelId,
  onPick,
}: {
  action: 'cancel' | 'refund';
  channelId: string;
  onPick: (row: CandidateRow) => void;
}) {
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // tarih default’ları
  const today = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const yest = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

  const [from, setFrom] = useState(
    action === 'cancel' ? toISO(today) : toISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)),
  );
  const [to, setTo] = useState(action === 'cancel' ? toISO(today) : toISO(yest));
  const [limit, setLimit] = useState(50);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const abortRef = useRef<AbortController | null>(null);

  async function run() {
    if (!channelId) {
      setErr('Channel ID gerekli');
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setErr(null);
    try {
      const data = await listCandidates({ action, channelId, from, to, limit }, ac.signal);
      setRows(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setErr(e?.message || 'Kayıtlar alınamadı');
    } finally {
      if (abortRef.current === ac) setLoading(false);
    }
  }

  useEffect(() => {
    run(); // ilk açılış
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // derived: sayfa verisi
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = useMemo(() => rows.slice(start, start + pageSize), [rows, start, pageSize]);

  const isSuccess = (v: CandidateRow['success']) =>
    (typeof v === 'boolean' && v) || String(v).toLowerCase() === 'true';

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-6">
        <label className="block">
          <div className="mb-1 text-xs text-neutral-400">Aksiyon</div>
          <div className="input">{action}</div>
        </label>
        <label className="block">
          <div className="mb-1 text-xs text-neutral-400">Channel ID</div>
          <div className="input">{channelId}</div>
        </label>
        <label className="block">
          <div className="mb-1 text-xs text-neutral-400">From</div>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="block">
          <div className="mb-1 text-xs text-neutral-400">To</div>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="block">
          <div className="mb-1 text-xs text-neutral-400">Limit (server)</div>
          <input
            type="number"
            className="input"
            value={String(limit)}
            onChange={(e) => setLimit(Number(e.target.value) || 0)}
            min={1}
            max={500}
          />
        </label>
        <label className="block">
          <div className="mb-1 text-xs text-neutral-400">Sayfa Boyutu (UI)</div>
          <select className="input" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {[10, 15, 20, 30, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button className="btn" onClick={run} disabled={loading}>
          {loading ? 'Yükleniyor…' : 'Adayları Getir'}
        </button>
        {err && <div className="text-sm text-red-400">{err}</div>}
        <div className="ml-auto text-xs text-base-400">
          Toplam: <span className="font-medium text-base-200">{total}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-base-800 overflow-hidden">
        <div className="flex items-center justify-between border-b border-base-800 p-3">
          <div className="font-medium">Adaylar</div>
          <div className="text-xs text-base-400">
            Sayfa {safePage}/{totalPages}
          </div>
        </div>

        {/* SCROLLABLE TABLE */}
        <div className="overflow-auto max-h-96">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-neutral-900/90 backdrop-blur text-neutral-400">
              <tr>
                <Th>#</Th>
                <Th>paymentId</Th>
                <Th>orderId</Th>
                <Th>amount</Th>
                <Th>app</Th>
                <Th>createdAt</Th>
                <Th>success</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r, i) => (
                <tr key={`${r.paymentId}-${i}`} className="border-t border-base-800 hover:bg-base-900/40">
                  <Td>{start + i + 1}</Td>
                  <Td className="font-mono">{r.paymentId}</Td>
                  <Td className="font-mono">{r.orderId || '—'}</Td>
                  <Td>{r.amount}</Td>
                  <Td>{r.app}</Td>
                  <Td>{new Date(r.createdAt).toLocaleString()}</Td>
                  <Td>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isSuccess(r.success)
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {String(r.success)}
                    </span>
                  </Td>
                  <Td>
                    <button className="btn-outline" onClick={() => onPick(r)}>
                      Seç
                    </button>
                  </Td>
                </tr>
              ))}
              {!paged.length && (
                <tr>
                  <Td colSpan={8}>
                    <div className="p-4 text-sm text-base-400">Kayıt bulunamadı.</div>
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between border-t border-base-800 p-3 text-sm">
          <div className="text-xs text-base-400">
            {start + 1}-{Math.min(start + pageSize, total)} / {total}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-outline" onClick={() => setPage(1)} disabled={safePage <= 1}>
              « İlk
            </button>
            <button className="btn-outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>
              ‹ Önceki
            </button>
            <button
              className="btn-outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              Sonraki ›
            </button>
            <button
              className="btn-outline"
              onClick={() => setPage(totalPages)}
              disabled={safePage >= totalPages}
            >
              Son »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Th(props: React.PropsWithChildren<React.ThHTMLAttributes<HTMLTableCellElement>>) {
  return <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide" {...props} />;
}
function Td(props: React.PropsWithChildren<React.TdHTMLAttributes<HTMLTableCellElement>>) {
  return <td className="px-3 py-2 align-middle" {...props} />;
}

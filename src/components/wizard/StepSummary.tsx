// src/components/wizard/StepSummary.tsx
export default function StepSummary({
  fields,
  tableData,
  loading,
}:{ 
  fields: Record<string,string>;
  tableData: Array<{id:number; bank:string; pan:string; exp:string; mode:string}>;
  loading?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Object.entries(fields).map(([k,v])=> (
          <div key={k} className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">{k}</div>
            <div className="mt-1 break-all text-sm text-neutral-200">{v}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-800">
        <div className="flex items-center justify-between border-b border-neutral-800 p-3">
          <div className="font-medium">Teste Girecek Kartlar</div>
          <div className="text-xs text-neutral-400">{loading ? "Yükleniyor…" : "Önizleme"}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-900/60 text-neutral-400">
              <tr>
                <Th>#</Th><Th>Banka</Th><Th>Kart</Th><Th>Son K.T.</Th><Th>Mod</Th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((r)=> (
                <tr key={r.id} className="border-t border-neutral-800 hover:bg-neutral-900/40">
                  <Td>{r.id}</Td>
                  <Td>{r.bank}</Td>
                  <Td>{r.pan}</Td>
                  <Td>{r.exp}</Td>
                  <Td><span className={`rounded-full px-2 py-0.5 text-xs ${r.mode==="AUTO"?"bg-primary-500/15 text-primary-300":"bg-neutral-800 text-neutral-300"}`}>{r.mode}</span></Td>
                </tr>
              ))}
              {!tableData.length && !loading && (
                <tr><Td colSpan={5}><div className="p-4 text-neutral-400">Kayıt yok.</div></Td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
function Th({ children }:{ children: React.ReactNode }) { return <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide">{children}</th>; }
function Td({ children, colSpan }:{ children: React.ReactNode; colSpan?: number }) { return <td className="px-3 py-2 align-middle" colSpan={colSpan}>{children}</td>; }

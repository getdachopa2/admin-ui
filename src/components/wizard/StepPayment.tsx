import { useMemo } from "react";

export type PaymentState = {
  amount: number;
  installmentNumber: number;
  msisdn: string;            // UI'da 10 hane (5xxxxxxxxx) olacak
  threeDOperation: boolean;
  userId: string;
  userName: string;
  options: {
    includeMsisdnInOrderID: boolean;
    checkCBBLForMsisdn: boolean;
    checkCBBLForCard: boolean;
    checkFraudStatus: boolean;
  };
};

export function normalizeMsisdn(v: string) {
  const d = (v || "").replace(/\D/g, "");
  // 90/0 başı varsa at
  const trimmed = d.startsWith("90") ? d.slice(2) : d.startsWith("0") ? d.slice(1) : d;
  return trimmed.slice(0, 10);
}

export default function StepPayment({
  value,
  onChange,
}: {
  value: PaymentState;
  onChange: (p: PaymentState) => void;
}) {
  const valid = useMemo(() => {
    const okAmount = Number.isFinite(value.amount) && value.amount >= 1;
    const okInst = Number.isInteger(value.installmentNumber) && value.installmentNumber >= 0 && value.installmentNumber <= 12;
    const msisdn = normalizeMsisdn(value.msisdn);
    const okMsisdn = /^\d{10}$/.test(msisdn) && msisdn.startsWith("5");
    const okUser = !!value.userId && !!value.userName;
    return okAmount && okInst && okMsisdn && okUser;
  }, [value]);

  // üst bileşen "İleri" butonunu kontrol edebilmesi için validity'i className ile belli ediyoruz (görsel ipucu)
  return (
    <div className="space-y-5">
      {/* Temel Alanlar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Tutar">
          <input
            type="number"
            min={1}
            value={value.amount}
            onChange={(e) => onChange({ ...value, amount: Number(e.target.value) || 0 })}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-sm"
          />
        </Field>

        <Field label="Taksit (0–12)">
          <input
            type="number"
            min={0}
            max={12}
            value={value.installmentNumber}
            onChange={(e) => onChange({ ...value, installmentNumber: Math.max(0, Math.min(12, Number(e.target.value) || 0)) })}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-sm"
          />
        </Field>

        <Field label="MSISDN (5xxxxxxxxx)">
          <input
            value={value.msisdn}
            onChange={(e) => onChange({ ...value, msisdn: e.target.value })}
            onBlur={(e) => onChange({ ...value, msisdn: normalizeMsisdn(e.target.value) })}
            placeholder="5xxxxxxxxx"
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-sm"
          />
        </Field>
      </div>

      {/* 3D & User */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="3D İşlem">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.threeDOperation}
              onChange={(e) => onChange({ ...value, threeDOperation: e.target.checked })}
            />
            <span>{value.threeDOperation ? "Açık" : "Kapalı"}</span>
          </label>
        </Field>

        <Field label="User ID">
          <input
            value={value.userId}
            onChange={(e) => onChange({ ...value, userId: e.target.value })}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-sm"
          />
        </Field>

        <Field label="User Name">
          <input
            value={value.userName}
            onChange={(e) => onChange({ ...value, userName: e.target.value })}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-sm"
          />
        </Field>
      </div>

      {/* Opsiyonlar */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
        <div className="mb-2 text-xs uppercase tracking-wide text-neutral-400">Opsiyonlar</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Tgl
            label="includeMsisdnInOrderID"
            checked={value.options.includeMsisdnInOrderID}
            onChange={(v) => onChange({ ...value, options: { ...value.options, includeMsisdnInOrderID: v } })}
          />
          <Tgl
            label="checkCBBLForMsisdn"
            checked={value.options.checkCBBLForMsisdn}
            onChange={(v) => onChange({ ...value, options: { ...value.options, checkCBBLForMsisdn: v } })}
          />
          <Tgl
            label="checkCBBLForCard"
            checked={value.options.checkCBBLForCard}
            onChange={(v) => onChange({ ...value, options: { ...value.options, checkCBBLForCard: v } })}
          />
          <Tgl
            label="checkFraudStatus"
            checked={value.options.checkFraudStatus}
            onChange={(v) => onChange({ ...value, options: { ...value.options, checkFraudStatus: v } })}
          />
        </div>
      </div>

      {!valid && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
          Lütfen tutar ≥ 1, taksit 0–12, MSISDN 5xxxxxxxxx ve kullanıcı bilgilerini doldurun.
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-neutral-400">{label}</div>
      {children}
    </label>
  );
}

function Tgl({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

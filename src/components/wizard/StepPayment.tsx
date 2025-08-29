// src/components/wizard/StepPayment.tsx
import React from "react";

/** MSISDN normalizasyonu — 053x… ise 90 ekler. */
export function normalizeMsisdn(x: string) {
  let d = (x || "").replace(/\D+/g, "");
  if (d.startsWith("0")) d = "90" + d.slice(1);
  if (!d.startsWith("90")) d = d;
  return d;
}

export type PaymentState = {
  userId: string;
  userName: string;
  amount: number;
  msisdn: string;
  threeDOperation: boolean;
  installmentNumber: number;
  paymentType: "CREDITCARD" | "DEBITCARD" | "WALLET" | "CARD_TOKEN";
  options: {
    includeMsisdnInOrderID: boolean;
    checkCBBLForMsisdn: boolean;
    checkCBBLForCard: boolean;
    checkFraudStatus: boolean;
  };
};

export default function StepPayment({
  value,
  onChange,
}: {
  value: PaymentState;
  onChange: (v: PaymentState) => void;
}) {
  const v = value;
  const set = <K extends keyof PaymentState>(k: K, val: PaymentState[K]) =>
    onChange({ ...v, [k]: val });
  const setOpt = <K extends keyof PaymentState["options"]>(
    k: K,
    val: PaymentState["options"][K],
  ) => onChange({ ...v, options: { ...v.options, [k]: val } });

  const applyTPAY = () => {
    onChange({ ...v, userId: "5315236097", userName: "TPAY" });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-400">Hazır Kullanıcı:</span>
        <button
          type="button"
          className="rounded-full border border-emerald-600/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
          onClick={applyTPAY}
        >
          TPAY
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="User ID" value={v.userId} onChange={(x) => set("userId", x)} />
        <Field label="User Name" value={v.userName} onChange={(x) => set("userName", x)} />
        <Field
          label="Tutar"
          type="number"
          value={String(v.amount)}
          onChange={(x) => set("amount", Number(x) || 0)}
        />
        <Field label="MSISDN" value={v.msisdn} onChange={(x) => set("msisdn", x)} placeholder="5303589836" />

        {/* 3D dropdown */}
        <label className="block">
          <div className="mb-1 text-sm">3D ile Öde</div>
          <select
            className="input"
            value={String(v.threeDOperation)}
            onChange={(e) => set("threeDOperation", e.target.value === "true")}
          >
            <option value="false">false</option>
            <option value="true">true</option>
          </select>
        </label>

        <Field
          label="Taksit (0 = peşin)"
          type="number"
          value={String(v.installmentNumber)}
          onChange={(x) => set("installmentNumber", Number(x) || 0)}
        />
      </div>

      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <Check label="includeMsisdnInOrderID" checked={v.options.includeMsisdnInOrderID} onChange={(on) => setOpt("includeMsisdnInOrderID", on)} />
        <Check label="checkCBBLForMsisdn" checked={v.options.checkCBBLForMsisdn} onChange={(on) => setOpt("checkCBBLForMsisdn", on)} />
        <Check label="checkCBBLForCard" checked={v.options.checkCBBLForCard} onChange={(on) => setOpt("checkCBBLForCard", on)} />
        <Check label="checkFraudStatus" checked={v.options.checkFraudStatus} onChange={(on) => setOpt("checkFraudStatus", on)} />
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm">{label}</div>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type ?? "text"}
        placeholder={placeholder}
      />
    </label>
  );
}
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

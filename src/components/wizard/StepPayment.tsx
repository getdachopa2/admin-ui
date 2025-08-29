// src/components/wizard/StepPayment.tsx
import React from "react";

/** MSISDN -> '90...' */
export function normalizeMsisdn(x: string) {
  let d = (x || "").replace(/\D+/g, "");
  if (d.startsWith("0")) d = "90" + d.slice(1);
  if (!d.startsWith("90")) d = "90" + d;
  return d;
}

export type PaymentState = {
  userId: string;
  userName: string;
  amount: number;
  msisdn: string;
  threeDOperation: boolean;
  installmentNumber: number;

  /** 3D seçilince doldurulacak, opsiyonel */
  threeDSessionID?: string;

  /** Zorunlu; UI’da şimdilik sabit tutabiliriz */
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
    val: PaymentState["options"][K]
  ) => onChange({ ...v, options: { ...v.options, [k]: val } });

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="User ID" value={v.userId} onChange={(x) => set("userId", x)} />
        <Field label="User Name" value={v.userName} onChange={(x) => set("userName", x)} />
        <Field
          label="Tutar"
          type="number"
          value={String(v.amount)}
          onChange={(x) => set("amount", Number(x) || 0)}
        />
        <Field
          label="MSISDN"
          value={v.msisdn}
          onChange={(x) => set("msisdn", x)}
          placeholder="5303589836"
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={v.threeDOperation}
            onChange={(e) => set("threeDOperation", e.target.checked)}
          />
          <span>3D ile öde</span>
        </label>
        {v.threeDOperation && (
          <Field
            label="threeDSessionID"
            value={v.threeDSessionID ?? ""}
            onChange={(x) => set("threeDSessionID", x)}
            placeholder="3D session id"
          />
        )}
        <Field
          label="Taksit (0 = peşin)"
          type="number"
          value={String(v.installmentNumber)}
          onChange={(x) => set("installmentNumber", Number(x) || 0)}
        />
        {/* paymentType şimdilik sabit kalacaksa kapalı tutalım */}
        <div className="hidden">
          <Field
            label="Payment Type"
            value={v.paymentType}
            onChange={(x) =>
              set("paymentType", x as PaymentState["paymentType"])
            }
          />
        </div>
      </div>

      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={v.options.includeMsisdnInOrderID}
            onChange={(e) => setOpt("includeMsisdnInOrderID", e.target.checked)}
          />
          <span>includeMsisdnInOrderID</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={v.options.checkCBBLForMsisdn}
            onChange={(e) => setOpt("checkCBBLForMsisdn", e.target.checked)}
          />
          <span>checkCBBLForMsisdn</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={v.options.checkCBBLForCard}
            onChange={(e) => setOpt("checkCBBLForCard", e.target.checked)}
          />
          <span>checkCBBLForCard</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={v.options.checkFraudStatus}
            onChange={(e) => setOpt("checkFraudStatus", e.target.checked)}
          />
          <span>checkFraudStatus</span>
        </label>
      </div>
    </section>
  );
}

/* small input */
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

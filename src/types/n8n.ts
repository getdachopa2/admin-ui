// src/types/n8n.ts

export type StepStatus = "running" | "success" | "error";

export type ManualCard = {
  pan: string;    // 4111 1111 1111 1111
  month: string;  // "07"
  year: string;   // "26" veya "2026"
  cvv: string;    // "123"
  bank?: string;  // opsiyonel
};

// 👇 EKSİK OLAN: Wizard'ın beklediği senaryo tipi
export type Scenario = "token" | "payment" | "cancel" | "refund" | "full-suite";
// (İsterseniz alias)
export type ScenarioKey = Scenario;

export type RunStep = {
  time: string;
  name: string;
  status: StepStatus;
  message?: string;
  request?: unknown;
  response?: unknown;
};

export type RunData = {
  status: "running" | "completed" | "error";
  startTime?: string;
  endTime?: string | null;
  steps: RunStep[];
  result?: any;
  params?: any;
};

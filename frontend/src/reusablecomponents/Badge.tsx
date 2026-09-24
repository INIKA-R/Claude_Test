type Tone = "green" | "red" | "amber" | "slate" | "blue";

const TONE_CLASSES: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
};

export function Badge({ tone, children }: { tone: Tone; children: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export function fulfilmentStatusTone(status: string): Tone {
  if (status === "Released") return "green";
  if (status === "Blocked") return "red";
  if (status === "PartiallyReleased") return "amber";
  return "slate";
}

export function eligibilityStatusTone(status: string): Tone {
  if (status === "Eligible") return "green";
  if (status === "CreditHold") return "red";
  return "amber";
}

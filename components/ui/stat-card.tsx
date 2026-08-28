import type { ReactNode } from "react";
import { Card } from "./card";

const TONE: Record<"neutral" | "warning" | "error", string> = {
  neutral: "text-neutral-900",
  warning: "text-warning-600",
  error: "text-error-600",
};

export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "neutral" | "warning" | "error";
}) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className={`text-2xl font-bold ${TONE[tone]}`}>{value}</p>
      {sub && <p className="text-xs text-neutral-500">{sub}</p>}
    </Card>
  );
}

import type { ReactNode } from "react";

type Variant = "success" | "warning" | "error" | "info" | "neutral";

const VARIANT: Record<Variant, string> = {
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
  error: "bg-error-100 text-error-700",
  info: "bg-info-100 text-info-700",
  neutral: "bg-neutral-200 text-neutral-700",
};

export function Badge({ variant = "neutral", children }: { variant?: Variant; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${VARIANT[variant]}`}
    >
      {children}
    </span>
  );
}

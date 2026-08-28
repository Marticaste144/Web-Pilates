import type { ComponentType, ReactNode, SVGProps } from "react";
import { Card } from "@/components/ui/card";

const TONE: Record<"neutral" | "warning" | "error", string> = {
  neutral: "text-neutral-900",
  warning: "text-warning-600",
  error: "text-error-600",
};

// A diferencia de StatCard (ui/stat-card.tsx, sin ícono, usado por Inicio
// del alumno) y del StatCard del profesor (ícono grande, protagonista):
// acá el ícono es chico y sutil a propósito -- son 6 cards en una sola fila
// y no deben competir en peso visual con el número.
export function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "neutral",
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "neutral" | "warning" | "error";
}) {
  return (
    <Card className="flex flex-col gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-50 text-secondary-600">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm text-neutral-500">{label}</p>
        <p className={`text-2xl font-bold ${TONE[tone]}`}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-neutral-500">{sub}</p>}
      </div>
    </Card>
  );
}

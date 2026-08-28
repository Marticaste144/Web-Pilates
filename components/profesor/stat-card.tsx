import type { ComponentType, SVGProps } from "react";
import { Card } from "@/components/ui/card";

export function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-center gap-3 !p-3 sm:!p-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-50 text-secondary-600">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-neutral-500">{label}</p>
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
      </div>
    </Card>
  );
}

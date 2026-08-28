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
    <Card className="flex items-center gap-4">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary-50 text-secondary-600">
        <Icon className="h-7 w-7" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-neutral-500">{label}</p>
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
      </div>
    </Card>
  );
}

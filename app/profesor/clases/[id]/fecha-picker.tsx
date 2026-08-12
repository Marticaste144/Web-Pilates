"use client";

import { useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/field";

export function FechaPicker({ fecha }: { fecha: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
      Fecha de la clase
      <Input
        type="date"
        defaultValue={fecha}
        onChange={(e) => router.push(`${pathname}?fecha=${e.target.value}`)}
        className="w-auto"
      />
    </label>
  );
}

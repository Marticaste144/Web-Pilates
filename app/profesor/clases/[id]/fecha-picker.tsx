"use client";

import { useRouter, usePathname } from "next/navigation";

export function FechaPicker({ fecha }: { fecha: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      Fecha de la clase
      <input
        type="date"
        defaultValue={fecha}
        onChange={(e) => router.push(`${pathname}?fecha=${e.target.value}`)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-[#2f7cd6] focus:outline-none"
      />
    </label>
  );
}

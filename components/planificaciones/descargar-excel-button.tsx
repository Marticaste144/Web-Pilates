"use client";

import { useState, useTransition } from "react";
import { obtenerUrlDescargaExcel } from "@/lib/planificaciones-excel-actions";
import { Button } from "@/components/ui/button";

// El link de descarga es una signed URL temporal (60s, generada recién al
// hacer click -- ver generarUrlDescargaPlanificacion) -- nunca una URL
// pública fija. Se navega a ella apenas llega, no se guarda en ningún lado.
export function DescargarExcelButton({
  planificacionId,
  variant = "secondary",
  label = "Descargar Excel",
}: {
  planificacionId: string;
  variant?: "primary" | "secondary" | "ghost";
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const descargar = () => {
    setError(null);
    startTransition(async () => {
      const r = await obtenerUrlDescargaExcel(planificacionId);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      window.location.href = r.url;
    });
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" size="sm" variant={variant} loading={pending} onClick={descargar}>
        {label}
      </Button>
      {error && <p className="text-xs text-error-600">{error}</p>}
    </div>
  );
}

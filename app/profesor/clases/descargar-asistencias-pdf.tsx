"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { LinkButton } from "@/components/ui/button";
import { hoyISO } from "@/lib/fecha";

// Cualquier fecha dentro de la semana elegida sirve -- el servidor calcula
// el lunes de esa semana y arma el PDF con la ocurrencia de cada clase ahí
// (ver lib/profesor/asistencias-pdf-data.ts). Es un <a> normal, no un botón
// con JS: el navegador se encarga de la descarga solo.
export function DescargarAsistenciasPdf() {
  const [fecha, setFecha] = useState(hoyISO());

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-medium text-neutral-900">Asistencias de la semana</p>
        <p className="text-sm text-neutral-500">
          PDF con presentes/ausentes de cada clase, para la semana que contenga la fecha elegida.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-auto" />
        <LinkButton href={`/api/profesor/asistencias-pdf?fecha=${fecha}`} className="whitespace-nowrap">
          Descargar PDF
        </LinkButton>
      </div>
    </Card>
  );
}

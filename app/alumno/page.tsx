import Link from "next/link";
import { obtenerMetricasAlumno } from "@/lib/alumno/dashboard-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { CalendarIcon, ListIcon, WalletIcon, ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const SECCIONES = [
  { href: "/alumno/clases", titulo: "Clases", desc: "Ver clases disponibles y anotarte.", icon: CalendarIcon },
  { href: "/alumno/inscripciones", titulo: "Mis clases", desc: "Tus clases y listas de espera.", icon: ListIcon },
  { href: "/alumno/cuota", titulo: "Mi cuota", desc: "Estado de pago por sede.", icon: WalletIcon },
];

const CUOTA_VARIANT: Record<string, { texto: string; variant: "success" | "warning" | "error" | "neutral" }> = {
  al_dia: { texto: "Al día", variant: "success" },
  por_vencer: { texto: "Por vencer", variant: "warning" },
  vencida: { texto: "Vencida", variant: "error" },
  sin_pagos: { texto: "Sin pagos", variant: "neutral" },
};

function diaLabel(dia: number): string {
  return DIAS_SEMANA.find((d) => d.value === dia)?.label ?? String(dia);
}

export default async function AlumnoHomePage() {
  const m = await obtenerMetricasAlumno();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Hola 👋"
        subtitle="Te avisamos por email cuando haya novedades de tu sede, tu cuota esté por vencer, o se libere un lugar en una lista de espera."
      />

      <Card className="flex flex-col gap-1">
        <p className="text-xs font-medium text-neutral-500">Próxima clase</p>
        {m.proximaClase ? (
          <p className="text-xl font-bold text-neutral-900">
            {diaLabel(m.proximaClase.diaSemana)} {m.proximaClase.horaInicio.slice(0, 5)} -{" "}
            {m.proximaClase.horaFin.slice(0, 5)}
            <span className="ml-2 text-base font-medium text-neutral-500">{m.proximaClase.sedeNombre}</span>
          </p>
        ) : (
          <p className="text-sm text-neutral-500">Todavía no estás anotado/a en ninguna clase.</p>
        )}
      </Card>

      {m.cuotas.length > 0 && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-neutral-500">Mi cuota</p>
            <Link href="/alumno/cuota" className="text-xs font-medium text-primary-600 hover:underline">
              Ver detalle
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {m.cuotas.map((c) => {
              const label = CUOTA_VARIANT[c.estado];
              return (
                <div key={c.sedeId} className="flex items-center gap-1.5 text-sm">
                  <span className="text-neutral-600">{c.sedeNombre}</span>
                  <Badge variant={label.variant}>{label.texto}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Clases anotado/a" value={m.clasesActivasTotal} />
        <StatCard label="En lista de espera" value={m.listaEsperaTotal} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {SECCIONES.map((s) => (
          <Link key={s.href} href={s.href} className="group">
            <Card className="flex h-full items-center gap-3 transition-colors group-hover:border-primary-400">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-neutral-900">{s.titulo}</h2>
                <p className="mt-0.5 text-sm text-neutral-500">{s.desc}</p>
              </div>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-neutral-300 group-hover:text-primary-500" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { getCurrentProfile } from "@/lib/auth/session";
import { obtenerMetricasAlumno } from "@/lib/alumno/dashboard-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, WalletIcon, ClockIcon, MapPinIcon, ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

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
  const [profile, m] = await Promise.all([getCurrentProfile(), obtenerMetricasAlumno()]);

  return (
    <div className="flex flex-col gap-3.5 py-3.5 sm:gap-4 sm:py-4">
      <Card padded={false} className="relative overflow-hidden">
        <div className="flex items-stretch justify-between gap-4">
          <div className="min-w-0 flex-1 self-center py-4 pl-4 sm:py-5 sm:pl-5">
            <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">¡Hola, {profile?.nombre ?? ""}! 👋</h1>
            <p className="mt-1 max-w-sm text-sm text-neutral-500">
              Te avisamos por email cuando haya novedades de tu sede, tu cuota esté por vencer, o se libere un lugar
              en una lista de espera.
            </p>
          </div>
          <div className="relative hidden w-32 shrink-0 sm:block sm:w-44 md:w-52 lg:w-60">
            <Image
              src="/img3.png"
              alt=""
              aria-hidden
              fill
              sizes="(min-width: 1024px) 240px, (min-width: 640px) 176px, 0px"
              className="object-cover"
            />
          </div>
        </div>
      </Card>

      <Card padded={false} className="flex flex-col gap-2 p-3.5 sm:p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
          <CalendarIcon className="h-4 w-4" />
          Próxima clase
        </div>
        {m.proximaClase ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-neutral-900">
                {diaLabel(m.proximaClase.diaSemana)} {m.proximaClase.horaInicio.slice(0, 5)} -{" "}
                {m.proximaClase.horaFin.slice(0, 5)}
              </p>
              <p className="text-sm font-semibold text-secondary-600">{m.proximaClase.sedeNombre}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500">Prof. {m.proximaClase.profesorNombre}</span>
              <Badge variant="success">Anotado/a</Badge>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Todavía no estás anotado/a en ninguna clase.</p>
        )}
      </Card>

      {m.cuotas.length > 0 && (
        <Card padded={false} className="flex flex-col gap-2 p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              <WalletIcon className="h-4 w-4" />
              Mi cuota
            </div>
            <Link
              href="/alumno/cuota"
              className="inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:underline"
            >
              Ver detalle
              <ChevronRightIcon className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {m.cuotas.map((c) => {
              const label = CUOTA_VARIANT[c.estado];
              return (
                <div key={c.sedeId} className="flex items-center gap-1.5 text-sm">
                  <span className="font-medium text-neutral-700">{c.sedeNombre}</span>
                  <Badge variant={label.variant}>{label.texto}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card padded={false} className="flex flex-col gap-1.5 p-3.5 sm:p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-50 text-secondary-600">
            <CalendarIcon className="h-4.5 w-4.5" />
          </span>
          <p className="text-sm text-neutral-500">Clases anotado/a</p>
          <p className="-mt-1 text-2xl font-bold text-neutral-900">{m.clasesActivasTotal}</p>
          <Link href="/alumno/inscripciones" className="text-xs font-medium text-primary-600 hover:underline">
            Ver mis clases →
          </Link>
        </Card>

        <Card padded={false} className="flex flex-col gap-1.5 p-3.5 sm:p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-50 text-secondary-600">
            <ClockIcon className="h-4.5 w-4.5" />
          </span>
          <p className="text-sm text-neutral-500">En lista de espera</p>
          <p className="-mt-1 text-2xl font-bold text-neutral-900">{m.listaEsperaTotal}</p>
          <Link href="/alumno/inscripciones" className="text-xs font-medium text-primary-600 hover:underline">
            Ver mis listas →
          </Link>
        </Card>

        <Card padded={false} className="flex flex-col gap-1.5 p-3.5 sm:p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-50 text-secondary-600">
            <MapPinIcon className="h-4.5 w-4.5" />
          </span>
          <p className="text-sm text-neutral-500">Sedes</p>
          <p className="-mt-1 text-2xl font-bold text-neutral-900">{m.sedesTotal}</p>
          <Link href="/alumno/clases" className="text-xs font-medium text-primary-600 hover:underline">
            Ver sedes →
          </Link>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { getCurrentProfile } from "@/lib/auth/session";
import { obtenerMetricasAlumno } from "@/lib/alumno/dashboard-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, ListIcon, WalletIcon, ClockIcon, MapPinIcon, ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const SECCIONES = [
  { href: "/alumno/clases", titulo: "Clases", desc: "Ver horarios y anotarte.", icon: CalendarIcon },
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
  const [profile, m] = await Promise.all([getCurrentProfile(), obtenerMetricasAlumno()]);

  return (
    <div className="flex flex-col gap-6 py-6">
      <Card className="relative overflow-hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">¡Hola, {profile?.nombre ?? ""}! 👋</h1>
            <p className="mt-1 max-w-md text-sm text-neutral-500">
              Te avisamos por email cuando haya novedades de tu sede, tu cuota esté por vencer, o se libere un lugar
              en una lista de espera.
            </p>
          </div>
          <div className="relative hidden h-28 w-28 shrink-0 sm:block lg:h-36 lg:w-36">
            <Image src="/img3.png" alt="" aria-hidden fill sizes="150px" className="object-contain" />
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
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
        <Card className="flex flex-col gap-3">
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex flex-col gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-50 text-secondary-600">
            <CalendarIcon className="h-5 w-5" />
          </span>
          <p className="text-sm text-neutral-500">Clases anotado/a</p>
          <p className="-mt-1 text-2xl font-bold text-neutral-900">{m.clasesActivasTotal}</p>
          <Link href="/alumno/inscripciones" className="text-xs font-medium text-primary-600 hover:underline">
            Ver mis clases →
          </Link>
        </Card>

        <Card className="flex flex-col gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-50 text-secondary-600">
            <ClockIcon className="h-5 w-5" />
          </span>
          <p className="text-sm text-neutral-500">En lista de espera</p>
          <p className="-mt-1 text-2xl font-bold text-neutral-900">{m.listaEsperaTotal}</p>
          <Link href="/alumno/inscripciones" className="text-xs font-medium text-primary-600 hover:underline">
            Ver mis listas →
          </Link>
        </Card>

        <Card className="flex flex-col gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-50 text-secondary-600">
            <MapPinIcon className="h-5 w-5" />
          </span>
          <p className="text-sm text-neutral-500">Sedes</p>
          <p className="-mt-1 text-2xl font-bold text-neutral-900">{m.sedesTotal}</p>
          <Link href="/alumno/clases" className="text-xs font-medium text-primary-600 hover:underline">
            Ver sedes →
          </Link>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-700">Accesos rápidos</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {SECCIONES.map((s) => (
            <Link key={s.href} href={s.href} className="group">
              <Card className="flex h-full items-center gap-3 transition-colors group-hover:border-primary-400">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-neutral-900">{s.titulo}</h3>
                  <p className="mt-0.5 text-sm text-neutral-500">{s.desc}</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-neutral-300 group-hover:text-primary-500" />
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

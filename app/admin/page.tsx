import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/session";
import { obtenerMetricas } from "@/lib/admin/dashboard-data";
import { hoyISO, formatearFechaLarga } from "@/lib/fecha";
import { Card } from "@/components/ui/card";
import { OccupancyRing } from "@/components/ui/occupancy-ring";
import { MetricCard } from "@/components/admin/metric-card";
import { UsersIcon, CalendarIcon, UserIcon, ClockIcon, WalletIcon, FileIcon } from "@/components/ui/icons";
import { LinkButton } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function formatearMonto(monto: number): string {
  return `$${Math.round(monto).toLocaleString("es-AR")}`;
}

// "Viernes, 28 de agosto" -- mismo dato que formatearFechaLarga (día real
// de hoy), solo con la primera letra en mayúscula y coma para el estilo de
// encabezado (no es un dato distinto, es formato).
function formatearFechaEncabezado(fechaISO: string): string {
  const [dia, ...resto] = formatearFechaLarga(fechaISO).split(" ");
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${resto.join(" ")}`;
}

export default async function AdminHomePage() {
  const [profile, m] = await Promise.all([getCurrentProfile(), obtenerMetricas()]);

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">¡Hola, {profile?.nombre ?? ""}! 👋</h1>
        <p className="mt-1 text-sm text-neutral-500">{formatearFechaEncabezado(hoyISO())}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-sm text-neutral-500">Alumnos activos</p>
            <p className="text-3xl font-bold text-neutral-900">{m.alumnosActivosTotal}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
              {m.alumnosActivosPorSede.map((s, i) => (
                <span key={s.sedeId} className="flex items-center gap-3">
                  {i > 0 && <span className="text-neutral-300">|</span>}
                  <span>
                    {s.sedeNombre}: <span className="font-medium text-neutral-700">{s.cantidad}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary-50 text-secondary-600 sm:flex">
            <UsersIcon className="h-7 w-7" />
          </span>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-neutral-500">Facturación de este mes</p>
            <LinkButton
              href="/api/admin/exportar/pagos"
              variant="secondary"
              size="sm"
              className="shrink-0 whitespace-nowrap"
            >
              Exportar pagos (Excel)
            </LinkButton>
          </div>
          <p className="text-3xl font-bold text-neutral-900">{formatearMonto(m.facturacionMes.total)}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
            <span>
              Mercado Pago:{" "}
              <span className="font-medium text-neutral-700">{formatearMonto(m.facturacionMes.mercadopago)}</span>
            </span>
            <span>
              Transferencia:{" "}
              <span className="font-medium text-neutral-700">{formatearMonto(m.facturacionMes.transferencia)}</span>
            </span>
            <span>
              Efectivo: <span className="font-medium text-neutral-700">{formatearMonto(m.facturacionMes.efectivo)}</span>
            </span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="flex flex-col items-center gap-2 text-center">
          <p className="self-start text-sm text-neutral-500">Ocupación promedio</p>
          <OccupancyRing value={m.ocupacionPromedio} max={100} size={72} centerValue={`${m.ocupacionPromedio}%`} centerLabel="" />
          <p className="text-xs text-neutral-500">de las clases activas</p>
        </Card>

        <MetricCard icon={CalendarIcon} label="Clases activas" value={m.clasesActivasTotal} sub="este mes" />
        <MetricCard icon={UserIcon} label="Profesores activos" value={m.profesoresActivosTotal} sub="en total" />
        <MetricCard icon={ClockIcon} label="En lista de espera" value={m.listaEsperaTotal} sub="todo el día" />
        <MetricCard
          icon={WalletIcon}
          label="Cuotas vencidas"
          value={m.cuotasVencidas}
          tone={m.cuotasVencidas > 0 ? "error" : "neutral"}
          sub={m.cuotasVencidas > 0 ? "conviene revisar" : "todo al día"}
        />

        <Link href="/admin/comprobantes">
          <MetricCard
            icon={FileIcon}
            label="Comprobantes pendientes"
            value={m.comprobantesPendientes}
            tone={m.comprobantesPendientes > 0 ? "warning" : "neutral"}
            sub={m.comprobantesPendientes > 0 ? "para revisar" : "todo revisado"}
          />
        </Link>
      </div>
    </div>
  );
}

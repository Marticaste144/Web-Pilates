import Link from "next/link";
import { obtenerMetricas } from "@/lib/admin/dashboard-data";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { UserIcon, UsersIcon, CalendarIcon, TagIcon, MegaphoneIcon, ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const SECCIONES = [
  { href: "/admin/profesores", titulo: "Profesores", desc: "Invitar, editar y activar/desactivar.", icon: UsersIcon },
  { href: "/admin/alumnos", titulo: "Alumnos", desc: "Listado, datos de contacto y estado de cuota.", icon: UserIcon },
  { href: "/admin/clases", titulo: "Clases", desc: "Asignar día, horario, sede y profesor/a.", icon: CalendarIcon },
  { href: "/admin/aranceles", titulo: "Aranceles", desc: "Editar el valor de la cuota por sede.", icon: TagIcon },
  { href: "/admin/avisos", titulo: "Avisos", desc: "Publicar avisos y notificar por email a la sede.", icon: MegaphoneIcon },
];

function formatearMonto(monto: number): string {
  return `$${Math.round(monto).toLocaleString("es-AR")}`;
}

export default async function AdminHomePage() {
  const m = await obtenerMetricas();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Hola 👋" subtitle="Panorama rápido del centro -- ingresos, ocupación y alumnado." />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <p className="text-xs font-medium text-neutral-500">Alumnos activos</p>
          <p className="text-2xl font-bold text-neutral-900">{m.alumnosActivosTotal}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
            {m.alumnosActivosPorSede.map((s) => (
              <span key={s.sedeId}>
                {s.sedeNombre}: <span className="font-medium text-neutral-700">{s.cantidad}</span>
              </span>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <p className="text-xs font-medium text-neutral-500">Facturación de este mes</p>
          <p className="text-2xl font-bold text-neutral-900">{formatearMonto(m.facturacionMes.total)}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
            <span>
              Mercado Pago: <span className="font-medium text-neutral-700">{formatearMonto(m.facturacionMes.mercadopago)}</span>
            </span>
            <span>
              Efectivo: <span className="font-medium text-neutral-700">{formatearMonto(m.facturacionMes.efectivo)}</span>
            </span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Ocupación promedio" value={`${m.ocupacionPromedio}%`} sub="de las clases activas" />
        <StatCard label="Clases activas" value={m.clasesActivasTotal} />
        <StatCard label="Profesores activos" value={m.profesoresActivosTotal} />
        <StatCard label="En lista de espera" value={m.listaEsperaTotal} />
        <StatCard
          label="Cuotas vencidas"
          value={m.cuotasVencidas}
          tone={m.cuotasVencidas > 0 ? "error" : "neutral"}
          sub={m.cuotasVencidas > 0 ? "conviene revisar" : "todo al día"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { UsersIcon, CalendarIcon, TagIcon, MegaphoneIcon, ChevronRightIcon } from "@/components/ui/icons";

const SECCIONES = [
  { href: "/admin/profesores", titulo: "Profesores", desc: "Invitar, editar y activar/desactivar.", icon: UsersIcon },
  { href: "/admin/clases", titulo: "Clases", desc: "Asignar día, horario, sede y profesor/a.", icon: CalendarIcon },
  { href: "/admin/aranceles", titulo: "Aranceles", desc: "Editar el valor de la cuota por sede.", icon: TagIcon },
  { href: "/admin/avisos", titulo: "Avisos", desc: "Publicar avisos y notificar por email a la sede.", icon: MegaphoneIcon },
];

export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Hola 👋"
        subtitle="Dashboard con métricas (ingresos, ocupación) y gestión de alumnos/pagos llegan en próximas etapas."
      />
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

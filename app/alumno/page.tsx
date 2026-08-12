import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { CalendarIcon, ListIcon, WalletIcon, ChevronRightIcon } from "@/components/ui/icons";

const SECCIONES = [
  { href: "/alumno/clases", titulo: "Clases", desc: "Ver clases disponibles y anotarte.", icon: CalendarIcon },
  { href: "/alumno/inscripciones", titulo: "Mis clases", desc: "Tus clases y listas de espera.", icon: ListIcon },
  { href: "/alumno/cuota", titulo: "Mi cuota", desc: "Estado de pago por sede.", icon: WalletIcon },
];

export const dynamic = "force-dynamic";

export default function AlumnoHomePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Hola 👋"
        subtitle="Te avisamos por email cuando haya novedades de tu sede, tu cuota esté por vencer, o se libere un lugar en una lista de espera."
      />
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

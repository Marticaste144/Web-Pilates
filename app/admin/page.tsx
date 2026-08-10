import Link from "next/link";

const SECCIONES = [
  { href: "/admin/profesores", titulo: "Profesores", desc: "Invitar, editar y activar/desactivar." },
  { href: "/admin/clases", titulo: "Clases", desc: "Asignar día, horario, sede y profesor/a." },
  { href: "/admin/aranceles", titulo: "Aranceles", desc: "Editar el valor de la cuota por sede." },
];

export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-slate-500">
        Dashboard con métricas (ingresos, ocupación) y gestión de alumnos/pagos/avisos llegan en
        próximas etapas.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {SECCIONES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-slate-200 p-4 hover:border-[#2f7cd6]"
          >
            <h2 className="font-semibold text-slate-900">{s.titulo}</h2>
            <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

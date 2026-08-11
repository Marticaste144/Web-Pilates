import Link from "next/link";

const SECCIONES = [
  { href: "/alumno/clases", titulo: "Clases", desc: "Ver clases disponibles y anotarte." },
  { href: "/alumno/inscripciones", titulo: "Mis inscripciones", desc: "Tus clases y listas de espera." },
  { href: "/alumno/cuota", titulo: "Mi cuota", desc: "Estado de pago por sede." },
];

export const dynamic = "force-dynamic";

export default function AlumnoHomePage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-slate-500">Los avisos de la sede llegan en una próxima etapa.</p>
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

import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ProfesorHomePage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-slate-500">
        Un alumno inscripto recién aparece acá cuando tiene su primera cuota aprobada en esa sede
        -- hasta entonces cuenta para el cupo pero no ves sus datos.
      </p>
      <Link
        href="/profesor/clases"
        className="w-fit rounded-xl border border-slate-200 p-4 hover:border-[#2f7cd6]"
      >
        <h2 className="font-semibold text-slate-900">Mis clases</h2>
        <p className="mt-1 text-sm text-slate-500">Ver alumnos y tomar asistencia.</p>
      </Link>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenerClaseDetalle } from "@/lib/profesor/clases-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { FechaPicker } from "./fecha-picker";
import { AlumnoRow } from "./alumno-row";

export const dynamic = "force-dynamic";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function ClaseDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { id } = await params;
  const { fecha: fechaParam } = await searchParams;
  const fecha = fechaParam || hoyISO();

  const clase = await obtenerClaseDetalle(id, fecha);
  if (!clase) {
    notFound();
  }

  const diaLabel = DIAS_SEMANA.find((d) => d.value === clase.diaSemana)?.label ?? clase.diaSemana;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/profesor/clases" className="text-sm text-[#2f7cd6] hover:underline">
          ← Volver
        </Link>
        <h1 className="mt-2 text-xl font-bold text-slate-900">{clase.sedeNombre}</h1>
        <p className="text-slate-500">
          {diaLabel} {clase.horaInicio.slice(0, 5)} - {clase.horaFin.slice(0, 5)} -- {clase.totalInscriptos}/
          {clase.cupo} lugares
        </p>
      </div>

      <FechaPicker fecha={fecha} />

      {clase.alumnosNoVisibles > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Hay {clase.alumnosNoVisibles} alumno(s) más anotado(s) en esta clase, pero todavía no
          aparecen acá porque no tienen ninguna cuota aprobada.
        </p>
      )}

      {clase.alumnosVisibles.length === 0 && clase.alumnosNoVisibles === 0 && (
        <p className="text-sm text-slate-400">Todavía no hay alumnos anotados en esta clase.</p>
      )}

      <div className="flex flex-col gap-3">
        {clase.alumnosVisibles.map((a) => (
          <AlumnoRow key={a.alumnoId} alumno={a} claseId={clase.id} fecha={fecha} />
        ))}
      </div>
    </div>
  );
}

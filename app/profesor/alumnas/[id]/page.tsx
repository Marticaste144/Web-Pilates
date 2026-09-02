import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  obtenerFicha,
  obtenerPruebasFuncionalesIniciales,
  listarSedesParaFicha,
  listarNotasEvolucion,
  listarClasesDelAlumnoParaEvolucion,
} from "@/lib/fichas-evaluacion-data";
import { obtenerLineaDeTiempo } from "@/lib/seguimiento-data";
import { alumnoUsaPlanificacion } from "@/lib/planificaciones-data";
import { obtenerClasesDeAlumnaParaResumen } from "@/lib/profesor/alumnas-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { FichaForm } from "@/components/fichas-evaluacion/ficha-form";
import { NotasEvolucion } from "@/components/fichas-evaluacion/notas-evolucion";
import { LineaDeTiempo } from "@/components/fichas-evaluacion/linea-de-tiempo";
import { IndividualPlanificacionPage } from "@/components/planificaciones/individual-planificacion-page";
import { PerfilAlumnoTabs } from "@/components/profesor/perfil-alumno-tabs";
import { Card } from "@/components/ui/card";
import { ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

function diaLabel(dia: number): string {
  return DIAS_SEMANA.find((d) => d.value === dia)?.label ?? String(dia);
}

// Los datos personales (nombre/email/teléfono) se leen de profiles -- la
// misma RLS que ya protege el roster ("profesor ve perfiles de sus alumnos
// visibles") decide si esta alumna es visible para quien mira la página; si
// no lo es, perfil viene null y se muestra 404 en vez de una ficha vacía
// engañosa.
export default async function FichaAlumnaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: perfil },
    ficha,
    pruebas,
    sedes,
    notas,
    clasesParaEvolucion,
    lineaDeTiempo,
    clasesResumen,
    mostrarPlanificacion,
  ] = await Promise.all([
    supabase.from("profiles").select("nombre, apellido, email, telefono").eq("id", id).eq("role", "alumno").single(),
    obtenerFicha(id),
    obtenerPruebasFuncionalesIniciales(id),
    listarSedesParaFicha(),
    listarNotasEvolucion(id),
    listarClasesDelAlumnoParaEvolucion(id),
    obtenerLineaDeTiempo(id),
    obtenerClasesDeAlumnaParaResumen(id),
    alumnoUsaPlanificacion(id),
  ]);

  if (!perfil) {
    notFound();
  }

  const ultimaEvolucion = notas[0] ?? null;

  const resumenContent = (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Datos de contacto</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-neutral-500">Nombre</dt>
            <dd className="text-neutral-800">
              {perfil.nombre} {perfil.apellido}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Email</dt>
            <dd className="text-neutral-800">{perfil.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Teléfono</dt>
            <dd className="text-neutral-800">{perfil.telefono ?? "Sin registrar"}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Sede / actividad / clases</h2>
        {clasesResumen.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin clases activas contigo.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {clasesResumen.map((c) => (
              <div
                key={c.claseId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3.5 py-2.5 text-sm"
              >
                <span className="font-medium text-neutral-900">
                  {c.sedeNombre}
                  {c.actividadNombre ? ` -- ${c.actividadNombre}` : ""}
                </span>
                <span className="text-neutral-500">
                  {diaLabel(c.diaSemana)} {c.horaInicio.slice(0, 5)} - {c.horaFin.slice(0, 5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Última actividad registrada</h2>
        <div className="flex flex-col gap-2 text-sm text-neutral-700">
          <p>
            <span className="font-medium text-neutral-900">Última evaluación: </span>
            {ficha.existe && ficha.fechaEvaluacion ? formatearFecha(ficha.fechaEvaluacion) : "Sin evaluación cargada"}
          </p>
          <p>
            <span className="font-medium text-neutral-900">Última evolución: </span>
            {ultimaEvolucion ? `${formatearFecha(ultimaEvolucion.fecha)} -- ${ultimaEvolucion.contenido}` : "Sin evolución cargada"}
          </p>
        </div>
      </Card>
    </div>
  );

  const evaluacionContent = (
    <Card>
      <FichaForm ficha={ficha} pruebas={pruebas} sedes={sedes} />
    </Card>
  );

  const planificacionContent = (
    <IndividualPlanificacionPage
      alumnoId={id}
      volverHref={`/profesor/alumnas/${id}`}
      historialHref={`/profesor/alumnas/${id}/planificacion/historial`}
      embedded
    />
  );

  const evolucionContent = (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Agregar evolución</h2>
        <NotasEvolucion alumnoId={id} notas={notas} clases={clasesParaEvolucion} />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Línea de tiempo</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Evaluación inicial, evoluciones y feedback de la alumna, más reciente primero.
        </p>
        <LineaDeTiempo items={lineaDeTiempo} />
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <div>
        <Link
          href="/profesor/alumnas"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">
          {perfil.nombre} {perfil.apellido}
        </h1>
        <p className="text-sm text-neutral-500">
          {perfil.email}
          {perfil.telefono ? ` · ${perfil.telefono}` : ""}
        </p>
      </div>

      <PerfilAlumnoTabs
        mostrarPlanificacion={mostrarPlanificacion}
        resumen={resumenContent}
        evaluacion={evaluacionContent}
        planificacion={planificacionContent}
        evolucion={evolucionContent}
      />
    </div>
  );
}

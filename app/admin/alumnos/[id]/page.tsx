import { notFound } from "next/navigation";
import {
  obtenerAlumno,
  listarClasesAnterioresAlumno,
  listarAsistenciasDelMesAlumno,
} from "@/lib/admin/alumnos-data";
import { listarClasesParaAsignar } from "@/lib/admin/clases-data";
import {
  obtenerFicha,
  obtenerPruebasFuncionalesIniciales,
  listarSedesParaFicha,
  listarNotasEvolucion,
  listarClasesDelAlumnoParaEvolucion,
} from "@/lib/fichas-evaluacion-data";
import { obtenerLineaDeTiempo } from "@/lib/seguimiento-data";
import { alumnoUsaPlanificacion } from "@/lib/planificaciones-data";
import { IndividualPlanificacionPage } from "@/components/planificaciones/individual-planificacion-page";
import { AlumnoHeader } from "./alumno-header";
import { AccesoCard } from "./acceso-card";
import { AlumnoTabs } from "./alumno-tabs";
import { ResumenTab } from "./resumen-tab";
import { ClasesTab } from "./clases-tab";
import { CuotaPagosTab } from "./cuota-pagos-tab";
import { FichaTab } from "./ficha-tab";
import { EvolucionTab } from "./evolucion-tab";

export const dynamic = "force-dynamic";

export default async function AlumnoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

  const [
    alumno,
    ficha,
    pruebas,
    sedes,
    notas,
    clasesParaEvolucion,
    lineaDeTiempo,
    clasesAnteriores,
    asistenciasDelMes,
    mostrarPlanificacion,
    clasesDisponibles,
  ] = await Promise.all([
    obtenerAlumno(id),
    obtenerFicha(id),
    obtenerPruebasFuncionalesIniciales(id),
    listarSedesParaFicha(),
    listarNotasEvolucion(id),
    listarClasesDelAlumnoParaEvolucion(id),
    obtenerLineaDeTiempo(id),
    listarClasesAnterioresAlumno(id),
    listarAsistenciasDelMesAlumno(id),
    alumnoUsaPlanificacion(id),
    listarClasesParaAsignar(),
  ]);

  if (!alumno) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <AlumnoHeader
        alumnoId={alumno.alumnoId}
        nombre={alumno.nombre}
        apellido={alumno.apellido}
        email={alumno.email}
        telefono={alumno.telefono}
        activo={alumno.activo}
        alumnoDesde={alumno.alumnoDesde}
        inscripciones={alumno.inscripciones}
      />

      <AccesoCard alumnoId={alumno.alumnoId} email={alumno.email} estadoAcceso={alumno.estadoAcceso} />

      <AlumnoTabs
        mostrarPlanificacion={mostrarPlanificacion}
        tabInicial={tab}
        resumen={
          <ResumenTab
            telefono={alumno.telefono}
            email={alumno.email}
            inscripciones={alumno.inscripciones}
            cuotas={alumno.cuotas}
            ficha={ficha}
            ultimaEvolucion={notas[0] ?? null}
            alumnoId={alumno.alumnoId}
          />
        }
        clases={
          <ClasesTab
            alumnoId={alumno.alumnoId}
            inscripciones={alumno.inscripciones}
            asistenciasDelMes={asistenciasDelMes}
            clasesAnteriores={clasesAnteriores}
            clasesDisponibles={clasesDisponibles}
          />
        }
        cuota={<CuotaPagosTab alumnoId={alumno.alumnoId} cuotas={alumno.cuotas} pagos={alumno.pagos} />}
        ficha={<FichaTab ficha={ficha} pruebas={pruebas} sedes={sedes} />}
        evolucion={
          <EvolucionTab alumnoId={alumno.alumnoId} notas={notas} clases={clasesParaEvolucion} lineaDeTiempo={lineaDeTiempo} />
        }
        planificacion={
          mostrarPlanificacion ? (
            <IndividualPlanificacionPage
              alumnoId={alumno.alumnoId}
              volverHref={`/admin/alumnos/${alumno.alumnoId}`}
              historialHref={`/admin/alumnos/${alumno.alumnoId}/planificacion/historial`}
              embedded
            />
          ) : null
        }
      />
    </div>
  );
}

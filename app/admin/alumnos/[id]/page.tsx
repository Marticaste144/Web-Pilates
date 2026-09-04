import { notFound } from "next/navigation";
import {
  obtenerAlumno,
  listarClasesAnterioresAlumno,
  listarAsistenciasDelMesAlumno,
} from "@/lib/admin/alumnos-data";
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
  ]);

  if (!alumno) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <AlumnoHeader
        nombre={alumno.nombre}
        apellido={alumno.apellido}
        email={alumno.email}
        telefono={alumno.telefono}
        alumnoDesde={alumno.alumnoDesde}
        inscripciones={alumno.inscripciones}
      />

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
            alumnoId={alumno.profileId}
          />
        }
        clases={
          <ClasesTab
            inscripciones={alumno.inscripciones}
            asistenciasDelMes={asistenciasDelMes}
            clasesAnteriores={clasesAnteriores}
          />
        }
        cuota={<CuotaPagosTab alumnoId={alumno.profileId} cuotas={alumno.cuotas} pagos={alumno.pagos} />}
        ficha={<FichaTab ficha={ficha} pruebas={pruebas} sedes={sedes} />}
        evolucion={
          <EvolucionTab alumnoId={alumno.profileId} notas={notas} clases={clasesParaEvolucion} lineaDeTiempo={lineaDeTiempo} />
        }
        planificacion={
          mostrarPlanificacion ? (
            <IndividualPlanificacionPage
              alumnoId={alumno.profileId}
              volverHref={`/admin/alumnos/${alumno.profileId}`}
              historialHref={`/admin/alumnos/${alumno.profileId}/planificacion/historial`}
              embedded
            />
          ) : null
        }
      />
    </div>
  );
}

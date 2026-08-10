import { listarMisInscripciones } from "@/lib/alumno/inscripciones-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { BajaButton } from "./baja-button";

export const dynamic = "force-dynamic";

export default async function MisInscripcionesPage() {
  const inscripciones = await listarMisInscripciones();
  const diaLabel = (dia: number) => DIAS_SEMANA.find((d) => d.value === dia)?.label ?? dia;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Mis inscripciones</h1>
        <p className="text-slate-500">Tus clases activas y las que estás esperando un lugar.</p>
      </div>

      {inscripciones.length === 0 && (
        <p className="text-sm text-slate-400">Todavía no te anotaste a ninguna clase.</p>
      )}

      <div className="flex flex-col gap-2">
        {inscripciones.map((i) => (
          <div
            key={i.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
          >
            <div>
              <p className="font-medium text-slate-900">
                {i.sedeNombre} -- {diaLabel(i.diaSemana)} {i.horaInicio.slice(0, 5)} -{" "}
                {i.horaFin.slice(0, 5)}
              </p>
              <p className="text-sm text-slate-500">
                Prof. {i.profesorNombre}
                {i.estado === "lista_espera" && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Lista de espera -- lugar #{i.posicionEspera}
                  </span>
                )}
                {i.estado === "activa" && (
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Anotado/a
                  </span>
                )}
              </p>
            </div>
            <BajaButton inscripcionId={i.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

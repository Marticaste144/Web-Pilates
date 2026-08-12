import { listarAvisos } from "@/lib/admin/avisos-data";
import { listarSedes } from "@/lib/admin/clases-data";
import { AvisoForm } from "./aviso-form";

export const dynamic = "force-dynamic";

function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR");
}

export default async function AvisosPage() {
  const [avisos, sedes] = await Promise.all([listarAvisos(), listarSedes()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Avisos</h1>
        <p className="text-slate-500">
          Un aviso bloquea toda actividad (inscripción, baja, asistencia) de la sede en su rango de
          fechas, y manda un email a los alumnos y profesores/as afectados.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <h2 className="mb-3 font-semibold text-slate-900">Nuevo aviso</h2>
        <AvisoForm sedes={sedes} />
      </div>

      <div className="flex flex-col gap-3">
        {avisos.length === 0 && (
          <p className="text-sm text-slate-400">Todavía no hay avisos publicados.</p>
        )}
        {avisos.map((a) => (
          <div key={a.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="font-medium text-slate-900">{a.titulo}</p>
              <span className="text-xs text-slate-500">
                {formatearFecha(a.fechaInicio)} – {formatearFecha(a.fechaFin)}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 whitespace-pre-line">{a.mensaje}</p>
            <p className="mt-2 text-xs text-slate-400">
              {a.todasLasSedes ? "Todas las sedes" : a.sedesNombres.join(", ") || "Sin sede asignada"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

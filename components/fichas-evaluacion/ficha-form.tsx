import type { FichaEvaluacion, PruebasFuncionales, SedeOption } from "@/lib/fichas-evaluacion-data";
import { FichaDatosForm } from "./ficha-datos-form";
import { PruebasFuncionalesForm } from "./pruebas-funcionales-form";
import { ObjetivosContactoForm } from "./objetivos-contacto-form";

function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

// Panel completo de la ficha de admisión real (3 páginas del PDF, ver
// Ficha_de_admision_gimnasio_rellenable.pdf) -- una sola ficha por alumno,
// organizada en secciones/tarjetas en vez de una grilla tipo Excel. Nombre,
// apellido, teléfono y email NO se repiten acá: se muestran arriba de la
// página, leídos de profiles.
export function FichaForm({
  ficha,
  pruebas,
  sedes,
  readOnly = false,
}: {
  ficha: FichaEvaluacion;
  pruebas: PruebasFuncionales | null;
  sedes: SedeOption[];
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {ficha.existe ? (
        <p className="text-xs text-neutral-500">
          Ficha N.º {ficha.numero} · Evaluación del {formatearFecha(ficha.fechaEvaluacion!)}
          {ficha.profesionalEvaluadorNombre && ` · Evaluó: ${ficha.profesionalEvaluadorNombre}`}
          {ficha.actualizadoPorNombre && ` · Última actualización: ${ficha.actualizadoPorNombre}`}
        </p>
      ) : (
        <p className="text-xs text-neutral-400">Todavía no hay ficha de admisión cargada para este alumno.</p>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-neutral-900">Datos personales y antecedentes</h3>
        <FichaDatosForm ficha={ficha} sedes={sedes} readOnly={readOnly} />
      </section>

      <section className="flex flex-col gap-2 border-t border-neutral-100 pt-4">
        <h3 className="text-sm font-semibold text-neutral-900">Pruebas funcionales</h3>
        <PruebasFuncionalesForm alumnoId={ficha.alumnoId} pruebas={pruebas} readOnly={readOnly} />
      </section>

      <section className="flex flex-col gap-2 border-t border-neutral-100 pt-4">
        <h3 className="text-sm font-semibold text-neutral-900">Objetivos, contacto y días posibles</h3>
        <ObjetivosContactoForm ficha={ficha} readOnly={readOnly} />
      </section>
    </div>
  );
}

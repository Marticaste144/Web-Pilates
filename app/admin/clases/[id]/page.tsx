import { notFound } from "next/navigation";
import Link from "next/link";
import {
  obtenerClase,
  listarSedes,
  listarProfesoresParaSelect,
  listarActividadesPorSede,
  listarInscriptosDeClase,
} from "@/lib/admin/clases-data";
import { actualizarClase } from "@/lib/admin/clases-actions";
import { ClaseForm } from "../clase-form";
import { ToggleActivaButton } from "../toggle-activa-button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const CUOTA_VARIANT: Record<string, { texto: string; variant: "success" | "warning" | "error" | "neutral" }> = {
  al_dia: { texto: "Al día", variant: "success" },
  por_vencer: { texto: "Por vencer", variant: "warning" },
  vencida: { texto: "Vencida", variant: "error" },
  sin_pagos: { texto: "Sin pagos", variant: "neutral" },
};

export default async function EditarClasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [clase, sedes, profesores, actividadesPorSede] = await Promise.all([
    obtenerClase(id),
    listarSedes(),
    listarProfesoresParaSelect(),
    listarActividadesPorSede(),
  ]);

  if (!clase) {
    notFound();
  }

  const inscriptos = await listarInscriptosDeClase(clase.id, clase.sedeId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/clases"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">
            {clase.sedeNombre}
            {clase.actividadNombre ? ` -- ${clase.actividadNombre}` : ""} -- {clase.profesorNombre}
          </h1>
          <ToggleActivaButton id={clase.id} activa={clase.activa} />
        </div>
      </div>

      {clase.modalidad === "grupal" && (
        <LinkButton href={`/admin/clases/${clase.id}/planificacion`} variant="secondary" className="self-start">
          Ver planificación grupal
        </LinkButton>
      )}

      <Card>
        <ClaseForm
          action={actualizarClase}
          sedes={sedes}
          profesores={profesores}
          actividadesPorSede={actividadesPorSede}
          clase={clase}
          submitLabel="Guardar cambios"
        />
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold text-neutral-900">
          Alumnos anotados ({inscriptos.filter((i) => i.estado === "activa").length}/{clase.cupo})
        </h2>
        {inscriptos.length === 0 ? (
          <EmptyState title="Todavía no hay nadie anotado en esta clase" />
        ) : (
          <Card padded={false} className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Cuota</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {inscriptos.map((a) => {
                  const cuota = CUOTA_VARIANT[a.cuotaEstado];
                  return (
                    <tr key={a.alumnoId} className="border-t border-neutral-100">
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {a.nombre} {a.apellido}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {a.email}
                        {a.telefono ? ` · ${a.telefono}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        {a.estado === "activa" ? (
                          <Badge variant="success">Anotado/a</Badge>
                        ) : (
                          <Badge variant="warning">Lista de espera -- #{a.posicionEspera}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={cuota.variant}>{cuota.texto}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/alumnos/${a.alumnoId}`}
                          className="font-medium text-primary-600 hover:underline"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}

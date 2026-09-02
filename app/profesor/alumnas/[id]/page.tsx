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
import { FichaForm } from "@/components/fichas-evaluacion/ficha-form";
import { NotasEvolucion } from "@/components/fichas-evaluacion/notas-evolucion";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

// Los datos personales (nombre/email/teléfono) se leen de profiles -- la
// misma RLS que ya protege el roster ("profesor ve perfiles de sus alumnos
// visibles") decide si esta alumna es visible para quien mira la página; si
// no lo es, perfil viene null y se muestra 404 en vez de una ficha vacía
// engañosa.
export default async function FichaAlumnaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: perfil }, ficha, pruebas, sedes, notas, clasesParaEvolucion] = await Promise.all([
    supabase.from("profiles").select("nombre, apellido, email, telefono").eq("id", id).eq("role", "alumno").single(),
    obtenerFicha(id),
    obtenerPruebasFuncionalesIniciales(id),
    listarSedesParaFicha(),
    listarNotasEvolucion(id),
    listarClasesDelAlumnoParaEvolucion(id),
  ]);

  if (!perfil) {
    notFound();
  }

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

      <LinkButton href={`/profesor/alumnas/${id}/planificacion`} variant="secondary" className="self-start">
        Ver planificación
      </LinkButton>

      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Ficha de admisión</h2>
        <FichaForm ficha={ficha} pruebas={pruebas} sedes={sedes} />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Evolución</h2>
        <NotasEvolucion alumnoId={id} notas={notas} clases={clasesParaEvolucion} />
      </Card>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/session";
import { obtenerRutina } from "@/lib/profesor/rutinas-data";
import { createClient } from "@/lib/supabase/server";
import { RutinaForm } from "./rutina-form";
import { Card } from "@/components/ui/card";
import { ChevronRightIcon, FileIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function RutinaProfesorPage({ params }: { params: Promise<{ profesorId: string }> }) {
  const { profesorId } = await params;

  const supabase = await createClient();
  const [profile, { data: perfilProfesor }, rutina] = await Promise.all([
    getCurrentProfile(),
    supabase.from("profiles").select("nombre, apellido").eq("id", profesorId).single(),
    obtenerRutina(profesorId),
  ]);

  if (!perfilProfesor) {
    notFound();
  }

  const esPropia = profile?.id === profesorId;

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <div>
        <Link
          href="/profesor/equipo"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver a Equipo
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">
          {perfilProfesor.nombre} {perfilProfesor.apellido}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {esPropia ? "Tu rutina -- la pueden ver los demás profesores." : "Rutina que viene dando este profesor."}
        </p>
      </div>

      {esPropia ? (
        <RutinaForm rutina={rutina} />
      ) : (
        <Card className="flex flex-col gap-3">
          {rutina.contenido && <p className="whitespace-pre-wrap text-sm text-neutral-700">{rutina.contenido}</p>}

          {rutina.archivoUrl && (
            <a
              href={`/api/profesor/rutinas/${profesorId}/archivo`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
            >
              <FileIcon className="h-4 w-4" />
              {rutina.archivoNombre ?? "Ver archivo"}
            </a>
          )}

          {!rutina.contenido && !rutina.archivoUrl && (
            <p className="text-sm text-neutral-500">Todavía no cargó ninguna rutina.</p>
          )}
        </Card>
      )}
    </div>
  );
}

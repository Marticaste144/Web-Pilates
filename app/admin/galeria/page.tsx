import { listarGaleriaAdmin } from "@/lib/admin/galeria-data";
import { SubirGaleriaForm } from "./subir-form";
import { TogglePublicadoButton } from "./toggle-publicado-button";
import { EliminarGaleriaButton } from "./eliminar-button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function GaleriaPage() {
  const items = await listarGaleriaAdmin();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Galería"
        subtitle="Fotos y videos de ejemplo de ejercicios para la página de inicio. Solo se ve en la landing lo que esté marcado como Publicado."
      />

      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Agregar contenido</h2>
        <SubirGaleriaForm />
      </Card>

      {items.length === 0 ? (
        <EmptyState
          title="Todavía no hay fotos ni videos cargados"
          description="Mientras esta lista esté vacía, la landing muestra un mensaje de 'Próximamente' en vez de la galería."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} padded={false} className="overflow-hidden">
              <div className="relative flex aspect-video items-center justify-center bg-neutral-100">
                {item.tipo === "foto" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL de Storage externa/dinámica, no un asset local de /public.
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <>
                    <video src={item.url} className="h-full w-full object-cover" muted />
                    <span className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
                      <PlayIcon className="h-5 w-5" />
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-2 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-neutral-900">
                    {item.titulo ?? "Sin título"}
                  </p>
                  <Badge variant="neutral">{item.tipo}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <TogglePublicadoButton id={item.id} publicado={item.publicado} />
                  <EliminarGaleriaButton id={item.id} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

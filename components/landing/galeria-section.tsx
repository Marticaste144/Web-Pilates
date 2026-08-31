import { listarGaleriaPublica } from "@/lib/landing/galeria-data";
import { Reveal } from "@/components/landing/reveal";
import { PlayIcon, ImageIcon } from "@/components/ui/icons";

// Todavía no hay material real cargado -- mientras la galería esté vacía se
// muestra un layout "Próximamente" (no un placeholder genérico repetido
// varias veces, que se vería como contenido real roto). En cuanto la admin
// suba fotos/videos desde /admin/galeria, esta sección los muestra solos.
export async function GaleriaSection() {
  const items = await listarGaleriaPublica();

  return (
    <section id="galeria" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="text-center">
          <h2 className="text-2xl font-extrabold text-neutral-900 sm:text-3xl">
            Así se <span className="text-secondary-500">mueve</span> MUV
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-500 sm:text-base">
            Un adelanto de los ejercicios que vas a encontrar en nuestras clases.
          </p>
        </Reveal>

        {items.length === 0 ? (
          <Reveal className="mt-10">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-500">
                <ImageIcon className="h-6 w-6" />
              </span>
              <p className="font-semibold text-neutral-800">Próximamente</p>
              <p className="max-w-xs text-sm text-neutral-500">
                Estamos preparando fotos y videos de nuestras clases para que veas de primera mano cómo se siente
                moverte con MUV.
              </p>
            </div>
          </Reveal>
        ) : (
          <Reveal className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" stagger={80}>
            {items.map((item) => (
              <div key={item.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-neutral-100">
                {item.tipo === "foto" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL de Storage externa/dinámica, no un asset local de /public.
                  <img
                    src={item.url}
                    alt={item.titulo ?? ""}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <>
                    <video src={item.url} className="h-full w-full object-cover" muted playsInline loop />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white">
                        <PlayIcon className="h-5 w-5" />
                      </span>
                    </span>
                  </>
                )}
                {item.titulo && (
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 text-xs font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    {item.titulo}
                  </span>
                )}
              </div>
            ))}
          </Reveal>
        )}
      </div>
    </section>
  );
}

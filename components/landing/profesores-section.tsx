import { listarProfesoresPublicos } from "@/lib/landing/profesores-data";
import { Reveal } from "@/components/landing/reveal";
import { UserIcon } from "@/components/ui/icons";

// Tarjeta tipo carnet: foto cuadrada + nombre debajo. Todavía no hay fotos
// reales cargadas -- fotoUrl es null hasta que la admin suba una desde
// /admin/profesores/[id] (Tarea 1), así que el placeholder (ícono de
// persona sobre fondo celeste) es el estado normal por ahora, no un error.
export async function ProfesoresSection() {
  const profesores = await listarProfesoresPublicos();

  if (profesores.length === 0) return null;

  return (
    <section id="profesores" className="bg-neutral-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="text-center">
          <h2 className="text-2xl font-extrabold text-neutral-900 sm:text-3xl">
            Conocé a nuestro <span className="text-secondary-500">equipo</span>
          </h2>
        </Reveal>

        <Reveal
          className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
          stagger={70}
        >
          {profesores.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-3 text-center">
              <span className="flex aspect-square w-full max-w-[140px] items-center justify-center overflow-hidden rounded-2xl bg-primary-50 text-primary-300 shadow-sm">
                {p.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL de Storage externa/dinámica, no un asset local de /public.
                  <img src={p.fotoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-12 w-12" />
                )}
              </span>
              <p className="font-semibold text-neutral-900">
                {p.nombre} {p.apellido}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

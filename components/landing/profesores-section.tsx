import { listarProfesoresPublicos } from "@/lib/landing/profesores-data";
import { Reveal } from "@/components/landing/reveal";

// Cards tipo "portrait" (foto protagonista, recorte 3:4) con el nombre
// superpuesto sobre un degradé al pie -- en vez de la foto chica + texto
// aparte de antes. fotoUrl ya viene resuelta con fallback a las fotos reales
// estáticas de /public cuando todavía no se subió nada desde Admin, y
// listarProfesoresPublicos ya filtra afuera a quien no tiene ninguna foto
// resuelta -- acá no hace falta ningún placeholder ni saber cuál es cuál
// (ver lib/landing/profesores-data.ts).
//
// object-[center_85%]: las fotos reales son retrato 9:16 con el nombre de
// la persona impreso arriba (~10-18% de alto) -- en un recorte 3:4 como
// este, centrado (50%) solo tapa la mitad de esa franja. Empujar el punto
// de referencia al 85% recorta ese 20% superior completo (nombre afuera)
// sin llegar a tocar la cara, que en las 11 fotos reales arranca bastante
// más abajo (~25-40%). Mismo criterio aplicado en cualquier otra card de
// foto de profesor -- los avatares chicos (cuadrados, 1:1) ya la tapan solo
// con el centrado por defecto, por cómo cae la aritmética de ese recorte.
export async function ProfesoresSection() {
  const profesores = await listarProfesoresPublicos();

  if (profesores.length === 0) return null;

  return (
    <section id="profesores" className="bg-neutral-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-500">Nuestro equipo</p>
          <h2 className="mt-2 text-2xl font-extrabold text-neutral-900 sm:text-3xl">
            Conocé a quienes te van a <span className="text-primary-600">acompañar</span>
          </h2>
        </Reveal>

        <Reveal
          className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5"
          stagger={70}
        >
          {profesores.map((p) => (
            <div
              key={p.id}
              className="group relative aspect-[3/4] overflow-hidden rounded-3xl bg-gradient-to-br from-primary-100 to-primary-50 shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:ring-primary-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URL de Storage/estática dinámica, no un asset que next/image pueda optimizar en build. */}
              <img
                src={p.fotoUrl}
                alt=""
                className="h-full w-full object-cover object-[center_85%] transition-transform duration-500 ease-out group-hover:scale-110"
              />

              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-4 pb-4 pt-12 sm:pt-14">
                <p className="text-sm font-bold leading-tight text-white sm:text-base">{p.nombre}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

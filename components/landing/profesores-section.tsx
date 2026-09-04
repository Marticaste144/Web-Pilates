import { listarProfesoresPublicos } from "@/lib/landing/profesores-data";
import { Reveal } from "@/components/landing/reveal";
import { ProfesoresCarousel } from "@/components/landing/profesores-carousel";

// Carrusel de tarjetas grandes (foto protagonista, recorte 3:4) -- fondo
// blanco liso, sin blobs/íconos decorativos ni textos flotantes: el
// protagonismo es de las fotos y los profesores, nada más. fotoUrl ya viene
// resuelta con fallback a las fotos reales estáticas de /public cuando
// todavía no se subió nada desde Admin, y listarProfesoresPublicos ya
// filtra afuera a quien no tiene ninguna foto resuelta -- acá no hace falta
// ningún placeholder ni saber cuál es cuál (ver lib/landing/profesores-data.ts).
export async function ProfesoresSection() {
  const profesores = await listarProfesoresPublicos();

  if (profesores.length === 0) return null;

  return (
    <section id="profesores" className="bg-neutral-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-500">Nuestro equipo</p>
          <h2 className="mt-2 text-2xl font-extrabold text-neutral-900 sm:text-3xl">Conocé a nuestro equipo</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            Profesionales que te acompañan en cada etapa, para que te sientas bien, te muevas mejor y disfrutes el
            proceso.
          </p>
        </Reveal>

        <Reveal className="mt-10 sm:mt-12">
          <ProfesoresCarousel profesores={profesores} />
        </Reveal>
      </div>
    </section>
  );
}

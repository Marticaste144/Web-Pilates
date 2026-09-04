import { listarGaleriaPublica } from "@/lib/landing/galeria-data";
import { Reveal } from "@/components/landing/reveal";
import { GaleriaGrid, type GaleriaGridItem } from "@/components/landing/galeria-grid";

// Material fijo de /public (Pilates) -- nombres verificados contra /public
// antes de escribir esto, no adivinados. Se combina con lo que suba la
// administradora desde /admin/galeria (listarGaleriaPublica, sin tocar) --
// ver mezclarFuentes más abajo para CÓMO se combinan (nunca separadas en
// dos bloques, siempre mezcladas foto/video y estático/dinámico). El
// object-position de cada estática se eligió mirando la foto real; como
// ahora la posición de cada una dentro de la grilla de 4 (A/B/C/D, ver
// galeria-grid.tsx) depende del mezclado, no queda garantizado que caiga
// siempre en la celda ideal para ese recorte -- ajuste fino pendiente si
// hiciera falta, fuera del alcance de este cambio (que es solo de orden).
const ESTATICOS: GaleriaGridItem[] = [
  // Grupo 1
  { id: "est-video-1", tipo: "video", url: "/video-pilates.mp4", alt: "Clase de Pilates en MUV.", local: true },
  {
    id: "est-foto-2",
    tipo: "foto",
    url: "/foto2-pilates.webp",
    alt: "Ejercicio de core en el reformer, MUV Pilates.",
    local: true,
    posicion: "70% 40%",
  },
  {
    id: "est-foto-4",
    tipo: "foto",
    url: "/foto4-pilates.webp",
    alt: "Profesora acompañando un ejercicio de Pilates en MUV.",
    local: true,
    posicion: "50% 70%",
  },
  { id: "est-video-2", tipo: "video", url: "/vide2-pilates.mp4", alt: "Ejercicio de Pilates en MUV.", local: true },
  // Grupo 2
  { id: "est-foto-1", tipo: "foto", url: "/foto1-pilates.jpg", alt: "Ejercicio de Pilates sobre el reformer en MUV.", local: true },
  {
    id: "est-foto-3",
    tipo: "foto",
    url: "/foto3-pilates.webp",
    alt: "Clase de Pilates en MUV, vista general.",
    local: true,
    posicion: "55% 55%",
  },
  {
    id: "est-foto-5",
    tipo: "foto",
    url: "/foto5-pilates.webp",
    alt: "Alumna en clase de Pilates en MUV.",
    local: true,
    posicion: "70% 40%",
  },
  { id: "est-video-3", tipo: "video", url: "/video3-pilates.mp4", alt: "Movimiento en clase de Pilates, MUV.", local: true },
];

// Mezcla estáticos (/public) y dinámicos (listarGaleriaPublica) en una sola
// secuencia -- nunca "todos los de una fuente primero": cada página de 4
// (ver galeria-grid.tsx) termina combinando ambas fuentes y alternando
// foto/video, siempre que haya con qué. Determinístico (nada de Math.random
// ni Date.now()): mismo input, mismo orden, siempre -- para que la galería
// no "salte" al recargar la página.
//
// Patrón fijo por cada 4 posiciones: dinámica, estática, estática, dinámica
// -- así cada grupo de a 4 combina las dos fuentes. Dentro de cada elección
// se prefiere, entre las primeras piezas disponibles de la cola elegida, la
// que NO repita el tipo (foto/video) de la pieza anterior -- así tampoco
// quedan páginas de un solo tipo. Si una cola se queda sin contenido, se
// sigue sacando de la otra sin dejar huecos (orden interno de la que queda,
// intacto). Los nuevos uploads de la administradora entran solos en esta
// mezcla la próxima vez que se pida la página -- no hace falta tocar nada
// acá cuando suba contenido nuevo.
function mezclarFuentes(dinamicos: GaleriaGridItem[], estaticos: GaleriaGridItem[]): GaleriaGridItem[] {
  const colaDinamicos = [...dinamicos];
  const colaEstaticos = [...estaticos];
  const resultado: GaleriaGridItem[] = [];
  let ultimoTipo: GaleriaGridItem["tipo"] | null = null;

  function sacarDe(cola: GaleriaGridItem[]): GaleriaGridItem | null {
    if (cola.length === 0) return null;
    let indice = cola.findIndex((item) => item.tipo !== ultimoTipo);
    if (indice === -1) indice = 0; // no hay otra opción -- se repite tipo, pero sigue habiendo contenido real
    const [item] = cola.splice(indice, 1);
    ultimoTipo = item.tipo;
    return item;
  }

  const PATRON = [colaDinamicos, colaEstaticos, colaEstaticos, colaDinamicos];
  let i = 0;
  while (colaDinamicos.length > 0 || colaEstaticos.length > 0) {
    const preferida = PATRON[i % PATRON.length];
    const alternativa = preferida === colaDinamicos ? colaEstaticos : colaDinamicos;
    const item = sacarDe(preferida) ?? sacarDe(alternativa);
    if (item) resultado.push(item);
    i++;
  }

  return resultado;
}

export async function GaleriaSection() {
  const dinamicos = await listarGaleriaPublica();
  const dinamicosItems: GaleriaGridItem[] = dinamicos.map((d) => ({
    id: d.id,
    tipo: d.tipo,
    url: d.url,
    alt: d.titulo ?? "",
    local: false,
  }));
  const items = mezclarFuentes(dinamicosItems, ESTATICOS);

  return (
    <section id="galeria" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-500">Galería</p>
          <h2 className="mt-2 text-2xl font-extrabold text-neutral-900 sm:text-3xl">
            Así se <span className="text-secondary-500">mueve</span> MUV
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            Un adelanto de los ejercicios que vas a encontrar en nuestras clases.
          </p>
        </Reveal>

        <Reveal className="mt-10 sm:mt-12">
          <GaleriaGrid items={items} />
        </Reveal>
      </div>
    </section>
  );
}

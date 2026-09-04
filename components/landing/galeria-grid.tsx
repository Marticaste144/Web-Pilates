"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AutoVideo } from "@/components/landing/auto-video";
import { ChevronRightIcon } from "@/components/ui/icons";

export type GaleriaGridItem = {
  id: string;
  tipo: "foto" | "video";
  url: string;
  /** Solo para accesibilidad (alt) -- nunca se pinta como texto sobre la pieza. */
  alt: string;
  /** true = archivo local de /public (next/image puede optimizarlo); false = URL de Storage dinámica. */
  local: boolean;
  /** Recorte -- por defecto centrado; se ajusta a mano para las piezas donde el centro no es lo más prolijo (ver galeria-section.tsx). */
  posicion?: string;
};

// Composición editorial FIJA de 4 piezas (no masonry, no cards sueltas
// flotando): una sola grilla con roles fijos --
//   A = principal, B = arriba-centro, C = abajo-centro, D = lateral --
// que en cada breakpoint ocupa una posición distinta (ver clases de cada
// celda) pero siempre las mismas 4 piezas por grupo, siempre alineadas
// entre sí (mismo alto de fila / mismo ancho de columna para todas). La
// CELDA fija el tamaño (grid-template-columns/rows con alto de contenedor
// fijo) -- la imagen/video adentro va con object-cover, nunca al revés.
//
// Si hay más de 4 piezas en total, se arman grupos de a 4 y se navega
// entre grupos con flechas/puntos -- cada grupo es un "slide" de scroll-
// snap horizontal (mismo patrón que ProfesoresCarousel: swipe táctil
// nativo gratis, sin librería). La altura del contenedor es fija en los
// tres breakpoints, así que nunca "crece" la sección -- pasar de grupo no
// cambia el alto, solo el contenido de las 4 celdas.
function agruparDeACuatro<T>(items: T[]): T[][] {
  const grupos: T[][] = [];
  for (let i = 0; i < items.length; i += 4) grupos.push(items.slice(i, i + 4));
  return grupos;
}

function Pieza({ item, className }: { item: GaleriaGridItem; className: string }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl bg-neutral-100 ${className}`}>
      {item.tipo === "foto" ? (
        item.local ? (
          <Image
            src={item.url}
            alt={item.alt}
            fill
            loading="lazy"
            sizes="(min-width: 1024px) 32vw, (min-width: 640px) 46vw, 90vw"
            style={item.posicion ? { objectPosition: item.posicion } : undefined}
            className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.02]"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- URL de Storage dinámica (bucket "galeria"), no un asset local que next/image pueda optimizar en build.
          <img
            src={item.url}
            alt={item.alt}
            loading="lazy"
            style={item.posicion ? { objectPosition: item.posicion } : undefined}
            className="h-full w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.02]"
          />
        )
      ) : (
        <AutoVideo
          src={item.url}
          className="h-full w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.02]"
          style={item.posicion ? { objectPosition: item.posicion } : undefined}
        />
      )}
    </div>
  );
}

// Roles fijos por celda -- A ocupa toda la columna izquierda en desktop, la
// fila ancha de arriba en mobile, y el primer cupo del 2x2 en tablet; D
// (lateral derecha) directamente no se muestra en mobile ("pieza principal
// ancha + dos piezas menores debajo", pedido explícito, nunca una columna
// larga de fotos).
const CLASES_A = "col-span-2 row-start-1 sm:col-span-1 sm:col-start-1 sm:row-start-1 lg:col-start-1 lg:row-start-1 lg:row-span-2";
const CLASES_B = "col-start-1 row-start-2 sm:col-start-2 sm:row-start-1 lg:col-start-2 lg:row-start-1";
const CLASES_C = "col-start-2 row-start-2 sm:col-start-1 sm:row-start-2 lg:col-start-2 lg:row-start-2";
const CLASES_D = "hidden sm:block sm:col-start-2 sm:row-start-2 lg:col-start-3 lg:row-start-1 lg:row-span-2";

export function GaleriaGrid({ items }: { items: GaleriaGridItem[] }) {
  const grupos = agruparDeACuatro(items);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activo, setActivo] = useState(0);

  const actualizarActivo = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let masCercano = 0;
    let distanciaMinima = Infinity;
    slideRefs.current.forEach((slide, i) => {
      if (!slide) return;
      const distancia = Math.abs(slide.offsetLeft - scroller.scrollLeft);
      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        masCercano = i;
      }
    });
    setActivo(masCercano);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let frame: number | null = null;
    const onScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        actualizarActivo();
        frame = null;
      });
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [actualizarActivo]);

  const comportamiento = (): ScrollBehavior =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

  const irAGrupo = (i: number) => {
    slideRefs.current[i]?.scrollIntoView({ behavior: comportamiento(), inline: "start", block: "nearest" });
  };

  const desplazar = (direccion: 1 | -1) => irAGrupo(Math.min(Math.max(activo + direccion, 0), grupos.length - 1));

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        role="region"
        aria-label="Galería de fotos y videos de MUV"
        tabIndex={0}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth motion-reduce:scroll-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {grupos.map((grupo, i) => (
          <div
            key={i}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className="grid h-[320px] w-full shrink-0 snap-start grid-cols-2 grid-rows-2 gap-3 sm:h-[380px] sm:gap-3.5 lg:h-[500px] lg:grid-cols-[1fr_1.3fr_1fr] lg:gap-4"
          >
            {grupo[0] && <Pieza item={grupo[0]} className={CLASES_A} />}
            {grupo[1] && <Pieza item={grupo[1]} className={CLASES_B} />}
            {grupo[2] && <Pieza item={grupo[2]} className={CLASES_C} />}
            {grupo[3] && <Pieza item={grupo[3]} className={CLASES_D} />}
          </div>
        ))}
      </div>

      {grupos.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Ver grupo anterior"
            disabled={activo === 0}
            onClick={() => desplazar(-1)}
            className="absolute left-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-[0_1px_6px_rgba(17,24,39,0.08)] ring-1 ring-neutral-900/5 backdrop-blur-sm transition-all duration-200 hover:text-primary-600 disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronRightIcon className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            aria-label="Ver grupo siguiente"
            disabled={activo === grupos.length - 1}
            onClick={() => desplazar(1)}
            className="absolute right-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-[0_1px_6px_rgba(17,24,39,0.08)] ring-1 ring-neutral-900/5 backdrop-blur-sm transition-all duration-200 hover:text-primary-600 disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>

          <div className="mt-5 flex items-center justify-center gap-2">
            {grupos.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ver grupo ${i + 1}`}
                aria-current={activo === i}
                onClick={() => irAGrupo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activo === i ? "w-6 bg-primary-600" : "w-1.5 bg-neutral-300 hover:bg-neutral-400"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

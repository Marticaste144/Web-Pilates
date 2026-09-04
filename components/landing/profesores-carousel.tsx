"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProfesorPublico } from "@/lib/landing/profesores-data";
import { ChevronRightIcon } from "@/components/ui/icons";

// Carrusel con scroll-snap nativo (no una librería nueva): cada card tiene
// scroll-snap-align, el contenedor scrollea horizontal con
// -webkit-overflow-scrolling touch + scrollbar oculta por CSS -- eso YA da
// swipe táctil fluido gratis, sin JS de por medio. Las flechas solo llaman
// scrollBy() por el ancho de UNA card; los puntos son uno por profesor (no
// por "página": con la cantidad visible cambiando en cada breakpoint --
// 1/2-3/4-5 -- no hay una noción estable de "página" entre desktop y
// mobile, un punto por card sí es siempre correcto) y saltan a esa card con
// scrollIntoView. El índice activo se recalcula en cada scroll (con
// throttle vía requestAnimationFrame) mirando qué card quedó más cerca del
// borde izquierdo del contenedor.
export function ProfesoresCarousel({ profesores }: { profesores: ProfesorPublico[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activo, setActivo] = useState(0);
  const [puedeIzquierda, setPuedeIzquierda] = useState(false);
  const [puedeDerecha, setPuedeDerecha] = useState(profesores.length > 1);

  const actualizarEstado = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    setPuedeIzquierda(scroller.scrollLeft > 8);
    setPuedeDerecha(scroller.scrollLeft < scroller.scrollWidth - scroller.clientWidth - 8);

    let masCercano = 0;
    let distanciaMinima = Infinity;
    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      const distancia = Math.abs(card.offsetLeft - scroller.scrollLeft);
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
        actualizarEstado();
        frame = null;
      });
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    actualizarEstado();
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [actualizarEstado]);

  const comportamiento = (): ScrollBehavior =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

  const irACard = (i: number) => {
    cardRefs.current[i]?.scrollIntoView({ behavior: comportamiento(), inline: "start", block: "nearest" });
  };

  const desplazar = (direccion: 1 | -1) => {
    const scroller = scrollerRef.current;
    const card = cardRefs.current[0];
    if (!scroller || !card) return;
    const paso = card.getBoundingClientRect().width + 20; // + gap-5
    scroller.scrollBy({ left: paso * direccion, behavior: comportamiento() });
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        role="region"
        aria-label="Profesores de MUV"
        tabIndex={0}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 motion-reduce:scroll-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {profesores.map((p, i) => (
          <div
            key={p.id}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className="group relative aspect-[3/4] w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl bg-neutral-100 shadow-[0_1px_3px_rgba(17,24,39,0.06)] ring-1 ring-neutral-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_-8px_rgba(17,24,39,0.12)] sm:w-[45%] lg:w-[calc(25%-15px)] xl:w-[calc(20%-16px)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL de Storage/estática dinámica, no un asset que next/image pueda optimizar en build. */}
            <img
              src={p.fotoUrl}
              alt=""
              loading={i < 2 ? "eager" : "lazy"}
              className="h-full w-full object-cover object-[center_85%] transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.04]"
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-4 pb-4 pt-14">
              <p className="text-base font-bold leading-tight text-white">{p.nombre}</p>
              {p.actividades.length > 0 && (
                <p className="mt-0.5 text-xs font-medium text-white/90">{p.actividades.join(" · ")}</p>
              )}
              {p.sedes.length > 0 && <p className="text-[11px] text-white/70">{p.sedes.join(" · ")}</p>}
            </div>
          </div>
        ))}
      </div>

      {profesores.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Ver profesor anterior"
            disabled={!puedeIzquierda}
            onClick={() => desplazar(-1)}
            className="absolute left-0 top-[calc(50%-1.25rem)] z-10 hidden h-10 w-10 -translate-x-4 items-center justify-center rounded-full bg-white text-neutral-700 shadow-md ring-1 ring-neutral-900/5 transition-all duration-200 hover:text-primary-600 disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronRightIcon className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            aria-label="Ver siguiente profesor"
            disabled={!puedeDerecha}
            onClick={() => desplazar(1)}
            className="absolute right-0 top-[calc(50%-1.25rem)] z-10 hidden h-10 w-10 translate-x-4 items-center justify-center rounded-full bg-white text-neutral-700 shadow-md ring-1 ring-neutral-900/5 transition-all duration-200 hover:text-primary-600 disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </>
      )}

      {profesores.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {profesores.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Ver a ${p.nombre}`}
              aria-current={activo === i}
              onClick={() => irACard(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activo === i ? "w-6 bg-primary-600" : "w-1.5 bg-neutral-300 hover:bg-neutral-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

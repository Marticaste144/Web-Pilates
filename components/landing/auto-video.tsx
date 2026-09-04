"use client";

import { useEffect, useRef, type CSSProperties } from "react";

// Video decorativo (sin audio, sin controles) que se reproduce solo, y
// solo, cuando está realmente visible -- se pausa apenas sale del viewport
// (mismo patrón de IntersectionObserver que components/landing/reveal.tsx,
// pero para play/pause en vez de para una animación de aparición). Con
// prefers-reduced-motion no autoplayea nada: se queda quieto en su primer
// frame -- ni siquiera se intenta reproducir, en vez de reproducir y
// pausar enseguida.
//
// Sin `poster`: no había un frame ya extraído de estos videos nuevos para
// usar como tal, y poner una foto cualquiera de las nuevas como poster
// podía no corresponder a ese video puntual -- en vez de esa mezcla se usa
// un fondo neutro (bg-neutral-200) detrás del <video>, visible hasta que
// carga su primer frame.
export function AutoVideo({
  src,
  className,
  style,
  onLoadedMetadata,
}: {
  src: string;
  className?: string;
  /** Ej. objectPosition, para ajustar el encuadre sin deformar cuando el centro no es el mejor recorte. */
  style?: CSSProperties;
  /** Para medir videoWidth/videoHeight real (ej. armar un grid que se adapta a vertical/horizontal) sin abrir un segundo <video> aparte solo para eso. */
  onLoadedMetadata?: (video: HTMLVideoElement) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Autoplay puede rechazarse en algunos navegadores/políticas --
          // el catch silencioso deja el video en su primer frame en vez de
          // romper la sección con un error sin manejar.
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      onLoadedMetadata={onLoadedMetadata ? (e) => onLoadedMetadata(e.currentTarget) : undefined}
      className={`bg-neutral-200 ${className ?? ""}`}
      style={style}
    />
  );
}

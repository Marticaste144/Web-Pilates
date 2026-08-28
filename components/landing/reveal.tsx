"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";

// Fade-up con stagger para la landing pública (app/page.tsx): cada hijo
// directo se anima por separado, corrido "stagger" ms respecto al anterior.
// Se revela una sola vez (no vuelve a ocultarse al salir del viewport) para
// no generar parpadeos al scrollear para arriba y para abajo. Si el usuario
// ya está mirando la sección al montar (ej. el hero), el observer dispara
// enseguida y funciona igual como animación de entrada.
//
// prefers-reduced-motion se respeta dos veces: por las dudas de que el
// efecto JS tarde un frame en aplicarse, las clases motion-reduce:* fuerzan
// opacidad 1 / sin transform / sin transición por CSS puro desde el primer
// render, sin esperar a que corra el useEffect.
export function Reveal({
  children,
  className = "",
  stagger = 90,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // No hace falta ramificar por prefers-reduced-motion acá: las clases
    // motion-reduce:* de abajo ya fuerzan opacidad 1 / sin transform por CSS
    // puro para esos usuarios, sin importar el valor de "visible". Ramificar
    // acá además dispararía un setState síncrono dentro del efecto.
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {Children.toArray(children).map((child, i) => (
        <div
          key={i}
          className={`h-full transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{ transitionDelay: `${i * stagger}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

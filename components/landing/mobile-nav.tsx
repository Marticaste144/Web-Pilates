"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MenuIcon, CloseIcon } from "@/components/ui/icons";

const LINKS = [
  { href: "#inicio", label: "Inicio" },
  { href: "#servicios", label: "Clases" },
  { href: "#galeria", label: "Galería" },
  { href: "#contacto", label: "Contacto" },
];

// Botón hamburguesa + panel desplegable, solo visible en mobile (el <nav>
// de al lado ya se encarga de desktop, sm:flex/sm:hidden son complementarios
// entre los dos). Antes no había NINGUNA forma de llegar a los anchors
// (Inicio/Clases/Contacto) desde mobile -- el <nav> entero estaba oculto
// sin alternativa. Mismos 4 links que el nav de desktop, mismo criterio de
// estilo que el resto del header (blanco, borde sutil, texto neutral-600/
// secondary-500 en el activo).
export function MobileNav() {
  const [abierto, setAbierto] = useState(false);

  // Cerrar con Escape -- mismo criterio de accesibilidad que cualquier panel
  // desplegable (no depender solo del mouse/touch para cerrarlo).
  useEffect(() => {
    if (!abierto) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [abierto]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={abierto}
        aria-controls="menu-mobile"
        onClick={() => setAbierto((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-700 transition-colors duration-200 hover:bg-neutral-100 hover:text-neutral-900"
      >
        {abierto ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </button>

      {abierto && (
        <nav
          id="menu-mobile"
          className="absolute inset-x-0 top-full border-b border-neutral-100 bg-white/98 px-5 py-3 shadow-[0_8px_20px_-8px_rgba(17,24,39,0.12)] backdrop-blur-md"
        >
          <div className="flex flex-col divide-y divide-neutral-100">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setAbierto(false)}
                className="py-3 text-sm font-medium text-neutral-700 transition-colors duration-200 hover:text-primary-600"
              >
                {link.label}
              </a>
            ))}
          </div>
          <Link
            href="/login"
            onClick={() => setAbierto(false)}
            className="mt-3 block border-t border-neutral-100 pt-3 text-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-900"
          >
            Iniciar sesión
          </Link>
        </nav>
      )}
    </div>
  );
}

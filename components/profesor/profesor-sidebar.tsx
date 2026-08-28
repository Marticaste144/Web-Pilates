"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { Isotipo } from "@/components/ui/isotipo";
import { HomeIcon, CalendarIcon } from "@/components/ui/icons";

type NavLink = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const LINKS: NavLink[] = [
  { href: "/profesor", label: "Inicio", icon: HomeIcon },
  { href: "/profesor/clases", label: "Mis clases", icon: CalendarIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/profesor") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Sidebar exclusivo del rol profesor: en desktop es una barra angosta con
// degradé azul -> turquesa (identidad MUV) y formas orgánicas decorativas de
// fondo; en mobile se repliega a una tab bar inferior (mismo patrón que
// NavBar en el resto de la app) para no perder la navegación en pantallas
// chicas.
export function ProfesorSidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="relative hidden shrink-0 flex-col gap-8 overflow-hidden bg-gradient-to-b from-primary-700 via-primary-600 to-secondary-500 px-4 py-6 md:flex md:w-48 lg:w-56">
        {/* Formas orgánicas decorativas -- solo de fondo: pointer-events-none
            y detrás del contenido (z-10 en logo/nav) para que nunca tapen ni
            interfieran con los botones de navegación. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -bottom-20 -left-14 h-56 w-56 rounded-full bg-white/10" />
          <div className="absolute bottom-6 -right-16 h-44 w-44 rounded-full bg-secondary-200/25" />
          <div className="absolute -bottom-28 right-[-4rem] h-72 w-72 rounded-full bg-primary-900/15" />
        </div>

        <div className="relative z-10 flex items-center px-1">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/25">
            <Isotipo className="h-11 w-11" />
          </span>
        </div>

        <nav className="relative z-10 flex flex-col gap-1.5">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-colors ${
                  active ? "bg-secondary-400 text-white shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                active ? "text-secondary-600" : "text-neutral-400"
              }`}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

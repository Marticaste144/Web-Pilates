"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
  HomeIcon,
  CalendarIcon,
  ListIcon,
  WalletIcon,
  UserIcon,
  UsersIcon,
  TagIcon,
  MegaphoneIcon,
} from "@/components/ui/icons";

type NavLink = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

// Los ítems (con las referencias a los componentes de ícono) viven DENTRO de
// este módulo cliente a propósito: si un Server Component (ej. AlumnoNav)
// los arma y se los pasa como prop a este Client Component, React no puede
// serializar una función (el componente de ícono) cruzando ese límite y
// rompe en runtime -- error que "next build" no detecta acá porque estas
// rutas son force-dynamic (nunca se prerenderizan). Por eso NavBar recibe
// solo "role" (un string, serializable) y resuelve los links acá adentro.
const LINKS_POR_ROL: Record<"admin" | "alumno" | "profesor", NavLink[]> = {
  admin: [
    { href: "/admin", label: "Inicio", icon: HomeIcon },
    { href: "/admin/profesores", label: "Profesores", icon: UsersIcon },
    { href: "/admin/alumnos", label: "Alumnos", icon: UserIcon },
    { href: "/admin/clases", label: "Clases", icon: CalendarIcon },
    { href: "/admin/aranceles", label: "Aranceles", icon: TagIcon },
    { href: "/admin/avisos", label: "Avisos", icon: MegaphoneIcon },
  ],
  alumno: [
    { href: "/alumno", label: "Inicio", icon: HomeIcon },
    { href: "/alumno/clases", label: "Clases", icon: CalendarIcon },
    { href: "/alumno/inscripciones", label: "Mis clases", icon: ListIcon },
    { href: "/alumno/cuota", label: "Mi cuota", icon: WalletIcon },
  ],
  profesor: [
    { href: "/profesor", label: "Inicio", icon: HomeIcon },
    { href: "/profesor/clases", label: "Mis clases", icon: CalendarIcon },
  ],
};

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/alumno" || href === "/profesor") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Nav compartido por los 3 roles: fila horizontal arriba en desktop, tab bar
// fija abajo en mobile (la mayoría de los alumnos entra desde el celular --
// una tab bar es más cómoda ahí que un nav horizontal apretado).
export function NavBar({ role }: { role: "admin" | "alumno" | "profesor" }) {
  const pathname = usePathname();
  const links = LINKS_POR_ROL[role];

  return (
    <>
      <nav className="hidden gap-1 border-b border-neutral-200 bg-white px-4 sm:flex">
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                active
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                active ? "text-primary-700" : "text-neutral-400"
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

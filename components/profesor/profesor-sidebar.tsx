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

// Sidebar exclusivo del rol profesor: en desktop es una barra fija con
// degradé azul -> turquesa (identidad MUV); en mobile se repliega a una tab
// bar inferior (mismo patrón que NavBar en el resto de la app) para no
// perder la navegación en pantallas chicas.
export function ProfesorSidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden shrink-0 flex-col gap-8 bg-gradient-to-b from-primary-700 via-primary-600 to-secondary-500 px-5 py-6 md:flex md:w-60 lg:w-64">
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
            <Isotipo className="h-7 w-7" />
          </span>
          <span className="text-xl font-bold tracking-tight text-white">MUV</span>
        </div>

        <nav className="flex flex-col gap-1.5">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                  active ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
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

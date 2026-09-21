import type { ReactNode } from "react";
import Link from "next/link";
import { AuthHero } from "./auth-hero";

export function AuthShell({
  heroTitle,
  heroSubtitle,
  logoHref,
  children,
}: {
  heroTitle: string;
  heroSubtitle: string;
  logoHref?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="relative flex w-full flex-1 flex-col overflow-hidden md:flex-row">
        <AuthHero title={heroTitle} subtitle={heroSubtitle} logoHref={logoHref} />

        <div className="relative -mt-8 flex flex-1 flex-col rounded-t-3xl bg-white p-6 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] md:mt-0 md:items-center md:justify-center md:rounded-none md:shadow-none">
          {/* py-4 solo importa en mobile (ahí se permite scroll de página) --
              en desktop (md:items-center ya centra el bloque verticalmente)
              se saca ese padding extra: junto con p-8 en vez de p-10 acá
              arriba, es la diferencia entre entrar o no en 100dvh en
              pantallas de 768px de alto (1024x768/1366x768, las más
              angostas verticalmente de las que se prueban). */}
          <div className="mx-auto flex w-full max-w-sm flex-col py-4 md:py-0">
            {children}
            <p className="mt-6 text-center text-xs text-neutral-400 md:mt-4">
              <Link href="/legal" className="hover:text-primary-600 hover:underline">
                Términos y Condiciones y Política de Privacidad
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

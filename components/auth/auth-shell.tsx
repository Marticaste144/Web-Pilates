import type { ReactNode } from "react";
import Link from "next/link";
import { AuthHero } from "./auth-hero";

export function AuthShell({
  heroTitle,
  heroSubtitle,
  children,
}: {
  heroTitle: string;
  heroSubtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="relative flex w-full flex-1 flex-col overflow-hidden md:flex-row">
        <AuthHero title={heroTitle} subtitle={heroSubtitle} />

        <div className="relative -mt-8 flex flex-1 flex-col rounded-t-3xl bg-white p-6 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] md:mt-0 md:items-center md:justify-center md:rounded-none md:p-10 md:shadow-none">
          <div className="mx-auto flex w-full max-w-sm flex-col py-4">
            {children}
            <p className="mt-6 text-center text-xs text-neutral-400">
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

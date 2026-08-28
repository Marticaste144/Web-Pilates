"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/auth/actions";
import { ChevronDownIcon, LogOutIcon } from "@/components/ui/icons";

// Sin foto ni datos extra de la profesora -- a pedido, el sidebar queda
// "limpio" y esta info vive solo acá arriba, en un menú desplegable.
export function ProfesorTopbar({ nombre, apellido }: { nombre: string; apellido: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <header className="flex items-center justify-end px-4 py-4 sm:px-6 sm:py-5">
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50"
        >
          {nombre} {apellido}
          <ChevronDownIcon className={`h-4 w-4 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
              >
                <LogOutIcon className="h-4 w-4" />
                Cerrar sesión
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}

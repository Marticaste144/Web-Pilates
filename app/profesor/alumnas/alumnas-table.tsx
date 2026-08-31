"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Input, Select } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { AlumnaListItem } from "@/lib/profesor/alumnas-data";

export function AlumnasTable({ alumnas, sedes }: { alumnas: AlumnaListItem[]; sedes: string[] }) {
  const [q, setQ] = useState("");
  const [sede, setSede] = useState("");

  const filtradas = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return alumnas.filter((a) => {
      if (sede && !a.sedes.includes(sede)) return false;
      if (!texto) return true;
      return (
        a.nombre.toLowerCase().includes(texto) ||
        a.apellido.toLowerCase().includes(texto) ||
        a.email.toLowerCase().includes(texto) ||
        (a.telefono ?? "").toLowerCase().includes(texto)
      );
    });
  }, [alumnas, q, sede]);

  if (alumnas.length === 0) {
    return (
      <EmptyState
        title="Todavía no tenés alumnas asignadas"
        description="Cuando tengas alumnas anotadas en tus clases, las vas a ver acá."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={sede} onChange={(e) => setSede(e.target.value)} className="sm:w-56">
          <option value="">Todas las sedes</option>
          {sedes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar alumna..."
            className="pl-9"
          />
        </div>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState
          title="No encontramos alumnas con esa búsqueda"
          description="Probá con otro nombre, sede o dato de contacto."
        />
      ) : (
        <Card padded={false}>
          {/* Desktop/tablet: columnas fijas en grid -- nunca fuerza scroll
              horizontal como haría una <table> angosta con muchas columnas. */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-[1.2fr_1fr_1.4fr_1fr_auto] gap-4 px-6 pt-5 pb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
              <span>Nombre</span>
              <span>Teléfono</span>
              <span>Email</span>
              <span>Sede</span>
              <span />
            </div>
            <div className="flex flex-col divide-y divide-neutral-100 border-t border-neutral-100">
              {filtradas.map((a) => (
                <Link
                  key={a.alumnoId}
                  href={`/profesor/alumnas/${a.alumnoId}`}
                  className="group grid grid-cols-[1.2fr_1fr_1.4fr_1fr_auto] items-center gap-4 px-6 py-3.5 transition-colors hover:bg-neutral-50"
                >
                  <span className="min-w-0 truncate font-medium text-neutral-900">
                    {a.nombre} {a.apellido}
                  </span>
                  <span className="min-w-0 truncate text-neutral-600">{a.telefono ?? "-"}</span>
                  <span className="min-w-0 truncate text-neutral-600">{a.email}</span>
                  <span className="min-w-0 truncate text-neutral-600">{a.sedes.join(", ")}</span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-neutral-300 group-hover:text-primary-500" />
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile: una card por alumna, todo el dato visible sin achicar. */}
          <div className="flex flex-col divide-y divide-neutral-100 sm:hidden">
            {filtradas.map((a) => (
              <Link key={a.alumnoId} href={`/profesor/alumnas/${a.alumnoId}`} className="flex flex-col gap-1 p-5">
                <p className="font-semibold text-neutral-900">
                  {a.nombre} {a.apellido}
                </p>
                <p className="text-sm text-secondary-600">{a.sedes.join(", ")}</p>
                <p className="mt-1 text-sm text-neutral-600">{a.telefono ?? "Sin teléfono"}</p>
                <p className="text-sm text-neutral-600">{a.email}</p>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

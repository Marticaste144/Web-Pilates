"use client";

import { terminarSuplencia } from "@/lib/admin/suplencias-actions";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function TerminarSuplenciaButton({ id }: { id: string }) {
  return (
    <ConfirmButton
      action={() => terminarSuplencia(id)}
      triggerLabel="Finalizar"
      confirmTitle="¿Finalizar esta suplencia?"
      confirmDescription="El profesor suplente pierde al instante el acceso a los alumnos/fichas del profesor reemplazado."
      confirmLabel="Sí, finalizar"
    />
  );
}

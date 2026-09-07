"use client";

import { useRouter } from "next/navigation";
import { eliminarClase } from "@/lib/admin/clases-actions";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function EliminarClaseButton({ claseId }: { claseId: string }) {
  const router = useRouter();

  return (
    <ConfirmButton
      action={() => eliminarClase(claseId)}
      triggerLabel="Eliminar clase"
      variant="button"
      confirmTitle="¿Eliminar esta clase?"
      confirmDescription="Se borra por completo. Si alguna vez tuvo alumnas anotadas, asistencias, feedback o planificación, no se va a poder eliminar hasta resolver eso primero."
      confirmLabel="Sí, eliminar"
      onResult={(result) => {
        if (result.ok) router.push("/admin/clases");
      }}
    />
  );
}

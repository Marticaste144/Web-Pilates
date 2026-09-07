"use client";

import { useRouter } from "next/navigation";
import { eliminarProfesor } from "@/lib/admin/profesores-actions";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function EliminarProfesorButton({ profileId }: { profileId: string }) {
  const router = useRouter();

  return (
    <ConfirmButton
      action={() => eliminarProfesor(profileId)}
      triggerLabel="Eliminar profesor"
      variant="button"
      confirmTitle="¿Eliminar este profesor?"
      confirmDescription="Se borra la cuenta por completo. Si tiene alguna clase asignada o tomó asistencia alguna vez, no se va a poder eliminar hasta resolver eso primero."
      confirmLabel="Sí, eliminar"
      onResult={(result) => {
        if (result.ok) router.push("/admin/profesores");
      }}
    />
  );
}

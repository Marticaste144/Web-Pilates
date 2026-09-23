"use client";

import { useRouter } from "next/navigation";
import { eliminarAlumno } from "@/lib/admin/alumnos-actions";
import { ConfirmButton } from "@/components/ui/confirm-button";

// Eliminación DEFINITIVA -- distinta de "Activa/Inactiva" (que es lo normal
// para uso diario). Borra clases/pagos/asistencias/ficha/evolución/
// planificaciones de esta alumna (y sus archivos reales en Storage) y, si
// tenía cuenta, también su acceso a MUV. No se puede deshacer.
export function EliminarAlumnoButton({ alumnoId }: { alumnoId: string }) {
  const router = useRouter();

  return (
    <ConfirmButton
      action={() => eliminarAlumno(alumnoId)}
      triggerLabel="Eliminar alumno"
      variant="button"
      confirmTitle="¿Eliminar este alumno definitivamente?"
      confirmDescription="Se borran sus clases, pagos, asistencias, ficha, evolución y planificaciones (incluidos los archivos subidos), y si tenía cuenta también su acceso a MUV. Esta acción no se puede deshacer."
      confirmLabel="Sí, eliminar definitivamente"
      onResult={(result) => {
        if (result.ok) router.push("/admin/alumnos");
      }}
    />
  );
}

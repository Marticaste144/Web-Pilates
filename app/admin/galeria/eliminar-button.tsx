"use client";

import { eliminarGaleriaItem } from "@/lib/admin/galeria-actions";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function EliminarGaleriaButton({ id }: { id: string }) {
  return (
    <ConfirmButton
      action={() => eliminarGaleriaItem(id)}
      triggerLabel="Eliminar"
      confirmTitle="¿Eliminar este contenido de la galería?"
      confirmDescription="Se borra también el archivo de Storage. No se puede deshacer."
      confirmLabel="Sí, eliminar"
    />
  );
}

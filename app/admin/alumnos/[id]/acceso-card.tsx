import type { EstadoAccesoAlumno } from "@/lib/admin/alumnos-data";
import { DarAccesoForm } from "./dar-acceso-form";
import { ReenviarInvitacionAlumnaButton } from "./reenviar-invitacion-alumna-button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// "Perfil de alumna" (esta ficha) y "acceso a MUV" (haber aceptado una
// invitación y elegido contraseña) son dos cosas distintas -- ver migración
// 20260906090000_identidad_alumnas.sql. Acá se ve/gestiona el segundo:
//   - sin_acceso: nunca se le mandó una invitación -- se puede dar acceso
//     ahora si corresponde (nunca se inventa el email).
//   - invitado: ya se generó el link pero todavía no lo confirmó -- se puede
//     reenviar.
//   - activo: ya confirmó y tiene su propia contraseña -- nada que hacer acá.
export function AccesoCard({
  alumnoId,
  email,
  estadoAcceso,
}: {
  alumnoId: string;
  email: string | null;
  estadoAcceso: EstadoAccesoAlumno;
}) {
  return (
    <Card className="max-w-md">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-neutral-900">Acceso a MUV</h2>
        {estadoAcceso === "activo" && <Badge variant="success">Con acceso</Badge>}
        {estadoAcceso === "invitado" && <Badge variant="neutral">Invitación pendiente</Badge>}
        {estadoAcceso === "sin_acceso" && <Badge variant="neutral">Sin acceso</Badge>}
      </div>

      {estadoAcceso === "sin_acceso" && <DarAccesoForm alumnoId={alumnoId} emailSugerido={email} />}

      {estadoAcceso === "invitado" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-neutral-500">Todavía no confirmó su cuenta ni eligió contraseña.</p>
          <ReenviarInvitacionAlumnaButton alumnoId={alumnoId} />
        </div>
      )}

      {estadoAcceso === "activo" && (
        <p className="text-sm text-neutral-500">Ya puede entrar a MUV con su propio usuario y contraseña.</p>
      )}
    </Card>
  );
}

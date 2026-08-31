import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Redirige a una URL firmada de Storage generada en el momento -- mismo
// patrón que /admin/comprobantes/[pagoId] (nunca se expone el path crudo ni
// una URL firmada vieja). Se genera con el cliente de sesión, así queda
// sujeta a la misma RLS de storage.objects ("profesores y admin ven
// archivos de rutinas") en vez de bypasearla.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ profesorId: string }> }) {
  await requireRole("profesor");

  const { profesorId } = await params;
  const supabase = await createClient();

  const { data: rutina } = await supabase
    .from("rutinas_profesor")
    .select("archivo_url")
    .eq("profesor_id", profesorId)
    .maybeSingle();

  if (!rutina?.archivo_url) {
    return NextResponse.json({ error: "Esta rutina no tiene archivo adjunto" }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage.from("rutinas").createSignedUrl(rutina.archivo_url, 300);

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "No se pudo generar el link" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}

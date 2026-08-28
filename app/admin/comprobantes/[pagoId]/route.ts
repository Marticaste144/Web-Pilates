import { NextResponse, type NextRequest } from "next/server";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Redirige a una URL firmada de Storage generada en el momento -- nunca se
// expone el path crudo ni una URL firmada vieja en el HTML de la página; cada
// click en "Ver comprobante" pasa por acá y arma una URL nueva, así nunca
// vence antes de que la admin llegue a abrirla. La generación en sí usa el
// cliente de sesión (no el de service_role): así queda sujeta a la misma RLS
// de storage.objects ("admin ve todos los comprobantes") en vez de
// bypasearla -- si algún día ese chequeo cambia, esta ruta lo hereda solo.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ pagoId: string }> }) {
  try {
    await requireAdminProfile();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { pagoId } = await params;
  const supabase = await createClient();

  const { data: pago } = await supabase.from("pagos").select("comprobante_url").eq("id", pagoId).single();

  if (!pago?.comprobante_url) {
    return NextResponse.json({ error: "No hay comprobante para este pago" }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage
    .from("comprobantes")
    .createSignedUrl(pago.comprobante_url, 300);

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "No se pudo generar el link" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}

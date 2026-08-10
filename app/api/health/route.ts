import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Chequeo simple de que las env vars de Supabase están cargadas y el
// cliente puede conectarse. Útil mientras no hay tablas todavía (paso 2).
export async function GET() {
  const hasEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasEnv) {
    return NextResponse.json(
      { ok: false, error: "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local" },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.getSession();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Conexión a Supabase OK" });
}

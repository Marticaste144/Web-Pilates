import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificarCuotaPorVencer, notificarCuotaVencida } from "@/lib/email/notificaciones";
import type { EstadoVisualCuota } from "@/types/database";

// Vercel Cron llama acá una vez por día (ver vercel.json). Manda
// automáticamente "Authorization: Bearer $CRON_SECRET" si esa env var está
// seteada -- así se evita que cualquiera dispare el chequeo (y el gasto de
// emails) llamando a la URL a mano.
function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function estadoVisual(vencimiento: string): EstadoVisualCuota {
  const hoy = new Date().toISOString().slice(0, 10);
  const limite = new Date();
  limite.setDate(limite.getDate() + 5);
  const limiteStr = limite.toISOString().slice(0, 10);

  if (vencimiento < hoy) return "vencida";
  if (vencimiento <= limiteStr) return "por_vencer";
  return "al_dia";
}

const LOG = "[cron:revisar-cuotas]";

export async function GET(request: NextRequest) {
  console.log(`${LOG} disparado`);

  if (!autorizado(request)) {
    console.warn(`${LOG} no autorizado -- CRON_SECRET ausente o Authorization no coincide`);
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();

  // No se puede usar v_estado_cuota_alumno_sede acá: esa vista filtra por
  // auth.uid()/fn_current_role(), que con la service_role key (sin sesión de
  // usuario) siempre da null -- devolvería 0 filas. Se replica la misma
  // lógica (última cuota aprobada por alumno+sede) a mano contra "pagos".
  const { data: pagos, error: errorPagos } = await admin
    .from("pagos")
    .select(
      "id, alumno_id, sede_id, monto, vencimiento, notificado_por_vencer_en, notificado_vencida_en",
    )
    .eq("estado", "aprobado")
    .order("aprobado_en", { ascending: false });

  if (errorPagos) {
    console.error(`${LOG} no se pudo leer "pagos"`, errorPagos);
    return NextResponse.json({ error: errorPagos.message }, { status: 500 });
  }

  const vistos = new Set<string>();
  const ultimoPagoPorAlumnoSede = (pagos ?? []).filter((p) => {
    const clave = `${p.alumno_id}:${p.sede_id}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });

  const pendientes = ultimoPagoPorAlumnoSede.filter((p) => {
    if (!p.vencimiento) return false;
    const estado = estadoVisual(p.vencimiento);
    if (estado === "por_vencer" && !p.notificado_por_vencer_en) return true;
    if (estado === "vencida" && !p.notificado_vencida_en) return true;
    return false;
  });

  console.log(
    `${LOG} pagos aprobados=${pagos?.length ?? 0} últimos por alumno+sede=${ultimoPagoPorAlumnoSede.length} pendientes de notificar=${pendientes.length}`,
  );

  let porVencerEnviados = 0;
  let vencidaEnviados = 0;
  const errores: string[] = [];

  if (pendientes.length > 0) {
    const alumnoIds = [...new Set(pendientes.map((p) => p.alumno_id))];
    const sedeIds = [...new Set(pendientes.map((p) => p.sede_id))];

    const [{ data: perfiles }, { data: sedes }] = await Promise.all([
      admin.from("profiles").select("id, email, nombre").in("id", alumnoIds),
      admin.from("sedes").select("id, nombre").in("id", sedeIds),
    ]);

    const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, p]));
    const sedePorId = new Map((sedes ?? []).map((s) => [s.id, s]));

    for (const pago of pendientes) {
      const perfil = perfilPorId.get(pago.alumno_id);
      const sede = sedePorId.get(pago.sede_id);
      if (!perfil || !sede || !pago.vencimiento) {
        console.warn(
          `${LOG} pago ${pago.id}: falta perfil (${!perfil}) o sede (${!sede}) o vencimiento (${!pago.vencimiento}) -- se saltea`,
        );
        continue;
      }

      const estado = estadoVisual(pago.vencimiento);

      try {
        if (estado === "por_vencer") {
          await notificarCuotaPorVencer({
            alumnoEmail: perfil.email,
            alumnoNombre: perfil.nombre,
            sedeNombre: sede.nombre,
            vencimiento: pago.vencimiento,
            monto: pago.monto,
          });
          await admin
            .from("pagos")
            .update({ notificado_por_vencer_en: new Date().toISOString() })
            .eq("id", pago.id);
          porVencerEnviados++;
        } else if (estado === "vencida") {
          await notificarCuotaVencida({
            alumnoEmail: perfil.email,
            alumnoNombre: perfil.nombre,
            sedeNombre: sede.nombre,
            vencimiento: pago.vencimiento,
            monto: pago.monto,
          });
          await admin
            .from("pagos")
            .update({ notificado_vencida_en: new Date().toISOString() })
            .eq("id", pago.id);
          vencidaEnviados++;
        }
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : "error desconocido";
        console.error(`${LOG} pago ${pago.id} (${estado}) -- falló el envío`, err);
        errores.push(`pago ${pago.id}: ${mensaje}`);
      }
    }
  }

  console.log(
    `${LOG} resumen final: porVencerEnviados=${porVencerEnviados} vencidaEnviados=${vencidaEnviados} errores=${errores.length}`,
  );

  return NextResponse.json({ ok: true, porVencerEnviados, vencidaEnviados, errores });
}

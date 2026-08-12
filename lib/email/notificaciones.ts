import { getResendClient, getEmailFrom } from "./client";
import { plantillaBase, boton } from "./plantilla";
import { getSiteUrl } from "@/lib/site-url";
import { DIAS_SEMANA } from "@/lib/dias-semana";

async function enviarEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: getEmailFrom(),
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    throw new Error(`Resend: ${error.message}`);
  }
}

function diaLabel(dia: number): string {
  return DIAS_SEMANA.find((d) => d.value === dia)?.label ?? `día ${dia}`;
}

function horaLabel(hora: string): string {
  return hora.slice(0, 5);
}

function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR");
}

function siteUrlOpcional(): string {
  try {
    return getSiteUrl();
  } catch {
    // El link "ver en la app" es un plus, no bloqueante -- si falta la env
    // var, el email igual se manda, solo que sin el botón.
    return "";
  }
}

// Caso 1: se liberó un lugar en lista de espera y el trigger de promoción
// (fn_promover_lista_espera) lo anotó como activo -- ver
// lib/alumno/inscripciones-actions.ts (darseDeBaja) para quién llama a esto.
export async function notificarLugarLiberado(params: {
  alumnoEmail: string;
  alumnoNombre: string;
  sedeNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}): Promise<void> {
  const siteUrl = siteUrlOpcional();

  const html = plantillaBase(
    "Lugar liberado",
    `
      <h1 style="font-size: 18px; margin: 0 0 12px;">¡Buenas noticias, ${params.alumnoNombre}!</h1>
      <p style="font-size: 14px; line-height: 1.5; margin: 0 0 12px;">
        Se liberó un lugar y ya estás anotado/a en la clase de <strong>${params.sedeNombre}</strong>,
        los <strong>${diaLabel(params.diaSemana)}</strong> de
        <strong>${horaLabel(params.horaInicio)} a ${horaLabel(params.horaFin)}</strong>.
      </p>
      ${siteUrl ? boton(`${siteUrl}/alumno/inscripciones`, "Ver mis clases") : ""}
    `,
  );

  await enviarEmail({ to: params.alumnoEmail, subject: "Ya tenés tu lugar en la clase", html });
}

// Caso 2 (cron diario): cuota a 5 días o menos de vencer.
export async function notificarCuotaPorVencer(params: {
  alumnoEmail: string;
  alumnoNombre: string;
  sedeNombre: string;
  vencimiento: string;
  monto: number;
}): Promise<void> {
  const siteUrl = siteUrlOpcional();

  const html = plantillaBase(
    "Cuota por vencer",
    `
      <h1 style="font-size: 18px; margin: 0 0 12px;">Hola ${params.alumnoNombre},</h1>
      <p style="font-size: 14px; line-height: 1.5; margin: 0 0 12px;">
        Tu cuota de <strong>${params.sedeNombre}</strong> (\$${params.monto.toLocaleString("es-AR")})
        vence el <strong>${formatearFecha(params.vencimiento)}</strong>.
      </p>
      ${siteUrl ? boton(`${siteUrl}/alumno/cuota`, "Pagar ahora") : ""}
    `,
  );

  await enviarEmail({ to: params.alumnoEmail, subject: "Tu cuota está por vencer", html });
}

// Caso 2 (cron diario): cuota ya vencida.
export async function notificarCuotaVencida(params: {
  alumnoEmail: string;
  alumnoNombre: string;
  sedeNombre: string;
  vencimiento: string;
  monto: number;
}): Promise<void> {
  const siteUrl = siteUrlOpcional();

  const html = plantillaBase(
    "Cuota vencida",
    `
      <h1 style="font-size: 18px; margin: 0 0 12px;">Hola ${params.alumnoNombre},</h1>
      <p style="font-size: 14px; line-height: 1.5; margin: 0 0 12px;">
        Tu cuota de <strong>${params.sedeNombre}</strong> (\$${params.monto.toLocaleString("es-AR")})
        venció el <strong>${formatearFecha(params.vencimiento)}</strong>. Mientras esté vencida no vas a
        poder anotarte a clases nuevas ni marcar presente en las que ya tenés.
      </p>
      ${siteUrl ? boton(`${siteUrl}/alumno/cuota`, "Regularizar pago") : ""}
    `,
  );

  await enviarEmail({ to: params.alumnoEmail, subject: "Tu cuota está vencida", html });
}

// Caso 3: la admin publica un aviso -- se manda a todos los alumnos y
// profesores afectados de una sola vez. Se manda con resend.batch.send
// (hasta 100 emails por llamada, cada uno con su propio "to" -- nadie ve la
// lista de destinatarios de los demás) en vez de un solo email con muchos
// destinatarios o BCC.
export async function notificarAviso(params: {
  destinatarios: { email: string; nombre: string }[];
  titulo: string;
  mensaje: string;
  fechaInicio: string;
  fechaFin: string;
  sedesTexto: string;
}): Promise<{ enviados: number; fallidos: number }> {
  if (params.destinatarios.length === 0) {
    return { enviados: 0, fallidos: 0 };
  }

  const resend = getResendClient();
  const from = getEmailFrom();

  const html = plantillaBase(
    "Aviso",
    `
      <h1 style="font-size: 18px; margin: 0 0 12px;">${params.titulo}</h1>
      <p style="font-size: 13px; color: #64748b; margin: 0 0 12px;">
        ${params.sedesTexto} · del ${formatearFecha(params.fechaInicio)} al ${formatearFecha(params.fechaFin)}
      </p>
      <p style="font-size: 14px; line-height: 1.5; margin: 0; white-space: pre-line;">${params.mensaje}</p>
    `,
  );

  const TAMANO_LOTE = 100;
  let enviados = 0;
  let fallidos = 0;

  for (let i = 0; i < params.destinatarios.length; i += TAMANO_LOTE) {
    const lote = params.destinatarios.slice(i, i + TAMANO_LOTE);
    const { data, error } = await resend.batch.send(
      lote.map((d) => ({ from, to: d.email, subject: `Aviso: ${params.titulo}`, html })),
    );

    if (error) {
      fallidos += lote.length;
      console.error("Error mandando lote de emails de aviso", error);
    } else {
      enviados += data?.data.length ?? lote.length;
    }
  }

  return { enviados, fallidos };
}

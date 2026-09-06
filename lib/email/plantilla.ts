// Wrapper HTML común a todos los emails -- estilos inline a propósito (la
// mayoría de los clientes de correo ignoran/rompen <style> en el <head>).
// Paleta igual a la de la app (primary-600 #2f7cd6, secondary-500 #2bbfa6,
// neutral-50/900) para que se sienta como una comunicación real de MUV, no
// como un email técnico genérico. max-width 480px + padding relativo hace
// que se vea bien tanto en desktop como en el cliente de mail del celular.
export function plantillaBase(tituloInterno: string, contenidoHtml: string): string {
  return `
    <div style="background: #faf9f7; padding: 32px 16px; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 480px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="display: inline-block; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #2f7cd6;">
            MUV
          </span>
          <span style="display: inline-block; font-size: 13px; font-weight: 500; letter-spacing: 0.02em; color: #8c8477; margin-left: 4px;">
            Gimnasia Postural
          </span>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 28px 24px; box-shadow: 0 1px 3px rgba(33, 31, 28, 0.08);">
          ${contenidoHtml}
        </div>

        <p style="font-size: 12px; color: #8c8477; text-align: center; margin: 20px 0 0; line-height: 1.5;">
          Este es un email automático de MUV Gimnasia Postural.<br />Si tenés dudas, contactanos directamente en el estudio.
        </p>
      </div>
    </div>
  `;
}

export function boton(href: string, texto: string): string {
  return `
    <a href="${href}" style="display: inline-block; margin-top: 18px; background: #2f7cd6; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 10px;">
      ${texto}
    </a>
  `;
}

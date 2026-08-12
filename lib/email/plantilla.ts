// Wrapper HTML común a todos los emails -- estilos inline a propósito
// (la mayoría de los clientes de correo ignoran/rompen <style> en el <head>).
export function plantillaBase(tituloInterno: string, contenidoHtml: string): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1e293b;">
      <p style="font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #2f7cd6; margin: 0 0 16px;">
        MUV Gimnasia Postural
      </p>
      ${contenidoHtml}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        Este es un email automático de MUV Gimnasia Postural. Si tenés dudas, contactanos directamente en el estudio.
      </p>
    </div>
  `;
}

export function boton(href: string, texto: string): string {
  return `
    <a href="${href}" style="display: inline-block; margin-top: 16px; background: #2f7cd6; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 8px;">
      ${texto}
    </a>
  `;
}

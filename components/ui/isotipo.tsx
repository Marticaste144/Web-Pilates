// Recreación en SVG del isotipo oficial de MUV (círculo dividido por curvas
// blancas en azul -> turquesa, con una cuña verde azulado más oscura abajo a
// la izquierda y un acento circular blanco) -- misma técnica (rect + path +
// stroke blanco) que ya se usaba en components/auth/auth-hero.tsx desde el
// paso 4, así que los colores no son nuevos, solo se formalizan acá.
//
// NOTA: esto es una reconstrucción a partir de esos mismos colores, no el
// archivo PNG original (no llegó accesible como archivo en este entorno,
// solo se pudo ver dentro del chat) -- si se consigue el PNG real, este
// componente se puede reemplazar por un <img>/<Image> directo.
export function Isotipo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <clipPath id="isotipo-circulo">
          <circle cx="100" cy="100" r="100" />
        </clipPath>
        <linearGradient id="isotipo-azul" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#529ee0" />
          <stop offset="100%" stopColor="#2f7cd6" />
        </linearGradient>
        <linearGradient id="isotipo-turquesa" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#1f9d86" />
          <stop offset="100%" stopColor="#4fd0b8" />
        </linearGradient>
      </defs>
      <g clipPath="url(#isotipo-circulo)">
        <rect width="200" height="200" fill="url(#isotipo-turquesa)" />
        <path d="M0,0 H200 V60 C140,140 80,10 0,90 Z" fill="url(#isotipo-azul)" />
        <path d="M0,115 C55,145 75,165 95,200 L0,200 Z" fill="#15806c" />
        <path
          d="M200,60 C140,140 80,10 0,90"
          fill="none"
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M0,115 C55,145 75,165 95,200"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.9"
        />
      </g>
      <circle cx="152" cy="52" r="11" fill="#ffffff" />
    </svg>
  );
}

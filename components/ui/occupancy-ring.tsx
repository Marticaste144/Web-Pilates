// Compartido entre el Inicio del profesor (ocupación de "próxima clase",
// value/max = alumnas/cupo) y el Inicio del admin (ocupación promedio de
// todas las clases activas, un porcentaje) -- centerValue/centerLabel
// dejan que cada uno muestre lo suyo sin duplicar el dibujo del anillo.
export function OccupancyRing({
  value,
  max,
  size = 96,
  centerValue,
  centerLabel,
}: {
  value: number;
  max: number;
  size?: number;
  centerValue?: string;
  centerLabel?: string;
}) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-secondary-100)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-secondary-500)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-neutral-900">{centerValue ?? `${value}/${max}`}</span>
        {centerLabel !== "" && <span className="text-[11px] text-neutral-500">{centerLabel ?? "alumnos"}</span>}
      </div>
    </div>
  );
}

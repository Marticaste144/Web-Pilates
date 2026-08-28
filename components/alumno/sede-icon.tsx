import Image from "next/image";
import { CalendarIcon } from "@/components/ui/icons";

const PNG_POR_SEDE: Record<"fitness" | "pilates" | "postural", string> = {
  fitness: "/fitness.png",
  pilates: "/pilates.png",
  postural: "/postural.png",
};

function claveSede(nombre: string): keyof typeof PNG_POR_SEDE | null {
  const n = nombre.toLowerCase();
  if (n.includes("fitness")) return "fitness";
  if (n.includes("pilates")) return "pilates";
  if (n.includes("postural")) return "postural";
  return null;
}

// Ícono de sede según el nombre REAL (siempre viene de la base) -- nunca se
// hardcodea un valor, solo se elige qué mostrar para un nombre que ya existe.
// Las 3 sedes conocidas usan el PNG real (mismo ancho/alto + object-contain
// para las tres, así quedan del mismo tamaño visual pase lo que pase con las
// proporciones internas de cada PNG); CalendarIcon queda como fallback SVG
// si en algún momento se agrega una sede con otro nombre.
export function SedeIcon({ nombre, className = "" }: { nombre: string; className?: string }) {
  const clave = claveSede(nombre);
  if (!clave) return <CalendarIcon className={className} />;

  return (
    <Image
      src={PNG_POR_SEDE[clave]}
      alt=""
      aria-hidden
      width={96}
      height={96}
      className={`object-contain ${className}`}
    />
  );
}

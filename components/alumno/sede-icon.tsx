import type { ComponentType, SVGProps } from "react";
import { DumbbellIcon, PilatesMatIcon, PosturalIcon, CalendarIcon } from "@/components/ui/icons";

// Ícono según el nombre REAL de la sede (siempre viene de la base) -- nunca
// se hardcodea un valor, solo se elige qué dibujar para un nombre que ya
// existe. CalendarIcon es el fallback si en algún momento se agrega una
// sede con otro nombre.
export function iconoPorSede(nombre: string): ComponentType<SVGProps<SVGSVGElement>> {
  const n = nombre.toLowerCase();
  if (n.includes("fitness")) return DumbbellIcon;
  if (n.includes("pilates")) return PilatesMatIcon;
  if (n.includes("postural")) return PosturalIcon;
  return CalendarIcon;
}

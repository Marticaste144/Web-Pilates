import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/session";
import { AlumnoShell } from "@/components/alumno/alumno-shell";

export const dynamic = "force-dynamic";

export default async function AlumnoLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole("alumno");

  return <AlumnoShell profile={profile}>{children}</AlumnoShell>;
}

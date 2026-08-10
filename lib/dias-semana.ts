// Compartido entre admin, profesor y alumno. Sin dependencias de servidor a
// propósito: lo importan tanto Server Components como Client Components (ej.
// clase-form.tsx). Si esto viviera en un archivo que importa
// lib/supabase/server.ts (-> next/headers), cualquier Client Component que
// lo use rompe el build.
export const DIAS_SEMANA = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
];

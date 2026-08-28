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

// Fecha (YYYY-MM-DD) de la ocurrencia más reciente de diaSemana (hoy si hoy
// mismo es ese día). Se usa como default al abrir una clase SIN ?fecha= en
// la URL -- si en cambio se usara "hoy" a secas, entrar a una clase que dicta
// los jueves un viernes cualquiera muestra un roster que no corresponde a
// ninguna sesión real, y esa fecha por defecto ni siquiera es estable entre
// visitas (cambia todos los días), así que la asistencia recién tomada
// parece "no guardarse" al volver a entrar.
export function fechaUltimaOcurrencia(diaSemana: number): string {
  const hoyIso = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const hoy = new Date(`${hoyIso}T12:00:00Z`);
  const diaHoy = hoy.getUTCDay() === 0 ? 7 : hoy.getUTCDay();
  const diff = (diaHoy - diaSemana + 7) % 7;
  hoy.setUTCDate(hoy.getUTCDate() - diff);
  return hoy.toISOString().slice(0, 10);
}

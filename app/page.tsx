import { redirect } from "next/navigation";
import { getCurrentProfile, homePathForRole } from "@/lib/auth/session";
import { Isotipo } from "@/components/ui/isotipo";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Depende de la sesión (cookies): nunca debe quedar cacheada como estática.
export const dynamic = "force-dynamic";

// Nombres tal cual están cargados en la base (seed_sedes_aranceles.sql) --
// se hardcodean acá en vez de consultar la tabla "sedes" porque esta
// pantalla es pública (sin sesión) y la RLS de "sedes" solo deja ver a
// usuarios autenticados; para 3 nombres fijos que casi nunca cambian, no
// vale la pena abrir una policy nueva solo para esta landing.
const SEDES = [
  { nombre: "MUV FITNESS", desc: "Entrenamiento funcional y acondicionamiento físico." },
  { nombre: "MUV PILATES", desc: "Pilates en aparatos y colchoneta." },
  { nombre: "MUV POSTURAL", desc: "Gimnasia postural y corrección de postura." },
];

export default async function Home() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(homePathForRole(profile.role));
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-neutral-50 px-6 py-12 text-center">
      <Isotipo className="h-16 w-16" />
      <div className="mt-4 max-w-md">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">MUV Gimnasia Postural</h1>
        <p className="mt-2 text-neutral-500">
          Reservá tus clases, seguí el estado de tu cuota y enterate de los avisos de tu sede, todo desde un mismo
          lugar.
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <LinkButton href="/login" variant="primary" className="px-6">
          Iniciar sesión
        </LinkButton>
        <LinkButton href="/signup" variant="secondary" className="px-6">
          Crear cuenta nueva
        </LinkButton>
      </div>

      <div className="mt-12 w-full max-w-md text-left">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Nuestras sedes
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          {SEDES.map((sede) => (
            <Card key={sede.nombre} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary-500" />
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900">{sede.nombre}</p>
                <p className="text-sm text-neutral-500">{sede.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

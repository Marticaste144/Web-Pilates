import { Isotipo } from "@/components/ui/isotipo";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-neutral-50 p-8 text-center">
      <Isotipo className="h-14 w-14 opacity-70" />
      <div>
        <h1 className="text-xl font-bold text-neutral-900">No encontramos esta página</h1>
        <p className="mt-1 text-neutral-500">Puede que el link esté vencido o mal escrito.</p>
      </div>
      <LinkButton href="/" className="px-6">
        Volver al inicio
      </LinkButton>
    </main>
  );
}

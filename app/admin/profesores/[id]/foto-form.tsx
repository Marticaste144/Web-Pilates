"use client";

import { useActionState, useState } from "react";
import { subirFotoProfesor } from "@/lib/admin/profesores-actions";
import { initialFormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { UserIcon } from "@/components/ui/icons";

// key={inputKey} fuerza a remontar el <input type="file"> tras un guardado
// exitoso -- mismo patrón que SubirComprobanteForm/RutinaForm.
export function FotoProfesorForm({ profileId, fotoUrl }: { profileId: string; fotoUrl: string | null }) {
  const [state, formAction, pending] = useActionState(subirFotoProfesor, initialFormState);
  const [inputKey, setInputKey] = useState(0);
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state.status === "success") setInputKey((k) => k + 1);
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="profile_id" value={profileId} />

      <div className="flex items-center gap-4">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 text-primary-300 shadow-sm ring-1 ring-black/5">
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL de Storage externa/dinámica, no un asset local de /public.
            <img src={fotoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="h-8 w-8" />
          )}
        </span>
        <input
          key={inputKey}
          type="file"
          name="foto"
          accept="image/jpeg,image/png,image/webp"
          className="max-w-[220px] text-xs text-neutral-600 file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
        />
      </div>

      <FormAlert state={state} />

      <Button type="submit" size="sm" variant="secondary" loading={pending} className="self-start">
        Subir foto
      </Button>
    </form>
  );
}

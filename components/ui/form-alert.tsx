import type { FormState } from "@/lib/form-state";
import { Alert } from "./alert";

// Renderiza el resultado de un FormState (útil con useActionState) como
// Alert -- reemplaza el <p className="text-error-600"> suelto que se repetía
// en cada formulario.
export function FormAlert({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;
  return <Alert variant={state.status === "error" ? "error" : "success"}>{state.message}</Alert>;
}

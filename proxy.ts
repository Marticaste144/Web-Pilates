import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Corre en todas las rutas excepto assets estáticos y de imagen,
     * para no gastar tiempo refrescando sesión en archivos que no la usan.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

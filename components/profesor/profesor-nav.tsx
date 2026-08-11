import Link from "next/link";

export function ProfesorNav() {
  return (
    <nav className="flex gap-4 border-b border-slate-200 px-4 py-2 text-sm">
      <Link href="/profesor" className="text-slate-600 hover:text-[#2f7cd6]">
        Inicio
      </Link>
      <Link href="/profesor/clases" className="text-slate-600 hover:text-[#2f7cd6]">
        Mis clases
      </Link>
    </nav>
  );
}

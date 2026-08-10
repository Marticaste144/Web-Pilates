import Link from "next/link";

const LINKS = [
  { href: "/alumno", label: "Inicio" },
  { href: "/alumno/clases", label: "Clases" },
  { href: "/alumno/inscripciones", label: "Mis inscripciones" },
  { href: "/alumno/cuota", label: "Mi cuota" },
];

export function AlumnoNav() {
  return (
    <nav className="flex gap-4 border-b border-slate-200 px-4 py-2 text-sm">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="text-slate-600 hover:text-[#2f7cd6]">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

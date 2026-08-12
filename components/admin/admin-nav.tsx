import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/profesores", label: "Profesores" },
  { href: "/admin/clases", label: "Clases" },
  { href: "/admin/aranceles", label: "Aranceles" },
  { href: "/admin/avisos", label: "Avisos" },
];

export function AdminNav() {
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

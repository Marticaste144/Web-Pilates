import Image from "next/image";

// Isotipo oficial de MUV (public/laura-pagola-isotipo@2000px.png, 2000x2000,
// fondo transparente). "fill" + un wrapper con position:relative deja que
// el tamaño lo siga controlando el className de cada lugar que lo usa
// (header, hero de login/signup, etc.) sin tener que pasar width/height a
// cada instancia.
export function Isotipo({ className }: { className?: string }) {
  return (
    <span className={`relative inline-block shrink-0 ${className ?? ""}`}>
      <Image
        src="/laura-pagola-isotipo@2000px.png"
        alt="MUV Gimnasia Postural"
        fill
        sizes="96px"
        className="object-contain"
      />
    </span>
  );
}

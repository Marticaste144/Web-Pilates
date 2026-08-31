import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentProfile, homePathForRole } from "@/lib/auth/session";
import { Isotipo } from "@/components/ui/isotipo";
import { Reveal } from "@/components/landing/reveal";
import { ProfesoresSection } from "@/components/landing/profesores-section";
import { GaleriaSection } from "@/components/landing/galeria-section";
import {
  MapPinIcon,
  UserIcon,
  GraduationCapIcon,
  HeartIcon,
  CalendarIcon,
  TrendingUpIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";

// Depende de la sesión (cookies): nunca debe quedar cacheada como estática.
export const dynamic = "force-dynamic";

// Nombres y direcciones tal cual están cargados en la base
// (seed_sedes_aranceles.sql) -- se hardcodean acá en vez de consultar la
// tabla "sedes" porque esta pantalla es pública (sin sesión) y la RLS de
// "sedes" solo deja ver a usuarios autenticados; para 3 sedes fijas que casi
// nunca cambian, no vale la pena abrir una policy nueva solo para esta
// landing.
const SERVICIOS = [
  {
    nombre: "MUV FITNESS",
    desc: "Entrenamiento funcional que te da energía y te hace más fuerte.",
    iconSrc: "/fitness.png",
  },
  {
    nombre: "MUV PILATES",
    desc: "Pilates para mejorar tu movilidad, tu postura y tu bienestar.",
    iconSrc: "/pilates.png",
  },
  {
    nombre: "MUV POSTURAL",
    desc: "Gimnasia postural para aliviar tensiones, mejorar tu postura y sentirte mejor.",
    iconSrc: "/postural.png",
  },
];

const SEDES = [
  { nombre: "MUV FITNESS", direccion: "Calle 59 e/ 6 y 7" },
  { nombre: "MUV PILATES", direccion: "Calle 56 e/ 6 y 7" },
  { nombre: "MUV POSTURAL", direccion: "Calle 55 e/ 1 y 2" },
];

const BENEFICIOS = [
  { label: "Clases semi personalizadas", icon: UserIcon },
  { label: "A cargo de Prof. en Educación Física (UNLP)", icon: GraduationCapIcon },
  { label: "Ambiente cálido y cercano", icon: HeartIcon },
  { label: "Horarios flexibles", icon: CalendarIcon },
  { label: "Resultados que se sienten", icon: TrendingUpIcon },
];

const INSTAGRAM_URL = "https://www.instagram.com/muv.gimnasiapostural/";
const FACEBOOK_URL = "https://www.facebook.com/people/Gimnasia-Postural-Laura-Pagola/100078990012024/";
const WHATSAPP_URL = "https://wa.me/message/NJEJR74VRRH2M1";

export default async function Home() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(homePathForRole(profile.role));
  }

  return (
    <main className="flex flex-1 flex-col">
      {/* ==================== HEADER ==================== */}
      <header className="sticky top-0 z-30 border-b border-neutral-100 bg-white/95 shadow-[0_1px_16px_-6px_rgba(17,24,39,0.1)] backdrop-blur-md transition-shadow">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a href="#inicio" className="flex shrink-0 items-center gap-2 transition-transform duration-300 hover:scale-[1.02]">
            <Isotipo className="h-9 w-9" />
            <span className="leading-tight">
              <span className="block text-lg font-extrabold tracking-tight text-neutral-900">MUV</span>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                Gimnasia Postural
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-medium text-neutral-600 sm:flex">
            <a
              href="#inicio"
              className="relative pb-1 text-neutral-900 after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-secondary-500"
            >
              Inicio
            </a>
            <a
              href="#servicios"
              className="relative pb-1 transition-colors duration-300 after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-secondary-500 after:transition-all after:duration-300 hover:text-neutral-900 hover:after:w-full"
            >
              Clases
            </a>
            <a
              href="#contacto"
              className="relative pb-1 transition-colors duration-300 after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-secondary-500 after:transition-all after:duration-300 hover:text-neutral-900 hover:after:w-full"
            >
              Contacto
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-4">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-neutral-600 transition-colors duration-300 hover:text-neutral-900 sm:inline"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-full bg-secondary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary-600 hover:shadow-md active:translate-y-0"
            >
              Quiero empezar
            </Link>
          </div>
        </div>
      </header>

      {/* ==================== HERO ==================== */}
      <section id="inicio" className="relative isolate overflow-hidden bg-neutral-900">
        <Image
          src="/img4.png"
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className="object-cover motion-safe:animate-hero-zoom"
        />
        {/* Degradé oscuro de izquierda a derecha: a la izquierda el texto blanco
            queda legible sobre negro sólido; a la derecha se desvanece para
            dejar ver la foto. En mobile se refuerza con un segundo velo de
            arriba a abajo, porque ahí la foto ocupa todo el ancho detrás del
            texto en vez de quedar recortada a la derecha. */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 via-neutral-900/85 to-neutral-900/30 sm:via-neutral-900/75 sm:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/40 via-transparent to-neutral-900/50 sm:hidden" />

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 sm:px-8 sm:py-24 lg:py-28">
          <Reveal className="max-w-lg" stagger={130}>
            <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Move tu cuerpo, transformá tu día, sentí <span className="text-secondary-400">MUV</span>.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-white/85 sm:text-lg">
              Clases semi personalizadas de Fitness, Pilates y Gimnasia Postural a cargo de Prof. en Educación Física
              (UNLP) para que te muevas, te fortalezcas y te sientas mejor cada día.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center rounded-full bg-secondary-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary-600 hover:shadow-lg active:translate-y-0"
              >
                Quiero empezar
              </Link>
              <a
                href="#servicios"
                className="inline-flex items-center rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-white hover:bg-white/10 active:translate-y-0"
              >
                Conocé más
              </a>
            </div>
          </Reveal>
        </div>

        <a
          href="#stats"
          aria-label="Ver más"
          className="absolute bottom-6 left-1/2 z-10 hidden h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25 sm:flex"
        >
          <ChevronDownIcon className="h-5 w-5" />
        </a>

        {/* Onda de transición hacia la franja de estadísticas. */}
        <svg
          aria-hidden
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          className="absolute -bottom-px left-0 z-10 h-14 w-full text-primary-700 sm:h-20"
        >
          <path
            fill="currentColor"
            d="M0,32 C240,90 480,0 720,24 C960,48 1200,90 1440,40 L1440,90 L0,90 Z"
          />
        </svg>
      </section>

      {/* ==================== ESTADÍSTICAS ==================== */}
      <section id="stats" className="bg-gradient-to-r from-primary-700 to-secondary-600 py-10">
        <Reveal
          className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 text-center sm:px-8 lg:grid-cols-4"
          stagger={100}
        >
          {[
            { valor: "+500", label: "alumnos que confían en MUV" },
            { valor: "12", label: "profesores especializados" },
            { valor: "3", label: "sedes en La Plata" },
            { valor: "+20", label: "clases por semana para vos" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-extrabold text-white sm:text-4xl">{stat.valor}</p>
              <p className="mt-1 text-sm text-white/85">{stat.label}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ==================== SERVICIOS ==================== */}
      <section id="servicios" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal className="text-center">
            <h2 className="text-2xl font-extrabold text-neutral-900 sm:text-3xl">
              Elegí cómo querés <span className="text-secondary-500">sentirte</span>
            </h2>
          </Reveal>

          <Reveal className="mt-10 grid gap-6 sm:grid-cols-3" stagger={120}>
            {SERVICIOS.map((s) => (
              <div
                key={s.nombre}
                className="group h-full rounded-2xl bg-neutral-50 p-8 text-center transition-all duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-xl hover:shadow-primary-900/5"
              >
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110">
                  <Image src={s.iconSrc} alt="" aria-hidden width={64} height={64} className="h-8 w-8 object-contain" />
                </span>
                <h3 className="mt-5 font-bold text-neutral-900">{s.nombre}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{s.desc}</p>
              </div>
            ))}
          </Reveal>

          <Reveal
            className="mt-14 grid grid-cols-2 gap-x-4 gap-y-8 text-center sm:grid-cols-5"
            stagger={70}
          >
            {BENEFICIOS.map((b) => (
              <div key={b.label} className="group flex flex-col items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary-200 text-primary-600 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-secondary-400 group-hover:text-secondary-600 group-hover:shadow-md">
                  <b.icon className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-neutral-700">{b.label}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ==================== GALERÍA ==================== */}
      <GaleriaSection />

      {/* ==================== PROFESORES ==================== */}
      <ProfesoresSection />

      {/* ==================== FOOTER ==================== */}
      <footer id="contacto" className="bg-gradient-to-r from-primary-900 to-secondary-900 py-10">
        <Reveal
          className="mx-auto flex max-w-6xl flex-col gap-8 px-5 sm:px-8 lg:flex-row lg:items-start lg:justify-between"
          stagger={100}
        >
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">Nuestras sedes</h3>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-10">
              {SEDES.map((sede) => (
                <div key={sede.nombre} className="group flex items-start gap-2">
                  <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-secondary-400 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-white">{sede.nombre}</p>
                    <p className="text-sm text-white/70 transition-colors duration-300 group-hover:text-white">
                      {sede.direccion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-12 sm:gap-16">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">Seguinos</h3>
              <div className="mt-4 flex items-center gap-3">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Instagram de MUV"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:bg-white/20 hover:shadow-md"
                >
                  <Image
                    src="/instagram.png"
                    alt=""
                    aria-hidden
                    width={40}
                    height={40}
                    className="h-4 w-4 object-contain brightness-0 invert"
                  />
                </a>
                <a
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Facebook de MUV"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:bg-white/20 hover:shadow-md"
                >
                  <Image
                    src="/facebook.png"
                    alt=""
                    aria-hidden
                    width={40}
                    height={40}
                    className="h-4 w-4 object-contain brightness-0 invert"
                  />
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">Escribinos</h3>
              <div className="mt-4 flex items-center gap-3">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="WhatsApp de MUV"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:bg-white/20 hover:shadow-md"
                >
                  {/* whatsapp.png trae ~7% de margen transparente propio (a
                      diferencia de instagram/facebook, que llegan al borde) --
                      se compensa con un scale leve para que las tres se vean
                      del mismo tamaño dentro del círculo. */}
                  <Image
                    src="/whatsapp.png"
                    alt=""
                    aria-hidden
                    width={40}
                    height={40}
                    className="h-4 w-4 scale-[1.07] object-contain brightness-0 invert"
                  />
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </footer>
    </main>
  );
}

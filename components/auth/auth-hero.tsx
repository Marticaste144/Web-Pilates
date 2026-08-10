function HeroWaveMobile() {
  return (
    <svg
      viewBox="0 0 400 440"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full md:hidden"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="muv-teal-base-m" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4fd0b8" />
          <stop offset="100%" stopColor="#1f9d86" />
        </linearGradient>
        <linearGradient id="muv-blue-blob-m" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3d8ce0" />
          <stop offset="100%" stopColor="#2bbfa6" />
        </linearGradient>
      </defs>
      <rect width="400" height="440" fill="url(#muv-teal-base-m)" />
      <path
        d="M0,0 H400 V150 C 280,260 150,80 0,190 Z"
        fill="url(#muv-blue-blob-m)"
      />
      <path
        d="M400,150 C 280,260 150,80 0,190"
        fill="none"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path d="M0,440 L0,250 C 60,330 140,400 210,440 Z" fill="#15806c" />
    </svg>
  );
}

function HeroWaveDesktop() {
  return (
    <svg
      viewBox="0 0 900 620"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 hidden h-full w-full md:block"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="muv-teal-base-d" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4fd0b8" />
          <stop offset="100%" stopColor="#1f9d86" />
        </linearGradient>
        <linearGradient id="muv-blue-blob-d" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3d8ce0" />
          <stop offset="100%" stopColor="#2bbfa6" />
        </linearGradient>
      </defs>
      <rect width="900" height="620" fill="url(#muv-teal-base-d)" />
      <path
        d="M0,0 H900 V260 C 650,420 380,140 0,340 Z"
        fill="url(#muv-blue-blob-d)"
      />
      <path
        d="M900,260 C 650,420 380,140 0,340"
        fill="none"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path d="M0,620 L0,420 C 90,520 200,590 300,620 Z" fill="#15806c" />
    </svg>
  );
}

export function AuthHero({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative h-[38vh] min-h-[240px] shrink-0 overflow-hidden md:h-auto md:w-[56%] md:min-h-0">
      <HeroWaveMobile />
      <HeroWaveDesktop />

      <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-10">
        <div className="flex items-start justify-between">
          <span className="hidden text-sm font-bold uppercase tracking-widest text-white md:block">
            MUV Gimnasia Postural
          </span>
          <span
            aria-hidden="true"
            className="h-9 w-9 rounded-full bg-white shadow-md md:h-12 md:w-12"
          />
        </div>

        <div className="hidden md:block">
          <h2 className="text-3xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-white/80">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

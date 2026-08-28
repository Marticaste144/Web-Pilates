import type { SVGProps } from "react";

// Set chico de íconos de línea, estilo consistente (stroke redondeado), para
// el nav y algunos empty states. No se suma una librería de íconos externa
// solo para esto.
function base(props: SVGProps<SVGSVGElement>) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  );
}

export function ListIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M15.5 6.5A3 3 0 0 1 17 12.2" />
      <path d="M15 20a5 5 0 0 0-1.2-3.9" />
    </svg>
  );
}

export function TagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12.5 3.5H19a1.5 1.5 0 0 1 1.5 1.5v6.5a2 2 0 0 1-.6 1.4l-8 8a2 2 0 0 1-2.8 0l-6.5-6.5a2 2 0 0 1 0-2.8l8-8a2 2 0 0 1 1.4-.6Z" />
      <circle cx="16" cy="8" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MegaphoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M3 10v4a1 1 0 0 0 1 1h2l1.2 5H9l-.8-5H10l9 4V6l-9 4H4a1 1 0 0 0-1 1Z" />
    </svg>
  );
}

export function LogOutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M15 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h9" />
      <path d="M20 12H9M20 12l-3.5-3.5M20 12l-3.5 3.5" />
    </svg>
  );
}

export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M9 5.5 15.5 12 9 18.5" />
    </svg>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M5.5 9 12 15.5 18.5 9" />
    </svg>
  );
}

export function PieChartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 12V3.5A8.5 8.5 0 0 1 20.5 12H12Z" fill="currentColor" stroke="none" />
      <path d="M20.5 12A8.5 8.5 0 1 1 12 3.5" />
    </svg>
  );
}

export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.5 2" />
    </svg>
  );
}

export function FileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M7 3.5h6.5L18 8v11.3a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M13.5 3.5V8H18" />
      <path d="M8.7 12.2h6.6M8.7 15.2h6.6" />
    </svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M5 12.5 9.5 17 19 6.5" />
    </svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20 15.5 15.5" />
    </svg>
  );
}

export function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 4v11" />
      <path d="M7.5 11 12 15.5 16.5 11" />
      <path d="M4.5 18.5v1a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-1" />
    </svg>
  );
}

export function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.6A10.4 10.4 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15 15 0 0 1-3.1 3.9M6.6 6.7A15.2 15.2 0 0 0 2.5 12S6 18.5 12 18.5a9.7 9.7 0 0 0 3.9-.8" />
      <path d="M9.9 10.1a3 3 0 0 0 4.1 4" />
    </svg>
  );
}

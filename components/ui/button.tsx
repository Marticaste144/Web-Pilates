import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "destructive" | "ghost";
type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 " +
  "disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-primary-400 focus-visible:ring-offset-2";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:bg-primary-800",
  secondary:
    "border border-neutral-300 bg-white text-neutral-800 hover:border-primary-400 hover:text-primary-700 active:bg-primary-50",
  destructive: "bg-error-600 text-white shadow-sm hover:bg-error-700 active:bg-error-700",
  ghost: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className ?? "h-4 w-4"}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      disabled={disabled || loading}
      className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

// Mismo look que Button, pero renderiza un <Link> -- para navegación (nunca
// anidar un <button> dentro de un <a>, ni viceversa).
export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <Link className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`} {...rest}>
      {children}
    </Link>
  );
}
